import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiCheck, FiPlus } from 'react-icons/fi';
import Avatar from '../components/common/Avatar';
import UserSkeleton from '../components/common/UserSkeleton';
import Button from '../components/common/Button';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fetchFollowing, fetchUserProfile, fetchUserProfileById, followUserAsync, unfollowUserAsync } from '../redux/slices/userSlice';
import { RootState } from '../redux/store';
import { User } from '../types';

const FollowingPage: React.FC = () => {
    const { userId, handle } = useParams<{ userId?: string; handle?: string }>();
    const effectiveId = userId || handle;
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { profile, users, isLoading } = useAppSelector((state: RootState) => state.user);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);

    useDocumentTitle(profile ? `${profile.displayName} (@${profile.handle})` : t('profile.following'));

    useEffect(() => {
        if (effectiveId) {
            if (effectiveId.includes('.')) {
                // It's a handle
                dispatch(fetchUserProfile(effectiveId));
            } else {
                dispatch(fetchUserProfileById(effectiveId));
                dispatch(fetchFollowing(effectiveId));
            }
        }
    }, [dispatch, effectiveId]);

    useEffect(() => {
        if (profile?.id && effectiveId?.includes('.')) {
            dispatch(fetchFollowing(profile.id));
        }
    }, [dispatch, profile?.id, effectiveId]);

    const profileUser = profile;
    const following = users;

    const formatCount = (count: number): string => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)} M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)} N`;
        }
        return count.toString();
    };

    if (isLoading && !profileUser) {
        return (
            <div className="flex flex-col min-h-screen">
                <div className="sticky top-0 z-10 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-sm border-b border-gray-200 dark:border-dark-border px-4 py-3 h-[73px]">
                   {/* Ghost Header */}
                </div>
                <UserSkeleton count={8} />
            </div>
        );
    }

    if (!profileUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-gray-500">User not found</p>
                <Button onClick={() => navigate(-1)} variant="primary" className="mt-4">
                    Back
                </Button>
            </div>
        );
    }

    const handleFollowToggle = async (user: User) => {
        try {
            if (user.isFollowing) {
                await dispatch(unfollowUserAsync({ userId: user.id, followUri: (user as any).followingReference || '' })).unwrap();
            } else {
                await dispatch(followUserAsync(user.id)).unwrap();
            }
        } catch (error) {
            console.error('Failed to toggle follow:', error);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-sm border-b border-gray-200 dark:border-dark-border px-4 py-3">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors text-gray-700 dark:text-dark-text"
                        >
                            <FiArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                                {profileUser.displayName}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                {formatCount(profileUser.followingCount)} {t('profile.following')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Following List */}
                <div className="flex-1">
                    {isLoading && following.length === 0 ? (
                        <UserSkeleton count={6} />
                    ) : following.length > 0 ? (
                        following.map((user: User) => (
                            <div
                                key={user.id}
                                className="px-4 py-4 border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    <button onClick={() => navigate(`/profile/user/${user.id}`)}>
                                        <Avatar
                                            src={user.avatarUrl || user.avatar}
                                            alt={user.displayName}
                                            size="md"
                                        />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <button
                                            onClick={() => navigate(`/profile/user/${user.id}`)}
                                            className="block text-left"
                                        >
                                            <h3 className="font-bold text-gray-900 dark:text-dark-text hover:underline">
                                                {user.displayName}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                                {user.handle}
                                            </p>
                                        </button>
                                        {user.bio && (
                                            <p className="mt-1 text-sm text-gray-700 dark:text-dark-text line-clamp-2">
                                                {user.bio}
                                            </p>
                                        )}
                                    </div>
                                    {currentUser?.id !== user.id && (
                                        <Button
                                            variant={user.isFollowing ? 'secondary' : 'primary'}
                                            size="sm"
                                            className="rounded-full font-bold px-4 shrink-0"
                                            onClick={() => handleFollowToggle(user)}
                                        >
                                            {user.isFollowing ? (
                                                <>
                                                    <FiCheck size={16} />
                                                    {t('profile.following_btn')}
                                                </>
                                            ) : (
                                                <>
                                                    <FiPlus size={16} />
                                                    {t('profile.follow')}
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center">
                            <p className="text-gray-500 dark:text-dark-text-secondary text-sm">
                                Not following anyone yet
                            </p>
                        </div>
                    )}
                </div>
            </div>
    );
};

export default FollowingPage;

