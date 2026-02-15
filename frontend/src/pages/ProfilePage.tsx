import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { API_BASE_URL } from '../constants';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchUserProfile, followUserAsync, clearProfile, blockUserAsync, unblockUserAsync, muteUserAsync, unmuteUserAsync } from '../redux/slices/userSlice';
import { openEditProfile, openCreatePost } from '../redux/slices/modalsSlice';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import Dropdown, { DropdownItem } from '../components/common/Dropdown';
import { FiArrowLeft, FiMoreHorizontal, FiEdit3, FiLink, FiSearch, FiBellOff, FiUserX, FiMail, FiImage, FiList, FiRss } from 'react-icons/fi';
import ListAvatar from '../components/common/ListAvatar';
import { showToast } from '../redux/slices/toastSlice';
import ConfirmModal from '../components/common/ConfirmModal';
import { PROFILE_TABS, COVER_PLACEHOLDER } from '../constants';
import { cn } from '../utils/classNames';
import PostCard from '../components/feed/PostCard';
import MediaGrid from '../components/profile/MediaGrid';
import MediaPostViewerModal from '../modals/MediaPostViewerModal';
import { fetchUserPosts, clearPosts } from '../redux/slices/postsSlice';
import { fetchUserLists } from '../redux/slices/listsSlice';
import { startConversation } from '../redux/slices/messagesSlice';
import { RootState } from '../redux/store';

import { Post } from '../types';

const ProfilePage: React.FC = () => {
    const { handle } = useParams<{ handle: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const profileUser = useAppSelector((state: RootState) => state.user.profile);
    const isProfileLoading = useAppSelector((state: RootState) => state.user.isLoading);
    const reduxPosts = useAppSelector((state: RootState) => state.posts.posts);
    const isPostsLoading = useAppSelector((state: RootState) => state.posts.isLoading);
    const hasMore = useAppSelector((state: RootState) => state.posts.hasMore);
    const userLists = useAppSelector((state: RootState) => state.lists.userLists);
    const isListsLoading = useAppSelector((state: RootState) => state.lists.isLoading);
    const actionLoading = useAppSelector((state: RootState) => state.user.actionLoading);
    const [activeTab, setActiveTab] = useState('posts');
    const observerTarget = React.useRef(null);
    const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'mute' | 'unmute' | 'block' | 'unblock' | null;
    }>({ isOpen: false, type: null });

    useEffect(() => {
        if (handle) {
            dispatch(fetchUserProfile(handle));
        }
        return () => {
            dispatch(clearProfile());
        };
    }, [dispatch, handle]);

    useEffect(() => {
        if (profileUser?.id) {
            if (activeTab === 'lists') {
                dispatch(fetchUserLists(profileUser.id));
            } else {
                dispatch(clearPosts());
                dispatch(fetchUserPosts({ userId: profileUser.id, type: activeTab, limit: 3, offset: 0 }));
            }
        }
    }, [dispatch, profileUser?.id, activeTab]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !isPostsLoading && profileUser?.id) {
                    dispatch(fetchUserPosts({
                        userId: profileUser.id,
                        type: activeTab,
                        limit: 3,
                        offset: reduxPosts.length
                    }));
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [dispatch, profileUser?.id, activeTab, hasMore, isPostsLoading, reduxPosts.length]);

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
    };



    const isOwnProfile = currentUser?.id === profileUser?.id;

    // Use profileUser's cover image or placeholder
    const coverImage = profileUser?.coverImage || COVER_PLACEHOLDER;

    const handleFollowToggle = async () => {
        if (!profileUser) return;
        try {
            await dispatch(followUserAsync(profileUser.id)).unwrap();
        } catch (error: any) {
            dispatch(showToast({ message: error || 'Failed to update follow status', type: 'error' }));
        }
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
                await dispatch(unblockUserAsync(profileUser.id)).unwrap();
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
        if (!profileUser) return;
        try {
            const conversation = await dispatch(startConversation([profileUser.id])).unwrap();
            navigate(`/messages/${conversation.id}`);
        } catch (error: any) {
            dispatch(showToast({ message: error || 'Failed to start conversation', type: 'error' }));
        }
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
        ...(!isOwnProfile ? [
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
            }
        ] : [])
    ];

    if (isProfileLoading && !profileUser) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                </div>
            </MainLayout>
        );
    }

    if (!profileUser && !isProfileLoading) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
                    <h2 className="text-2xl font-bold mb-2">{t('profile.user_not_found')}</h2>
                    <p className="text-gray-500 mb-6">{t('profile.user_not_found_desc')}</p>
                    <Button onClick={() => navigate('/')}>{t('common.go_home')}</Button>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout hideTopBar={true} title={profileUser?.displayName || profileUser?.handle}>
            <div className="flex flex-col bg-white dark:bg-dark-bg">
                {/* Header/Cover Section */}
                <div className="relative w-full">
                    {/* Cover Image */}
                    <div className="h-40 lg:h-48 w-full bg-blue-100 dark:bg-dark-surface overflow-hidden">
                        {coverImage && (
                            <img
                                src={(coverImage && coverImage.startsWith('/')) ? `${API_BASE_URL.replace('/api', '')}${coverImage}` : coverImage}
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
                                            disabled={profileUser ? !!actionLoading[profileUser.id] : false}
                                            className="rounded-full text-[15px] font-bold px-5 py-2 min-w-[100px]"
                                        >
                                            {profileUser?.isFollowing ? t('profile.following_btn') : t('profile.follow')}
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
                    <div className="mt-6 lg:mt-10 mb-1">
                        <h1 className="text-[28px] lg:text-[32px] font-black text-gray-900 dark:text-dark-text tracking-tight leading-tight">
                            {profileUser?.displayName || profileUser?.handle}
                        </h1>
                        <p className="text-[17px] text-gray-500 dark:text-dark-text-secondary">
                            @{profileUser?.handle}
                        </p>
                    </div>

                    {!profileUser?.isBlockedBy && (
                        <>
                            {/* Stats Section (One-line compact) */}
                            <div className="flex items-center gap-2 mb-3 mt-1.5 text-[15px]">
                                <div className="flex items-center gap-1 cursor-pointer hover:underline" onClick={() => navigate(`/profile/user/${profileUser?.id}/followers`)}>
                                    <span className="font-bold text-black dark:text-dark-text">{profileUser?.followersCount || 0}</span>
                                    <p className="text-gray-500 dark:text-dark-text-secondary">{t('profile.followers')}</p>
                                </div>
                                <div className="flex items-center gap-1 cursor-pointer hover:underline" onClick={() => navigate(`/profile/user/${profileUser?.id}/following`)}>
                                    <span className="font-bold text-black dark:text-dark-text">{profileUser?.followingCount || 0}</span>
                                    <p className="text-gray-500 dark:text-dark-text-secondary">{t('profile.following')}</p>
                                </div>
                                <div className="flex items-center gap-1 cursor-pointer">
                                    <span className="font-bold text-black dark:text-dark-text">{profileUser?.postsCount || 0}</span>
                                    <p className="text-gray-500 dark:text-dark-text-secondary">{t('profile.posts_stat')}</p>
                                </div>
                            </div>

                            {/* Bio Section */}
                            {profileUser?.bio && (
                                <div className="mb-4 text-gray-900 dark:text-dark-text whitespace-pre-wrap text-[16px] leading-normal">
                                    {profileUser?.bio}
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
                    <div className="flex-1 bg-white dark:bg-dark-bg">
                        {activeTab === 'feeds' ? (
                            // Feeds Tab - Blank for now
                            <div className="flex flex-col items-center justify-center pt-20 pb-12 px-6 text-center">
                                <FiRss size={80} className="text-gray-300 dark:text-dark-border" strokeWidth={1.2} />
                                <h3 className="text-[17px] font-medium text-gray-500 dark:text-dark-text-secondary mt-4">
                                    {t('profile.feeds_coming_soon')}
                                </h3>
                            </div>
                        ) : activeTab === 'lists' ? (
                            // Lists Tab - Show user's lists
                            isListsLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500"></div>
                                </div>
                            ) : userLists.length > 0 ? (
                                <div className="flex flex-col divide-y divide-gray-100 dark:divide-dark-border">
                                    {userLists.map(list => (
                                        <div
                                            key={list.id}
                                            className="p-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 cursor-pointer transition-colors"
                                            onClick={() => navigate(`/lists/${list.id}`)}
                                        >
                                            <div className="flex gap-4">
                                                <div className="shrink-0">
                                                    <ListAvatar src={list.avatarUrl} alt={list.name} size="lg" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-bold text-gray-900 dark:text-dark-text truncate">{list.name}</h4>
                                                        <span className="text-[13px] text-gray-500 dark:text-dark-text-secondary">
                                                            {t('lists.members_count', { count: list.membersCount || 0 })}
                                                        </span>
                                                    </div>
                                                    {list.description && (
                                                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-0.5 line-clamp-2">
                                                            {list.description}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Avatar
                                                            src={list.owner.avatarUrl || list.owner.avatar}
                                                            alt={list.owner.displayName}
                                                            size="xs"
                                                        />
                                                        <span className="text-[13px] text-gray-500 dark:text-dark-text-secondary">
                                                            {t('profile.feed_by')} <span className="font-medium text-gray-700 dark:text-dark-text">@{list.owner.handle}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center pt-20 pb-12 px-6 text-center">
                                    <FiList size={80} className="text-gray-300 dark:text-dark-border" strokeWidth={1.2} />
                                    <h3 className="text-[17px] font-medium text-gray-500 dark:text-dark-text-secondary mt-4">
                                        {t('profile.no_lists')}
                                    </h3>
                                </div>
                            )
                        ) : activeTab === 'media' ? (
                            // Media Tab - Grid View
                            isPostsLoading && reduxPosts.length === 0 ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500"></div>
                                </div>
                            ) : reduxPosts.length > 0 ? (
                                <>
                                    <MediaGrid
                                        posts={reduxPosts}
                                        onMediaClick={(post, mediaIndex) => {
                                            setSelectedPost(post);
                                            setSelectedMediaIndex(mediaIndex);
                                            setMediaViewerOpen(true);
                                        }}
                                    />
                                    <div ref={observerTarget} className="h-20 flex items-center justify-center pb-10">
                                        {isPostsLoading && hasMore && (
                                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary-500"></div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center pt-20 pb-12 px-6 text-center">
                                    <FiImage size={80} className="text-gray-300 dark:text-dark-border" strokeWidth={1.2} />
                                    <h3 className="text-[17px] font-medium text-gray-500 dark:text-dark-text-secondary mt-4">
                                        {t('profile.no_media')}
                                    </h3>
                                </div>
                            )
                        ) : (
                            // Posts, Replies, Video, Likes tabs - List View
                            isPostsLoading && reduxPosts.length === 0 ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500"></div>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {reduxPosts.length > 0 ? (
                                        <>
                                            {reduxPosts.map((post: Post) => (
                                                <PostCard key={post.id} post={post} />
                                            ))}
                                            <div ref={observerTarget} className="h-20 flex items-center justify-center pb-10">
                                                {isPostsLoading && hasMore && (
                                                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary-500"></div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center pt-20 pb-12 px-6 text-center">
                                            <div className="mb-4">
                                                <FiEdit3 size={80} className="text-gray-300 dark:text-dark-border" strokeWidth={1.2} />
                                            </div>
                                            <h3 className="text-[17px] font-medium text-gray-500 dark:text-dark-text-secondary mb-6">
                                                {t(`profile.no_${activeTab}`)}
                                            </h3>
                                            {isOwnProfile && activeTab === 'posts' && (
                                                <button
                                                    className="rounded-full font-bold px-8 py-2.5 bg-primary-500 hover:bg-primary-600 text-white transition-all shadow-sm text-[15px]"
                                                    onClick={() => dispatch(openCreatePost())}
                                                >
                                                    {t('profile.create_post')}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                </>
            )}

            {/* Media Post Viewer Modal */}
            <MediaPostViewerModal
                isOpen={mediaViewerOpen}
                onClose={() => setMediaViewerOpen(false)}
                post={selectedPost}
                initialMediaIndex={selectedMediaIndex}
            />

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
        </MainLayout>
    );
};

export default ProfilePage;
