import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiCheck, FiPlus } from 'react-icons/fi';
import Avatar from '../components/common/Avatar';
import UserHoverCard from '../components/common/UserHoverCard';
import UserSkeleton from '../components/common/UserSkeleton';
import Button from '../components/common/Button';
import { cn } from '../utils/classNames';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatHandleText } from '../utils/identity';
import { fetchFollowing, fetchUserProfile, fetchUserProfileById, followUserAsync, unfollowUserAsync, clearFollowing, clearProfile, normalizeIdentifier, profileMatchesIdentifier } from '../redux/slices/userSlice';
import { RootState } from '../redux/store';
import { User } from '../types';

const INITIAL_PAGE_SIZE = 10;
const NEXT_PAGE_SIZE = 5;
const LOAD_AHEAD_MARGIN = '800px 0px';

const FollowingPage: React.FC = () => {
    const { userId, handle } = useParams<{ userId?: string; handle?: string }>();
    const effectiveId = userId || handle;
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const {
        profile,
        followingUsers: users,
        followingOwnerId,
        followingInitializedOwnerId,
        followingLoading,
        isLoading,
        followingCursor: cursor,
        followingHasMore: hasMore,
        error,
        actionLoading,
    } = useAppSelector((state: RootState) => state.user);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const observerTarget = React.useRef<HTMLDivElement>(null);
    const resolvedListActor = profile?.did || profile?.handle || profile?.id || effectiveId || '';
    const activeOwnerKey = normalizeIdentifier(resolvedListActor);
    const hasInitializedCurrentList = !!activeOwnerKey && followingInitializedOwnerId === activeOwnerKey;
    useDocumentTitle(profile ? `${profile.displayName} (@${profile.handle})` : t('profile.following'));

    useEffect(() => {
        // Only clear if switching to a DIFFERENT profile
        if (profile && !profileMatchesIdentifier(profile, effectiveId || '')) {
            dispatch(clearProfile());
            dispatch(clearFollowing());
        }

        let profilePromise: any;

        if (effectiveId) {
            profilePromise = effectiveId.includes('.')
                ? dispatch(fetchUserProfile(effectiveId))
                : dispatch(fetchUserProfileById(effectiveId));
        }

        return () => {
            if (profilePromise) profilePromise.abort();
        };
    }, [dispatch, effectiveId]);

    useEffect(() => {
        if (effectiveId && profileMatchesIdentifier(profile, effectiveId) && resolvedListActor) {
            const targetActor = normalizeIdentifier(resolvedListActor);
            const needsInitialFetch = followingInitializedOwnerId !== targetActor;

            if (needsInitialFetch && !followingLoading) {
                dispatch(fetchFollowing({ actor: resolvedListActor, limit: INITIAL_PAGE_SIZE }));
            }
        }
    }, [dispatch, effectiveId, profile, resolvedListActor, followingInitializedOwnerId, followingLoading]);

    // Infinite Scroll Observer
    useEffect(() => {
        if (!hasMore || followingLoading || !cursor || !resolvedListActor || !profileMatchesIdentifier(profile, effectiveId || '')) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    dispatch(fetchFollowing({ actor: resolvedListActor, cursor, limit: NEXT_PAGE_SIZE }));
                }
            },
            { rootMargin: LOAD_AHEAD_MARGIN, threshold: 0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [dispatch, hasMore, followingLoading, resolvedListActor, cursor, profile, effectiveId]);

    const profileUser = profile;
    const following = users;
    const isInitialListLoading = (!hasInitializedCurrentList && followingLoading) || (followingLoading && following.length === 0);

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
            const followActor = user.did || user.handle || user.id;
            const isFollowing = !!user.isFollowing;
            const followingReference = user.followingReference;

            if (isFollowing) {
                if (!followingReference) {
                    return;
                }

                dispatch(unfollowUserAsync({ userId: followActor, followUri: followingReference }));
            } else {
                dispatch(followUserAsync(followActor));
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
                    <div className="min-w-0">
                        <h1 className="truncate text-xl font-bold text-gray-900 dark:text-dark-text" title={profileUser.displayName || profileUser.handle}>
                            {profileUser.displayName || profileUser.handle}
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
                                {(() => {
                                    const followActor = user.did || user.handle || user.id;
                                    const isFollowing = !!user.isFollowing;
                                    const isFollowBusy = !!actionLoading[followActor] || !!actionLoading[user.id];

                                    return (
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
                                            className="block min-w-0 text-left"
                                        >
                                            <UserHoverCard user={user}>
                                                <h3 className="truncate font-bold text-gray-900 dark:text-dark-text hover:underline" title={user.displayName || user.handle}>
                                                    {user.displayName || user.handle}
                                                </h3>
                                            </UserHoverCard>
                                            <p className="truncate text-sm text-gray-500 dark:text-dark-text-secondary" title={user.handle}>
                                                {formatHandleText(user.handle)}
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
                                            variant={isFollowing ? 'secondary' : 'primary'}
                                            size="sm"
                                            className={cn(
                                                "rounded-full font-bold px-4 shrink-0 min-w-[110px]",
                                                isFollowBusy && "opacity-80 animate-pulse"
                                            )}
                                            disabled={isFollowBusy}
                                            onClick={() => handleFollowToggle(user)}
                                        >
                                            {isFollowing ? (
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
                                    );
                                })()}
                            </div>
                        ))}
                        {/* Infinite Scroll Trigger */}
                        <div ref={observerTarget} className="h-20 flex items-center justify-center">
                            {followingLoading && following.length > 0 && <UserSkeleton count={2} />}
                        </div>
                    </>
                ) : (isInitialListLoading || !profile || followingOwnerId !== activeOwnerKey) ? (
                    <UserSkeleton count={8} />
                ) : error ? (
                    <div className="py-20 px-4 text-center">
                        <div className="text-red-500 mb-4 font-bold">500 Error: Failed to load list</div>
                        <button
                            onClick={() => dispatch(fetchFollowing({ actor: resolvedListActor || effectiveId!, limit: INITIAL_PAGE_SIZE }))}
                            className="text-blue-500 hover:underline font-medium"
                        >
                            Try again
                        </button>
                    </div>
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
