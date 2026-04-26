import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useNavigationType } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { API_BASE_URL } from '../constants';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchUserProfile, followUserAsync, unfollowUserAsync, clearProfile, blockUserAsync, unblockUserAsync, muteUserAsync, unmuteUserAsync, setActiveProfileTab, profileMatchesIdentifier } from '../redux/slices/userSlice';
import { openEditProfile, openCreatePost, openReport, openAuthWall, openAddToList } from '../redux/slices/modalsSlice';
import { useTranslation } from 'react-i18next';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import Dropdown, { DropdownItem } from '../components/common/Dropdown';
import { FiArrowLeft, FiMoreHorizontal, FiEdit3, FiLink, FiSearch, FiBellOff, FiUserX, FiMail, FiImage, FiList, FiRss, FiAlertTriangle, FiLock } from 'react-icons/fi';
import { BsPatchCheckFill } from 'react-icons/bs';
import ListAvatar from '../components/common/ListAvatar';
import { showToast } from '../redux/slices/toastSlice';
import ConfirmModal from '../components/common/ConfirmModal';
import ProfileTabContent from '../components/profile/ProfileTabContent';
import { clearPosts } from '../redux/slices/postsSlice';
import { startConversation } from '../redux/slices/messagesSlice';
import ProfileSkeleton from '../components/profile/ProfileSkeleton';
import { RootState } from '../redux/store';
import LoadingIndicator from '../components/common/LoadingIndicator';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatHandleText } from '../utils/identity';
import { PROFILE_TABS, COVER_PLACEHOLDER } from '../constants';
import { cn } from '../utils/classNames';
import { formatCount } from '../utils/formatNumber';
import RichText from '../components/common/RichText';

import { ListDto } from '../types';

const INITIAL_PROFILE_POSTS_TAKE = 10;
const NEXT_PROFILE_POSTS_TAKE = 14;

const ProfilePage: React.FC = () => {
    const { handle } = useParams<{ handle: string }>();
    const navigate = useNavigate();
    const navType = useNavigationType();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const isAuthenticated = useAppSelector((state: RootState) => state.auth.isAuthenticated);
    const profileUser = useAppSelector((state: RootState) => state.user.profile);
    const isProfileLoading = useAppSelector((state: RootState) => state.user.isLoading);
    const profileError = useAppSelector((state: RootState) => state.user.error);
    const userLists = useAppSelector((state: RootState) => state.lists.userLists);
    const isListsLoading = useAppSelector((state: RootState) => state.lists.isLoading);
    const actionLoading = useAppSelector((state: RootState) => state.user.actionLoading);
    const activeProfileTab = useAppSelector((state: RootState) => state.user.activeProfileTab);
    const {
        lastUserPostsFetch,
        lastUserPostsUserId,
        lastUserPostsType,
        posts: reduxPosts,
        isLoading: isPostsLoading,
        hasMore,
        cursor: postCursor
    } = useAppSelector((state: RootState) => state.posts);

    const activeTab = activeProfileTab || 'posts';

    const sortedPosts = React.useMemo(() => {
        if (activeTab !== 'posts') return reduxPosts;
        const pinned = profileUser?.pinnedPost || reduxPosts.find(p => p.isPinned);
        if (!pinned) return reduxPosts;
        return [pinned, ...reduxPosts.filter(p => (p.uri || p.id) !== (pinned.uri || pinned.id))];
    }, [reduxPosts, activeTab, profileUser?.pinnedPost]);

    const userFeeds = useAppSelector((state: RootState) => state.feeds.userFeeds);
    const isUserFeedsLoading = useAppSelector((state: RootState) => state.feeds.userFeedsLoading);
    const observerTarget = React.useRef(null);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'mute' | 'unmute' | 'block' | 'unblock' | null;
    }>({ isOpen: false, type: null });
    const isFetchingRef = React.useRef(false);
    const [showWarn, setShowWarn] = useState(true);

    useEffect(() => {
        if (!handle) return;

        // Only clear and fetch if we are switching to a DIFFERENT profile.
        // This preserves scroll position and content when navigating back.
        const isSameProfile = profileMatchesIdentifier(profileUser, handle);

        if (!isSameProfile) {
            dispatch(clearProfile());
            dispatch(clearPosts());
            setShowWarn(true);
            dispatch(fetchUserProfile(handle));
        } else if (isProfileLoading === false && !profileUser) {
            // Safety fetch if we think we are on the same profile but have no data
            dispatch(fetchUserProfile(handle));
        }
    }, [dispatch, handle]); // Keep handle as the primary trigger

    useEffect(() => {
        if (handle && profileUser?.handle && handle !== profileUser.handle) {
            // If the URL handle is a DID and the profile has a real handle, redirect
            if (handle.startsWith('did:') && !profileUser.handle.startsWith('did:')) {
                navigate(`/profile/${profileUser.handle}`, { replace: true });
            }
        }
    }, [handle, profileUser?.handle, navigate]);

    const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set([activeTab]));

    useEffect(() => {
        if (activeTab && !visitedTabs.has(activeTab)) {
            setVisitedTabs(prev => new Set(prev).add(activeTab));
        }
    }, [activeTab, visitedTabs]);

    // Scroll Persistence Logic
    useEffect(() => {
        if (!profileUser?.id || navType !== 'POP') return;

        const scrollKey = `profile_scroll_${profileUser.id}_${activeTab}`;

        // Restoration
        const savedScroll = sessionStorage.getItem(scrollKey);
        if (savedScroll) {
            setTimeout(() => {
                window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'auto' });
            }, 30);
        }

        // Saving
        const handleScroll = () => {
            sessionStorage.setItem(scrollKey, window.scrollY.toString());
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [profileUser?.id, activeTab, navType]);

    const handleTabChange = (tabId: string) => {
        if (profileUser?.id) {
            sessionStorage.setItem(`profile_scroll_${profileUser.id}_${activeTab}`, window.scrollY.toString());
        }
        dispatch(setActiveProfileTab(tabId));
    };



    const isOwnProfile = currentUser?.did === profileUser?.did;

    // Use profileUser's cover image or placeholder
    const coverImage = profileUser?.coverImage || COVER_PLACEHOLDER;

    const ensureAuth = (callback: () => void) => {
        if (!currentUser) {
            dispatch(openAuthWall());
            return;
        }
        callback();
    };

    const handleFollowToggle = async () => {
        ensureAuth(async () => {
            if (!profileUser) return;
            try {
                const followActor = profileUser.did || profileUser.handle || profileUser.id;
                if (profileUser.isFollowing) {
                    if (!profileUser.followingReference) {
                        dispatch(showToast({ message: 'Missing follow reference', type: 'error' }));
                        return;
                    }
                    dispatch(unfollowUserAsync({
                        userId: followActor,
                        followUri: profileUser.followingReference
                    }));
                } else {
                    dispatch(followUserAsync(followActor));
                }
            } catch (error: any) {
                dispatch(showToast({ message: error || 'Failed to update follow status', type: 'error' }));
            }
        });
    };

    const handleBlockToggle = () => {
        if (!profileUser) return;
        setConfirmModal({
            isOpen: true,
            type: profileUser.isBlocking ? 'unblock' : 'block'
        });
    };

    const confirmBlockAction = async () => {
        if (!profileUser) return;
        try {
            if (profileUser.isBlocking) {
                if (!profileUser.blockingReference) {
                    dispatch(showToast({ message: 'Missing block reference', type: 'error' }));
                    return;
                }
                await dispatch(unblockUserAsync({
                    userId: profileUser.id,
                    blockUri: profileUser.blockingReference
                })).unwrap();
                dispatch(showToast({ message: t('profile.unblocked_success'), type: 'success' }));
            } else {
                await dispatch(blockUserAsync(profileUser.id)).unwrap();
                dispatch(showToast({ message: t('profile.blocked_success'), type: 'success' }));
            }
        } catch (error: any) {
            dispatch(showToast({ message: error || 'Failed to update block status', type: 'error' }));
        }
    };

    const handleMuteToggle = () => {
        if (!profileUser) return;
        setConfirmModal({
            isOpen: true,
            type: profileUser.isMuted ? 'unmute' : 'mute'
        });
    };

    const confirmMuteAction = async () => {
        if (!profileUser) return;
        try {
            if (profileUser.isMuted) {
                await dispatch(unmuteUserAsync(profileUser.id)).unwrap();
                dispatch(showToast({ message: t('profile.unmuted_success'), type: 'success' }));
            } else {
                await dispatch(muteUserAsync(profileUser.id)).unwrap();
                dispatch(showToast({ message: t('profile.muted_success'), type: 'success' }));
            }
        } catch (error: any) {
            dispatch(showToast({ message: error || 'Failed to update mute status', type: 'error' }));
        }
    };

    const handleMessageClick = async () => {
        ensureAuth(async () => {
            if (!profileUser) return;
            try {
                // For Bluesky (remote) users, we MUST use DID for the chat proxy to work.
                // For local users, we use their ID (GUID).
                const participantId = profileUser.did || profileUser.id;
                
                if (!participantId) {
                    dispatch(showToast({ message: 'User identifier not found', type: 'error' }));
                    return;
                }

                const conversation = await dispatch(startConversation([participantId])).unwrap();
                navigate(`/messages/${conversation.id}`);
            } catch (error: any) {
                dispatch(showToast({ message: error || 'Failed to start conversation', type: 'error' }));
            }
        });
    };

    const dropdownItems: DropdownItem[] = [
        {
            id: 'copy-link',
            label: t('profile.copy_link'),
            icon: <FiLink size={18} />,
            onClick: () => {
                navigator.clipboard.writeText(window.location.href);
                dispatch(showToast({ message: t('common.copied_to_clipboard'), type: 'success' }));
            }
        },
        {
            id: 'search-posts',
            label: t('profile.search_posts'),
            icon: <FiSearch size={18} />,
            onClick: () => {
                console.log('Search posts for @' + profileUser?.handle);
            },
            hasDivider: !isOwnProfile
        },
        ...(!isOwnProfile && isAuthenticated ? [
            {
                id: 'add-to-lists',
                label: t('profile.add_to_lists'),
                icon: <FiList size={18} />,
                onClick: () => {
                    if (profileUser) {
                        dispatch(openAddToList(profileUser));
                    }
                }
            },
            {
                id: 'mute-account',
                label: profileUser?.isMuted ? `${t('profile.unmute')} @${profileUser?.handle}` : `${t('profile.mute')} @${profileUser?.handle}`,
                icon: <FiBellOff size={18} />,
                onClick: handleMuteToggle
            },
            {
                id: 'block-account',
                label: profileUser?.isBlocking ? `${t('profile.unblock')} @${profileUser?.handle}` : `${t('profile.block')} @${profileUser?.handle}`,
                icon: <FiUserX size={18} />,
                onClick: handleBlockToggle,
                danger: !profileUser?.isBlocking
            },
            {
                id: 'report-account',
                label: t('profile.report_account', 'Report account'),
                icon: <FiAlertTriangle size={18} />,
                onClick: () => {
                    if (profileUser?.id) {
                        dispatch(openReport({ did: profileUser.id, type: 'account' }));
                    }
                },
                danger: true
            }
        ] : [])
    ];

    useDocumentTitle(profileUser?.displayName || profileUser?.handle || '');

    const isStale = profileUser && handle && !profileMatchesIdentifier(profileUser, handle);

    if ((isProfileLoading && !profileUser) || isStale) {
        return <ProfileSkeleton />;
    }

    // Private profile state (RequireLogoutVisibility is on and user is a guest)
    if (!currentUser && profileError === 'PROFILE_PRIVATE') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
                <div className="bg-gray-100 dark:bg-dark-surface p-6 rounded-full mb-6">
                    <FiLock size={48} className="text-gray-400 dark:text-gray-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">
                    {t('profile.private_account', 'This account is private')}
                </h2>
                <p className="text-gray-500 dark:text-dark-text-secondary mb-6 max-w-sm">
                    {t('profile.private_account_desc', 'Sign in to view this profile.')}
                </p>
                <Button onClick={() => dispatch(openAuthWall())}>
                    {t('auth.sign_in', 'Sign in')}
                </Button>
            </div>
        );
    }

    if (!profileUser && !isProfileLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
                <h2 className="text-2xl font-bold mb-2">{t('profile.user_not_found')}</h2>
                <p className="text-gray-500 mb-6">{t('profile.user_not_found_desc')}</p>
                <Button onClick={() => navigate('/')}>{t('common.go_home')}</Button>
            </div>
        );
    }

    if (profileUser?.muteInfo?.behavior === 'hide') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
                <div className="bg-gray-100 dark:bg-dark-surface p-6 rounded-full mb-6">
                    <FiAlertTriangle size={48} className="text-gray-400 dark:text-gray-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">
                    {t('profile.content_hidden', 'Content Hidden')}
                </h2>
                <p className="text-gray-500 dark:text-dark-text-secondary mb-6 max-w-sm">
                    {t('profile.content_hidden_desc', 'This profile is hidden based on your content moderation settings.')}
                </p>
                <Button onClick={() => navigate('/settings/moderation')}>
                    {t('settings.content_filters', 'Content Settings')}
                </Button>
            </div>
        );
    }

    if (profileUser?.muteInfo?.behavior === 'warn' && showWarn) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
                <div className="bg-gray-100 dark:bg-dark-surface p-6 rounded-full mb-6">
                    <FiAlertTriangle size={48} className="text-gray-400 dark:text-gray-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">
                    {t('profile.content_warning', 'Content Warning')}
                </h2>
                <p className="text-gray-500 dark:text-dark-text-secondary mb-6 max-w-sm">
                    {t('profile.content_warning_desc', 'This profile has been flagged as containing sensitive content.')}
                </p>
                <div className="flex justify-center gap-4">
                    <Button onClick={() => navigate(-1)} variant="secondary">
                        {t('common.go_back', 'Go Back')}
                    </Button>
                    <Button onClick={() => setShowWarn(false)} variant="primary">
                        {t('common.show_anyway', 'Show Anyway')}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col bg-white dark:bg-dark-bg">
                {/* Header/Cover Section */}
                <div className="relative w-full">
                    {/* Cover Image */}
                    <div className="h-40 lg:h-48 w-full bg-blue-100 dark:bg-dark-surface overflow-hidden">
                        {coverImage && (
                            <img
                                src={coverImage}
                                alt="Cover"
                                className="w-full h-full object-cover"
                            />
                        )}
                    </div>

                    <div className="absolute top-3 left-3 z-20">
                        <button
                            onClick={() => navigate(-1)}
                            className="bg-black/50 hover:bg-black/60 text-white p-2 rounded-full transition-colors flex items-center justify-center"
                        >
                            <FiArrowLeft size={20} />
                        </button>
                    </div>


                    {/* Avatar Overlap */}
                    <div className="absolute -bottom-12 lg:-bottom-16 left-4 lg:left-6 z-20">
                        <Avatar
                            src={profileUser?.avatarUrl || profileUser?.avatar}
                            alt={profileUser?.displayName || 'User'}
                            size="2xl"
                            className="border-[4px] lg:border-[6px] border-white dark:border-dark-bg cursor-pointer shadow-sm"
                        />
                    </div>
                </div>

                {/* Muted by List Indicator */}
                {profileUser?.mutedBy && (
                    <div className="bg-gray-50 dark:bg-dark-surface/30 px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-dark-border/50">
                        <div className="flex items-center gap-3 text-[14px]">
                            <FiBellOff size={18} className="text-gray-500 dark:text-dark-text-secondary" />
                            <span className="text-gray-600 dark:text-dark-text-secondary">
                                {t('profile.muted_by_list')} <span className="font-bold text-gray-900 dark:text-dark-text cursor-pointer hover:underline" onClick={() => navigate(`/lists/${profileUser.mutedBy!.id}`)}>{profileUser.mutedBy.name}</span>
                            </span>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full h-8 text-[13px] px-3 font-bold bg-gray-200 dark:bg-dark-surface hover:bg-gray-300 dark:hover:bg-dark-surface/80"
                            onClick={() => navigate(`/lists/${profileUser.mutedBy!.id}`)}
                        >
                            {t('profile.view_list')}
                        </Button>
                    </div>
                )}

                {/* Profile Info & Actions Section */}
                <div className="flex flex-col px-4 lg:px-6 pt-2 pb-1">
                    {/* Actions Row (Right Aligned) */}
                    <div className="flex justify-end gap-2 mb-1 items-center">
                        {isOwnProfile ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => dispatch(openEditProfile())}
                                className="rounded-full border-none text-[15px] font-bold bg-gray-200 dark:bg-dark-surface px-5 py-2 hover:bg-gray-300 dark:hover:bg-dark-surface/80 text-gray-900 dark:text-dark-text transition-colors"
                            >
                                {t('profile.edit_profile_title')}
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                {!profileUser?.isBlockedBy && (
                                    <>
                                        <button
                                            onClick={handleMessageClick}
                                            className="bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-full p-2.5 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors flex items-center justify-center"
                                            title={t('messages.title')}
                                        >
                                            <FiMail size={20} className="text-gray-900 dark:text-dark-text" />
                                        </button>
                                        <Button
                                            variant={profileUser?.isFollowing ? 'outline' : 'primary'}
                                            size="sm"
                                            onClick={handleFollowToggle}
                                            disabled={profileUser ? (!!actionLoading[profileUser.did || profileUser.handle || profileUser.id] || !!actionLoading[profileUser.id]) : false}
                                            className={cn(
                                                "rounded-full text-[15px] font-bold px-5 py-2 min-w-[100px]",
                                                profileUser && (!!actionLoading[profileUser.did || profileUser.handle || profileUser.id] || !!actionLoading[profileUser.id]) && "opacity-80 animate-pulse"
                                            )}
                                        >
                                            {profileUser?.isFollowing
                                                ? t('profile.following_btn')
                                                : profileUser?.isFollowedBy
                                                    ? t('profile.follow_back', 'Follow back')
                                                    : t('profile.follow')}
                                        </Button>
                                    </>
                                )}
                            </div>
                        )
                        }
                        <Dropdown
                            trigger={
                                <button className="bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-full p-2.5 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors flex items-center justify-center">
                                    <FiMoreHorizontal size={20} className="text-gray-900 dark:text-dark-text" />
                                </button>
                            }
                            items={dropdownItems}
                            align="right"
                        />
                    </div>

                    {/* Identity Section */}
                    <div className="mt-4 lg:mt-6 mb-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <h1
                                className="min-w-0 max-w-full truncate text-[24px] lg:text-[28px] font-black text-gray-900 dark:text-dark-text tracking-tight leading-tight"
                                title={profileUser?.displayName || profileUser?.handle || ''}
                            >
                                {profileUser?.displayName || profileUser?.handle}
                            </h1>
                            {profileUser?.isVerified && (
                                <BsPatchCheckFill className="text-blue-500 flex-shrink-0" size={20} />
                            )}
                        </div>
                        <p
                            className="mt-0.5 max-w-full truncate text-[15px] text-gray-500 dark:text-dark-text-secondary"
                            title={profileUser?.handle || ''}
                        >
                            {formatHandleText(profileUser?.handle)}
                        </p>
                    </div>

                    {!profileUser?.isBlockedBy && (
                        <>
                            {/* Stats Section (One-line compact) */}
                            <div className="flex items-center gap-3 mb-3 mt-1 text-[15px]">
                                <div className="flex items-center gap-1 cursor-pointer hover:underline" onClick={() => navigate(`/profile/${profileUser?.handle}/followers`)}>
                                    <span className="font-bold text-black dark:text-dark-text">{formatCount(profileUser?.followersCount || 0)}</span>
                                    <p className="text-gray-500 dark:text-dark-text-secondary">{t('profile.followers')}</p>
                                </div>
                                <div className="flex items-center gap-1 cursor-pointer hover:underline" onClick={() => navigate(`/profile/${profileUser?.handle}/following`)}>
                                    <span className="font-bold text-black dark:text-dark-text">{formatCount(profileUser?.followingCount || 0)}</span>
                                    <p className="text-gray-500 dark:text-dark-text-secondary">{t('profile.following')}</p>
                                </div>
                                <div className="flex items-center gap-1 cursor-pointer">
                                    <span className="font-bold text-black dark:text-dark-text">{formatCount(profileUser?.postsCount || 0)}</span>
                                    <p className="text-gray-500 dark:text-dark-text-secondary">{t('profile.posts_stat')}</p>
                                </div>
                            </div>

                            {/* Bio Section */}
                            {profileUser?.bio && (
                                <div className="mb-3 text-gray-900 dark:text-dark-text text-[15px] leading-normal">
                                    <RichText content={profileUser.bio} className="whitespace-pre-wrap break-words" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Blocked States */}
            {profileUser?.isBlockedBy ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white dark:bg-dark-bg min-h-[40vh]">
                    <div className="bg-gray-100 dark:bg-dark-surface p-6 rounded-full mb-6">
                        <FiUserX size={48} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">
                        {profileUser && t('profile.blocked_by', { handle: profileUser.handle })}
                    </h2>
                    <p className="text-gray-500 dark:text-dark-text-secondary max-w-sm">
                        {t('profile.blocked_by_desc')}
                    </p>
                </div>
            ) : profileUser?.isBlocking ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white dark:bg-dark-bg min-h-[40vh]">
                    <div className="bg-gray-100 dark:bg-dark-surface p-6 rounded-full mb-6">
                        <FiUserX size={48} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">
                        {t('profile.is_blocking_title')}
                    </h2>
                    <p className="text-gray-500 dark:text-dark-text-secondary mb-8 max-w-sm">
                        {t('profile.is_blocking_desc')}
                    </p>
                    <Button
                        variant="danger"
                        onClick={handleBlockToggle}
                        className="rounded-full px-8"
                    >
                        {t('profile.unblock')}
                    </Button>
                </div>
            ) : (
                <>
                    {/* Tabs Selection Section */}
                    <div className="border-b border-gray-100 dark:border-dark-border w-full sticky top-0 bg-white dark:bg-dark-bg z-30">
                        <div className="flex overflow-x-auto no-scrollbar scroll-smooth">
                            <div className="flex w-full px-2">
                                {PROFILE_TABS.map((tab: { id: string; label: string }) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabChange(tab.id)}
                                        className={cn(
                                            'px-3 py-3 text-[14px] font-bold transition-all whitespace-nowrap relative flex-shrink-0',
                                            activeTab === tab.id
                                                ? 'text-gray-900 dark:text-dark-text'
                                                : 'text-gray-500 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-surface/50'
                                        )}
                                    >
                                        {t(`nav.${tab.id}`)}
                                        {activeTab === tab.id && (
                                            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-primary-500" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 bg-white dark:bg-dark-bg min-h-screen">
                        {PROFILE_TABS.map((tab: any) => {
                            if (!visitedTabs.has(tab.id)) return null;
                            return (
                                <div 
                                    key={tab.id} 
                                    hidden={activeTab !== tab.id}
                                    style={{ display: activeTab === tab.id ? 'block' : 'none' }}
                                >
                                    <ProfileTabContent 
                                        userId={profileUser!.handle || profileUser!.did || profileUser!.id}
                                        type={tab.id}
                                        isOwnProfile={isOwnProfile}
                                        isActive={activeTab === tab.id}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </>
            )}


            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={() => {
                    if (confirmModal.type === 'block' || confirmModal.type === 'unblock') {
                        confirmBlockAction();
                    } else if (confirmModal.type === 'mute' || confirmModal.type === 'unmute') {
                        confirmMuteAction();
                    }
                }}
                title={t(`profile.${confirmModal.type}`)}
                message={t(`moderation.${confirmModal.type}_confirm`, { name: profileUser?.displayName || profileUser?.handle || '' })}
                confirmLabel={t(`profile.${confirmModal.type}`)}
                variant={confirmModal.type === 'block' || confirmModal.type === 'mute' ? 'danger' : 'primary'}
            />
        </>
    );
};

export default ProfilePage;
