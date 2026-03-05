import React, { useEffect } from 'react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import { fetchPostById } from '../../redux/slices/postsSlice';
import { Post } from '../../types';
import Avatar from '../common/Avatar';
import { formatPostDate } from '../../utils/formatDate';
import LinkPreviewCard from '../common/LinkPreviewCard';
import { FiPlay, FiRepeat } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RichText from '../common/RichText';

interface PostEmbedProps {
    postId: string;
}

const PostEmbed: React.FC<PostEmbedProps> = ({ postId }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    // Check if post exists in store, if not fetch it
    const post = useAppSelector((state: RootState) =>
        state.posts.posts.find((p: Post) => p.id === postId)
    );
    const isLoading = useAppSelector((state: RootState) => state.posts.isLoading);

    const { t, i18n } = useTranslation();

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
                        {formatPostDate(post.createdAt, i18n.language)}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-3">
                {post.content && (
                    <RichText
                        content={post.content}
                        className="text-sm text-gray-800 dark:text-dark-text mb-2 line-clamp-3 whitespace-pre-wrap"
                    />
                )}

                {/* Media Preview */}
                {post.videoUrl ? (
                    <div className="rounded-lg overflow-hidden w-full bg-black relative aspect-video group"
                        onMouseEnter={(e) => {
                            const video = e.currentTarget.querySelector('video');
                            if (video) video.play().catch(() => { });
                        }}
                        onMouseLeave={(e) => {
                            const video = e.currentTarget.querySelector('video');
                            if (video) {
                                video.pause();
                                video.currentTime = 0;
                            }
                        }}
                    >
                        <video
                            src={post.videoUrl}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            playsInline
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
                                <FiPlay className="ml-1" size={20} />
                            </div>
                        </div>
                    </div>
                ) : (post.images?.length || post.imageUrls?.length || post.media?.length || 0) > 0 ? (
                    <div className="rounded-lg overflow-hidden h-40 w-full bg-gray-100 dark:bg-dark-surface relative">
                        <img
                            src={post.media?.[0]?.url || post.images?.[0]?.url || post.imageUrls?.[0]}
                            alt={post.media?.[0]?.altText || post.images?.[0]?.alt || "Post media"}
                            className="w-full h-full object-cover"
                        />
                        {((post.media?.length || post.images?.length || post.imageUrls?.length || 0) > 1) && (
                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-bold">
                                +{(post.media?.length || post.images?.length || post.imageUrls?.length || 0) - 1}
                            </div>
                        )}
                        {(post.media?.[0]?.altText || post.images?.[0]?.alt) && (
                            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">
                                ALT
                            </div>
                        )}
                    </div>
                ) : post.linkPreview ? (
                    <LinkPreviewCard preview={post.linkPreview} isSmall={true} />
                ) : null}

                {/* Quote Post Preview inside Embed */}
                {post.quotePost && (
                    <div className="mt-2 p-2 rounded-lg border border-gray-100 dark:border-dark-border/30 bg-gray-50/50 dark:bg-white/5 flex items-center gap-2">
                        <div className="p-1.5 bg-gray-200 dark:bg-dark-border rounded-full text-gray-500">
                            <FiRepeat size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-gray-900 dark:text-dark-text truncate">
                                {post.quotePost.author.displayName}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate leading-tight">
                                {post.quotePost.content || (post.quotePost.media?.length ? '📷 Photo' : 'Post')}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            <div className="px-3 py-2 bg-gray-50 dark:bg-white/5 flex items-center gap-4 text-xs text-gray-500 dark:text-dark-text-secondary">
                <span>{post.repliesCount || 0} {t('post.replies')}</span>
                <span>{post.repostsCount || 0} {t('post.reposts')}</span>
                <span>{post.likesCount || 0} {t('post.likes')}</span>
            </div>
        </div>
    );
};

export default PostEmbed;
