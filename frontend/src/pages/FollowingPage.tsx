import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiCheck, FiPlus } from 'react-icons/fi';
import Avatar from '../components/common/Avatar';
import UserHoverCard from '../components/common/UserHoverCard';
import UserSkeleton from '../components/common/UserSkeleton';
import Button from '../components/common/Button';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fetchFollowing, fetchUserProfile, fetchUserProfileById, followUserAsync, unfollowUserAsync, clearFollowing, clearProfile, profileMatchesIdentifier } from '../redux/slices/userSlice';
import { RootState } from '../redux/store';
import { User } from '../types';

const FollowingPage: React.FC = () => {
    const { userId, handle } = useParams<{ userId?: string; handle?: string }>();
    const effectiveId = userId || handle;
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { profile, followingUsers: users, followingOwnerId, isLoading, followingCursor: cursor, followingHasMore: hasMore } = useAppSelector((state: RootState) => state.user);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const observerTarget = React.useRef<HTMLDivElement>(null);

    useDocumentTitle(profile ? `${profile.displayName} (@${profile.handle})` : t('profile.following'));

    useEffect(() => {
        // Only clear if switching to a DIFFERENT profile
        if (profile && !profileMatchesIdentifier(profile, effectiveId || '')) {
            dispatch(clearProfile());
            dispatch(clearFollowing());
        }

        let profilePromise: any;
        let listPromise: any;

        if (effectiveId) {
            if (effectiveId.includes('.')) {
                // It's a handle, we need the profile first to get the DID
                profilePromise = dispatch(fetchUserProfile(effectiveId));
            } else {
                // It's a DID, we can fetch profile and list in parallel
                profilePromise = dispatch(fetchUserProfileById(effectiveId));
                const targetActor = effectiveId.toLowerCase();
                if (hasMore && (followingOwnerId !== targetActor || users.length === 0)) {
                    listPromise = dispatch(fetchFollowing({ actor: effectiveId, limit: 30 }));
                }
            }
        }

        return () => {
            if (profilePromise) profilePromise.abort();
            if (listPromise) listPromise.abort();
        };
    }, [dispatch, effectiveId, followingOwnerId, users.length, hasMore]); // Check ownership check to prevent flickering

    useEffect(() => {
        let listPromise: any;
        // Guard: fetch list only when profile matches the handle
        if (profile?.id && effectiveId?.includes('.') && (profile.handle === effectiveId || profile.did === effectiveId)) {
            const targetActor = profile.id.toLowerCase();
            if (hasMore && (followingOwnerId !== targetActor || users.length === 0)) {
                listPromise = dispatch(fetchFollowing({ actor: profile.id, limit: 30 }));
            }
        }

        return () => {
            if (listPromise) listPromise.abort();
        };
    }, [dispatch, profile?.id, profile?.handle, profile?.did, effectiveId, followingOwnerId, users.length, hasMore]);

    // Infinite Scroll Observer
    useEffect(() => {
        if (!hasMore || isLoading || !profile?.id) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    dispatch(fetchFollowing({ actor: profile.id, cursor: cursor || undefined, limit: 30 }));
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [dispatch, hasMore, isLoading, profile?.id, cursor]);

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
                dispatch(unfollowUserAsync({ userId: user.id, followUri: (user as any).followingReference || '' }));
            } else {
                dispatch(followUserAsync(user.id));
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
                {following.length > 0 ? (
                    <>
                        {following.map((user: User) => (
                            <div
                                key={user.id}
                                className="px-4 py-4 border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    <UserHoverCard user={user}>
                                        <button onClick={() => navigate(`/profile/${user.handle || 'user/' + user.id}`)}>
                                            <Avatar
                                                src={user.avatarUrl || user.avatar}
                                                alt={user.displayName}
                                                size="md"
                                            />
                                        </button>
                                    </UserHoverCard>
                                    <div className="flex-1 min-w-0">
                                        <button
                                            onClick={() => navigate(`/profile/${user.handle || 'user/' + user.id}`)}
                                            className="block text-left"
                                        >
                                            <UserHoverCard user={user}>
                                                <h3 className="font-bold text-gray-900 dark:text-dark-text hover:underline">
                                                    {user.displayName}
                                                </h3>
                                            </UserHoverCard>
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
                                    {currentUser?.id !== user.id && currentUser?.did !== user.did && (
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
                        ))}
                        {/* Infinite Scroll Trigger */}
                        <div ref={observerTarget} className="h-20 flex items-center justify-center">
                            {isLoading && <UserSkeleton count={2} />}
                        </div>
                    </>
                ) : isLoading ? (
                    <UserSkeleton count={6} />
                ) : (
                    <div className="py-20 px-8 text-center flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-dark-surface rounded-full flex items-center justify-center mb-4">
                            <FiPlus className="text-gray-400" size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2">
                            {t('profile.no_following_title', 'Not following anyone yet')}
                        </h2>
                        <p className="text-gray-500 dark:text-dark-text-secondary text-sm max-w-xs">
                            {t('profile.no_following_desc', 'When they follow someone, their posts will show up here.')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FollowingPage;
