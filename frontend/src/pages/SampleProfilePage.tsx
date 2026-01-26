import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiMoreHorizontal, FiMessageCircle, FiLink, FiSearch, FiUsers, FiList, FiEyeOff, FiUserX, FiFlag, FiCheck, FiPlus } from 'react-icons/fi';
import MainLayout from '../components/layout/MainLayout';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import PostCard from '../components/feed/PostCard';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchUserProfileById, followUserAsync, unfollowUserAsync, clearProfile } from '../redux/slices/userSlice';
import { fetchUserPosts, clearPosts } from '../redux/slices/postsSlice';
import { startConversation } from '../redux/slices/messagesSlice';
import { cn } from '../utils/classNames';
import { RootState } from '../redux/store';
import { Post, User } from '../types';
import { API_BASE_URL } from '../constants';

const SampleProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { profile, isLoading: isProfileLoading } = useAppSelector((state: RootState) => state.user);
    const { posts: reduxPosts, isLoading: isPostsLoading } = useAppSelector((state: RootState) => state.posts);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);

    const [activeTab, setActiveTab] = useState('posts');
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (userId) {
            dispatch(fetchUserProfileById(userId));
        }
        return () => {
            dispatch(clearProfile());
        };
    }, [dispatch, userId]);

    useEffect(() => {
        if (userId) {
            dispatch(clearPosts());
            dispatch(fetchUserPosts({ userId, type: activeTab }));
        }
    }, [dispatch, userId, activeTab]);

    const profileUser = profile;
    const profilePosts = reduxPosts;

    const handleFollowToggle = async (user: User) => {
        try {
            if (user.isFollowing) {
                await dispatch(unfollowUserAsync(user.id)).unwrap();
            } else {
                await dispatch(followUserAsync(user.id)).unwrap();
            }
        } catch (error) {
            console.error('Failed to toggle follow:', error);
        }
    };

    if (isProfileLoading && !profileUser) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500"></div>
                </div>
            </MainLayout>
        );
    }

    if (!profileUser) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center min-h-screen">
                    <p className="text-gray-500">User not found</p>
                    <Button onClick={() => navigate(-1)} variant="primary" className="mt-4">
                        Back
                    </Button>
                </div>
            </MainLayout>
        );
    }

    const formatCount = (count: number): string => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)} M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)} N`;
        }
        return count.toString();
    };

    const tabs = [
        { id: 'posts', label: t('nav.posts') },
        { id: 'replies', label: t('nav.replies') },
        { id: 'media', label: t('nav.media') },
        { id: 'video', label: t('nav.video') },
    ];

    const handleMessageClick = async () => {
        if (!profileUser) return;
        try {
            const conversation = await dispatch(startConversation([profileUser.id])).unwrap();
            navigate(`/messages/${conversation.id}`);
        } catch (error: any) {
            console.error('Failed to start conversation:', error);
        }
    };

    const handleCopyLink = () => {
        const profileUrl = `${window.location.origin}/profile/user/${profileUser.id}`;
        navigator.clipboard.writeText(profileUrl);
        setShowOptionsMenu(false);
        // TODO: Show toast notification
    };

    const handleSearchPosts = () => {
        // TODO: Implement search posts functionality
        console.log('Search posts');
        setShowOptionsMenu(false);
    };

    const handleAddToStarterPacks = () => {
        // TODO: Implement add to starter packs
        console.log('Add to starter packs');
        setShowOptionsMenu(false);
    };

    const handleAddToLists = () => {
        // TODO: Implement add to lists
        console.log('Add to lists');
        setShowOptionsMenu(false);
    };

    const handleHideAccount = () => {
        // TODO: Implement hide account
        console.log('Hide account');
        setShowOptionsMenu(false);
    };

    const handleBlockAccount = () => {
        // TODO: Implement block account
        console.log('Block account');
        setShowOptionsMenu(false);
    };

    const handleReportAccount = () => {
        // TODO: Implement report account
        console.log('Report account');
        setShowOptionsMenu(false);
    };

    return (
        <MainLayout hideTopBar={true}>
            <div className="flex flex-col bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border">
                {/* Cover Image */}
                <div className="relative h-48 w-full bg-gradient-to-br from-emerald-700 to-amber-800 overflow-hidden">
                    {profileUser.coverImage ? (
                        <img
                            src={profileUser.coverImage.startsWith('/')
                                ? `${API_BASE_URL.replace('/api', '')}${profileUser.coverImage}`
                                : profileUser.coverImage}
                            alt="Cover"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        // Default cover image - grass field
                        <img
                            src="https://images.unsplash.com/photo-1469131423693-c2f8c11a3c92?w=1200&h=400&fit=crop"
                            alt="Cover"
                            className="w-full h-full object-cover"
                        />
                    )}

                    {/* Back Button */}
                    <button
                        onClick={() => navigate(-1)}
                        className="absolute top-4 left-4 z-20 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors backdrop-blur-sm"
                    >
                        <FiArrowLeft size={20} />
                    </button>
                </div>

                {/* Profile Header Info */}
                <div className="relative px-4 pb-4">
                    {/* Avatar Overlap */}
                    <div className="absolute -top-16 left-4">
                        <Avatar
                            src={profileUser.avatarUrl || profileUser.avatar}
                            alt={profileUser.displayName}
                            size="2xl"
                            className="border-4 border-white dark:border-dark-bg shadow-lg ring-2 ring-white/50"
                        />
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex justify-end pt-3 gap-2">
                        <button
                            onClick={handleMessageClick}
                            className="p-2.5 border border-gray-300 dark:border-dark-border rounded-full hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors"
                        >
                            <FiMessageCircle size={20} className="text-gray-700 dark:text-dark-text" />
                        </button>
                        {currentUser?.id !== profileUser.id && (
                            <Button
                                variant={profileUser.isFollowing ? 'secondary' : 'primary'}
                                size="sm"
                                className="rounded-full font-bold px-6"
                                onClick={() => handleFollowToggle(profileUser)}
                            >
                                {profileUser.isFollowing ? (
                                    <>
                                        <FiCheck size={18} />
                                        {t('profile.following_btn')}
                                    </>
                                ) : (
                                    <>
                                        <FiPlus size={18} />
                                        {t('profile.follow')}
                                    </>
                                )}
                            </Button>
                        )}
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                                className="p-2.5 border border-gray-300 dark:border-dark-border rounded-full hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors"
                            >
                                <FiMoreHorizontal size={20} className="text-gray-700 dark:text-dark-text" />
                            </button>

                            {/* Dropdown Menu */}
                            {showOptionsMenu && (
                                <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-dark-surface rounded-lg shadow-lg border border-gray-200 dark:border-dark-border py-1 z-50">
                                    <button
                                        onClick={handleCopyLink}
                                        className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors text-gray-700 dark:text-dark-text"
                                    >
                                        <FiLink size={18} className="text-gray-500 dark:text-dark-text-secondary" />
                                        <span className="text-sm font-medium">{t('profile.copy_link')}</span>
                                    </button>

                                    <button
                                        onClick={handleSearchPosts}
                                        className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors text-gray-700 dark:text-dark-text"
                                    >
                                        <FiSearch size={18} className="text-gray-500 dark:text-dark-text-secondary" />
                                        <span className="text-sm font-medium">{t('profile.search_posts')}</span>
                                    </button>

                                    <button
                                        onClick={handleAddToStarterPacks}
                                        className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors text-gray-700 dark:text-dark-text"
                                    >
                                        <FiUsers size={18} className="text-gray-500 dark:text-dark-text-secondary" />
                                        <span className="text-sm font-medium">{t('profile.add_to_starter_packs')}</span>
                                    </button>

                                    <button
                                        onClick={handleAddToLists}
                                        className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors text-gray-700 dark:text-dark-text"
                                    >
                                        <FiList size={18} className="text-gray-500 dark:text-dark-text-secondary" />
                                        <span className="text-sm font-medium">{t('profile.add_to_lists')}</span>
                                    </button>

                                    <div className="border-t border-gray-200 dark:border-dark-border my-1"></div>

                                    <button
                                        onClick={handleHideAccount}
                                        className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors text-gray-700 dark:text-dark-text"
                                    >
                                        <FiEyeOff size={18} className="text-gray-500 dark:text-dark-text-secondary" />
                                        <span className="text-sm font-medium">{t('profile.hide_account')}</span>
                                    </button>

                                    <button
                                        onClick={handleBlockAccount}
                                        className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors text-gray-700 dark:text-dark-text"
                                    >
                                        <FiUserX size={18} className="text-gray-500 dark:text-dark-text-secondary" />
                                        <span className="text-sm font-medium">{t('profile.block_account')}</span>
                                    </button>

                                    <button
                                        onClick={handleReportAccount}
                                        className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors text-red-600 dark:text-red-500"
                                    >
                                        <FiFlag size={18} />
                                        <span className="text-sm font-medium">{t('profile.report_account')}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* User Identity */}
                    <div className="mt-8">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                            {profileUser.displayName}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                            {profileUser.handle}
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-3 mt-3 text-sm">
                        <button
                            onClick={() => navigate(`/profile/user/${profileUser.id}/followers`)}
                            className="flex gap-1 items-baseline hover:underline cursor-pointer"
                        >
                            <span className="font-bold text-gray-900 dark:text-dark-text">
                                {formatCount(profileUser.followersCount)}
                            </span>
                            <span className="text-gray-500 dark:text-dark-text-secondary">
                                {t('profile.followers')}
                            </span>
                        </button>
                        <button
                            onClick={() => navigate(`/profile/user/${profileUser.id}/following`)}
                            className="flex gap-1 items-baseline hover:underline cursor-pointer"
                        >
                            <span className="font-bold text-gray-900 dark:text-dark-text">
                                {formatCount(profileUser.followingCount)}
                            </span>
                            <span className="text-gray-500 dark:text-dark-text-secondary">
                                {t('profile.following')}
                            </span>
                        </button>
                        <div className="flex gap-1 items-baseline">
                            <span className="font-bold text-gray-900 dark:text-dark-text">
                                {formatCount(profileUser.postsCount)}
                            </span>
                            <span className="text-gray-500 dark:text-dark-text-secondary">
                                {t('profile.posts_stat')}
                            </span>
                        </div>
                    </div>

                    {/* Bio */}
                    <div className="mt-3 text-[15px] leading-relaxed text-gray-900 dark:text-dark-text">
                        <p>{profileUser.bio || 'Slowly, slowly writing a book about historical baseball equipment. Professional baseball talkerer. Two time World Series Champion support staff.'}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-dark-border flex">
                    {tabs.map((tab: { id: string; label: string }) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex-1 py-4 text-[15px] font-semibold transition-all relative",
                                activeTab === tab.id
                                    ? "text-gray-900 dark:text-dark-text"
                                    : "text-gray-500 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-surface/50"
                            )}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary-500 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1">
                    {isPostsLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500"></div>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {profilePosts.length > 0 ? (
                                profilePosts.map((post: Post) => (
                                    <PostCard key={post.id} post={post} />
                                ))
                            ) : (
                                <div className="py-20 text-center flex flex-col items-center">
                                    <div className="mb-4">
                                        <FiSearch size={48} className="text-gray-300 dark:text-dark-surface" />
                                    </div>
                                    <p className="text-gray-500 dark:text-dark-text-secondary text-sm">
                                        {t(`profile.no_${activeTab}`)}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default SampleProfilePage;
