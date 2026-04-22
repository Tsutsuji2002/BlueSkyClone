import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiHeart } from 'react-icons/fi';
import Avatar from '../components/common/Avatar';
import UserHoverCard from '../components/common/UserHoverCard';
import UserSkeleton from '../components/common/UserSkeleton';
import Button from '../components/common/Button';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fetchPostById } from '../redux/slices/postsSlice';
import { fetchPostLikedBy, followUserAsync, unfollowUserAsync } from '../redux/slices/userSlice';
import { RootState } from '../redux/store';
import { User } from '../types';

const INITIAL_LIMIT = 25;
const NEXT_LIMIT = 25;

const PostLikedByPage: React.FC = () => {
    const { handle, postId } = useParams<{ handle: string; postId: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();

    const currentUser = useAppSelector((s: RootState) => s.auth.user);
    const post = useAppSelector((s: RootState) =>
        s.posts.posts.find(p => p.tid === postId || p.id === postId)
    );

    const [users, setUsers] = useState<User[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const observerTarget = useRef<HTMLDivElement>(null);
    const postUri = post?.uri;

    useDocumentTitle(post ? `${t('post.liked_by_title', 'Liked By')} · ${post.likesCount} ${t('post.likes', 'Likes')}` : t('post.liked_by_title', 'Liked By'));

    // Load the post if we don't have it
    useEffect(() => {
        if (!post && postId) {
            dispatch(fetchPostById({ handle, uri: postId }));
        }
    }, [dispatch, post, postId, handle]);

    // Initial fetch once we have the URI
    useEffect(() => {
        if (!postUri || users.length > 0) return;
        setLoading(true);
        dispatch(fetchPostLikedBy({ postUri, limit: INITIAL_LIMIT }))
            .unwrap()
            .then(({ users: fetched, cursor: nextCursor }) => {
                setUsers(fetched);
                setCursor(nextCursor);
                setHasMore(!!nextCursor && fetched.length >= INITIAL_LIMIT);
            })
            .finally(() => setLoading(false));
    }, [dispatch, postUri]);

    // Infinite scroll
    useEffect(() => {
        if (!hasMore || loading || !cursor || !postUri) return;
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    setLoading(true);
                    dispatch(fetchPostLikedBy({ postUri, cursor, limit: NEXT_LIMIT }))
                        .unwrap()
                        .then(({ users: fetched, cursor: nextCursor }) => {
                            setUsers(prev => {
                                const ids = new Set(prev.map(u => u.did || u.id));
                                const unique = fetched.filter(u => !ids.has(u.did || u.id));
                                return [...prev, ...unique];
                            });
                            setCursor(nextCursor);
                            setHasMore(!!nextCursor && fetched.length >= NEXT_LIMIT);
                        })
                        .finally(() => setLoading(false));
                }
            },
            { rootMargin: '600px', threshold: 0 }
        );
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [dispatch, hasMore, loading, cursor, postUri]);

    const handleFollow = async (user: User) => {
        const identifier = user.did || user.handle || user.id;
        setActionLoading(prev => ({ ...prev, [identifier]: true }));
        try {
            if (user.isFollowing) {
                await dispatch(unfollowUserAsync({ userId: identifier, followUri: user.followingReference || '' })).unwrap();
                setUsers(prev => prev.map(u => (u.did || u.id) === identifier
                    ? { ...u, isFollowing: false, followingReference: undefined } : u));
            } else {
                const result = await dispatch(followUserAsync(identifier)).unwrap();
                setUsers(prev => prev.map(u => (u.did || u.id) === identifier
                    ? { ...u, isFollowing: true, followingReference: result.uri } : u));
            }
        } finally {
            setActionLoading(prev => ({ ...prev, [identifier]: false }));
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-dark-bg">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-sm border-b border-gray-200 dark:border-dark-border">
                <div className="flex items-center gap-4 px-4 py-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                    >
                        <FiArrowLeft size={20} className="text-gray-900 dark:text-dark-text" />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg text-gray-900 dark:text-dark-text">
                            {t('post.liked_by_title', 'Liked By')}
                        </h1>
                        {post && (
                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                {post.likesCount} {t('post.likes', 'likes')}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* User List */}
            <div className="divide-y divide-gray-100 dark:divide-dark-border/50">
                {users.map(user => {
                    const identifier = user.did || user.handle || user.id;
                    const isLoading = actionLoading[identifier];
                    const isSelf = currentUser?.id === user.id || currentUser?.did === user.did;
                    return (
                        <div key={identifier} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                            <UserHoverCard user={user}>
                                <button onClick={() => navigate(`/profile/${user.handle || user.did}`)}>
                                    <Avatar src={user.avatarUrl} alt={user.displayName || user.handle} size="md" />
                                </button>
                            </UserHoverCard>
                            <div className="flex-1 min-w-0">
                                <UserHoverCard user={user}>
                                    <button
                                        className="font-semibold text-gray-900 dark:text-dark-text hover:underline truncate max-w-full block text-left"
                                        onClick={() => navigate(`/profile/${user.handle || user.did}`)}
                                    >
                                        {user.displayName || user.handle}
                                    </button>
                                </UserHoverCard>
                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                                    @{user.handle}
                                </p>
                                {user.bio && (
                                    <p className="text-sm text-gray-700 dark:text-dark-text mt-0.5 line-clamp-2">{user.bio}</p>
                                )}
                                {user.isFollowedBy && (
                                    <span className="text-xs bg-gray-100 dark:bg-dark-surface text-gray-500 dark:text-dark-text-secondary px-1.5 py-0.5 rounded mt-1 inline-block">
                                        {t('profile.follows_you', 'Follows you')}
                                    </span>
                                )}
                            </div>
                            {currentUser && !isSelf && (
                                <Button
                                    variant={user.isFollowing ? 'outline' : 'primary'}
                                    size="sm"
                                    onClick={() => handleFollow(user)}
                                    disabled={isLoading}
                                    className="flex-shrink-0 rounded-full font-bold px-4"
                                >
                                    {isLoading
                                        ? '...'
                                        : user.isFollowing
                                            ? t('profile.following', 'Following')
                                            : user.isFollowedBy
                                                ? t('profile.follow_back', '+ Follow back')
                                                : t('profile.follow', '+ Follow')
                                    }
                                </Button>
                            )}
                        </div>
                    );
                })}

                {/* Skeletons */}
                {loading && Array.from({ length: 5 }).map((_, i) => (
                    <UserSkeleton key={i} />
                ))}

                {/* Empty State */}
                {!loading && users.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-dark-text-secondary">
                        <FiHeart size={40} className="mb-3 opacity-40" />
                        <p className="font-medium">{t('post.no_likes', 'No likes yet')}</p>
                    </div>
                )}

                {/* Infinite scroll target */}
                <div ref={observerTarget} className="h-4" />
            </div>
        </div>
    );
};

export default PostLikedByPage;
