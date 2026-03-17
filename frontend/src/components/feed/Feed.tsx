import React, { useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/useAppSelector';
import PostCard from './PostCard';
import { Post } from '../../types';
import { PostFeedSkeleton } from './PostSkeleton';
import { FiBookmark } from 'react-icons/fi';
import { detectLanguage } from '../../utils/languageDetector';
import { Virtuoso } from 'react-virtuoso';

interface FeedProps {
    posts?: Post[]; // Optional prop to override Redux posts
    isLoading?: boolean; // NEW: explicit loading state
    onLoadMore?: () => void; // Optional infinite scroll trigger
    hasMore?: boolean; // Whether more posts can be loaded
    endMessage?: string; // NEW: custom end of feed message
    emptyMessage?: string; // NEW: custom message when there are 0 posts
}

const Feed: React.FC<FeedProps> = ({
    posts: propPosts,
    isLoading: propLoading,
    onLoadMore,
    hasMore = true,
    endMessage,
    emptyMessage
}) => {
    const { t } = useTranslation();
    const reduxPosts = useAppSelector((state) => state.posts.posts);
    const reduxLoading = useAppSelector((state) => state.posts.isLoading);
    const contentLanguages = useAppSelector((state) => state.language.contentLanguages);
    // Guard to prevent multiple concurrent load-more calls before Redux state updates
    const loadingMoreRef = useRef(false);

    const isLoading = propLoading !== undefined ? propLoading : reduxLoading;

    // Reset guard when loading state changes back to false
    useEffect(() => {
        if (!isLoading) {
            loadingMoreRef.current = false;
        }
    }, [isLoading]);

    // Use provided posts or fall back to Redux posts, and filter out soft-deleted posts
    const allPosts = propPosts !== undefined ? propPosts : reduxPosts;

    const posts = useMemo(() => {
        // 1. Initial filter for deleted posts
        const basePosts = allPosts.filter(post => !post.isDeleted);

        // 2. Content Language filtering/prioritization logic
        if (!contentLanguages || contentLanguages.length === 0) {
            return basePosts;
        }

        // Detect language and sort
        const matchingPosts: Post[] = [];
        const otherPosts: Post[] = [];

        basePosts.forEach(post => {
            const lang = post.language || detectLanguage(post.content);
            if (contentLanguages.includes(lang)) {
                matchingPosts.push(post);
            } else {
                otherPosts.push(post);
            }
        });

        if (matchingPosts.length === 0) {
            return otherPosts;
        }

        return [...matchingPosts, ...otherPosts];
    }, [allPosts, contentLanguages]);

    if (isLoading && posts.length === 0) {
        return <PostFeedSkeleton count={5} />;
    }

    if (posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <FiBookmark size={48} className="text-gray-300 dark:text-dark-border mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-2">
                    {emptyMessage || t('feeds.no_posts')}
                </h3>
                {!emptyMessage && (
                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                        {t('feeds.no_posts_desc')}
                    </p>
                )}
            </div>
        );
    }

    return (
        <Virtuoso
            useWindowScroll
            data={posts}
            endReached={() => {
                // Guard: don't trigger if already loading or a load-more is in flight
                if (onLoadMore && hasMore && !isLoading && !loadingMoreRef.current) {
                    loadingMoreRef.current = true;
                    onLoadMore();
                }
            }}
            increaseViewportBy={200}
            itemContent={(_index, post) => (
                <div className="relative z-10 bg-white dark:bg-dark-bg">
                    {post.parentPost && (
                        <PostCard
                            post={post.parentPost}
                            hasBottomLine={true}
                            hideBorder={true}
                        />
                    )}
                    <PostCard
                        post={post}
                        hasTopLine={!!post.parentPost}
                    />
                </div>
            )}
            components={{
                Footer: () => (
                    <div className="h-20 flex items-center justify-center border-t border-gray-100 dark:border-dark-border/30">
                        {isLoading && posts.length > 0 && (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                        )}
                        {!isLoading && !hasMore && posts.length > 0 && (
                            <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-dark-text-secondary select-none px-6 text-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-dark-border/60"></div>
                                    <span className="text-sm font-medium">{endMessage || t('feeds.end', 'End of feed')}</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-dark-border/60"></div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }}
        />
    );
};

export default Feed;
