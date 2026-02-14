import React, { useEffect } from 'react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import { fetchPostById } from '../../redux/slices/postsSlice';
import Avatar from '../common/Avatar';
import { formatPostDate } from '../../utils/formatDate';
import { useNavigate } from 'react-router-dom';

interface PostEmbedProps {
    postId: string;
}

const PostEmbed: React.FC<PostEmbedProps> = ({ postId }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    // Check if post exists in store, if not fetch it
    const post = useAppSelector((state: RootState) =>
        state.posts.posts.find(p => p.id === postId)
    );
    const isLoading = useAppSelector((state: RootState) => state.posts.isLoading);

    useEffect(() => {
        if (!post) {
            dispatch(fetchPostById(postId));
        }
    }, [dispatch, postId, post]);

    if (!post) {
        if (isLoading) {
            return (
                <div className="mt-2 border border-gray-200 dark:border-dark-border rounded-xl p-4 bg-white dark:bg-dark-surface max-w-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-dark-border animate-pulse" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 w-1/3 bg-gray-200 dark:bg-dark-border rounded animate-pulse" />
                            <div className="h-2 w-1/4 bg-gray-200 dark:bg-dark-border rounded animate-pulse" />
                        </div>
                    </div>
                    <div className="h-4 w-full bg-gray-200 dark:bg-dark-border rounded animate-pulse mb-2" />
                    <div className="h-4 w-2/3 bg-gray-200 dark:bg-dark-border rounded animate-pulse" />
                </div>
            );
        }
        return null; // Post not found or error
    }

    return (
        <div
            className="mt-2 text-left border border-gray-200 dark:border-dark-border/50 rounded-xl overflow-hidden bg-white dark:bg-dark-bg cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors shadow-sm"
            onClick={(e) => {
                e.stopPropagation(); // Prevent message bubble click
                navigate(`/profile/${post.author.handle}/post/${post.id}`);
            }}
        >
            {/* Header */}
            <div className="p-3 flex items-center gap-2 border-b border-gray-50 dark:border-dark-border/30">
                <Avatar src={post.author.avatarUrl || post.author.avatar} alt={post.author.displayName} size="xs" />
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-sm text-gray-900 dark:text-dark-text truncate">
                        {post.author.displayName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-dark-text-secondary truncate">
                        @{post.author.handle}
                    </span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatPostDate(post.createdAt)}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-3">
                {post.content && (
                    <p className="text-sm text-gray-800 dark:text-dark-text mb-2 line-clamp-3 whitespace-pre-wrap">
                        {post.content}
                    </p>
                )}

                {/* Media Preview (Simplified) */}
                {(post.images?.length || 0) > 0 && (
                    <div className="rounded-lg overflow-hidden h-40 w-full bg-gray-100 dark:bg-dark-surface relative">
                        <img
                            src={post.images![0].url}
                            alt="Post media"
                            className="w-full h-full object-cover"
                        />
                        {(post.images!.length > 1) && (
                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-bold">
                                +{post.images!.length - 1}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            <div className="px-3 py-2 bg-gray-50 dark:bg-white/5 flex items-center gap-4 text-xs text-gray-500 dark:text-dark-text-secondary">
                <span>{post.repliesCount} replies</span>
                <span>{post.repostsCount} reposts</span>
                <span>{post.likesCount} likes</span>
            </div>
        </div>
    );
};

export default PostEmbed;
