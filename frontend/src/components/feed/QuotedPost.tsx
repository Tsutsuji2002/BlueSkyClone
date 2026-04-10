import React from 'react';
import { Post } from '../../types';
import Avatar from '../common/Avatar';
import { formatPostDate } from '../../utils/formatDate';
import { useTranslation } from 'react-i18next';
import RichText from '../common/RichText';
import MediaGrid from './MediaGrid';
import LinkPreviewCard from '../common/LinkPreviewCard';
import { FiRepeat } from 'react-icons/fi';
import { BsPatchCheckFill } from 'react-icons/bs';

import { useNavigate } from 'react-router-dom';

interface QuotedPostProps {
    post: Post;
    isCard?: boolean; // If true, rendering inside a PostCard (needs border/padding)
}

const QuotedPost: React.FC<QuotedPostProps> = ({ post, isCard = true }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    const handleQuoteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (post.isDeleted) return;
        navigate(`/profile/${post.author.handle}/post/${post.tid || post.id}`);
    };

    if (post.isDeleted) {
        return (
            <div className={`border border-gray-200 dark:border-dark-border rounded-xl bg-gray-50 dark:bg-dark-surface/30 p-4 ${isCard ? 'mt-2 mb-1' : ''}`}>
                <p className="text-[14px] text-gray-500 dark:text-dark-text-secondary italic">
                    {t('post.removed_post_notice', 'Post removed')}
                </p>
            </div>
        );
    }

    return (
        <div
            onClick={handleQuoteClick}
            className={`
                border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden
                ${isCard ? 'mt-1 mb-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface/30 transition-colors' : ''}
            `}
        >
            <div className="p-2.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <Avatar
                        src={post.author.avatarUrl || post.author.avatar}
                        alt={post.author.displayName || post.author.handle || '?'}
                        size="xs"
                        className="w-[18px] h-[18px]"
                    />
                    <div className="flex items-center gap-1 min-w-0 overflow-hidden text-[13px]">
                        <span className="font-bold text-gray-900 dark:text-dark-text truncate">
                            {post.author.displayName || post.author.handle || 'Unknown'}
                        </span>
                        {post.author.isVerified && (
                            <BsPatchCheckFill className="text-blue-500 flex-shrink-0" size={12} />
                        )}
                        <span className="text-gray-500 dark:text-dark-text-secondary truncate">
                            @{post.author.handle}
                        </span>
                        <span className="text-gray-500 dark:text-dark-text-secondary">·</span>
                        <span className="text-gray-500 dark:text-dark-text-secondary flex-shrink-0">
                            {formatPostDate(post.createdAt, i18n.language)}
                        </span>
                    </div>
                </div>

                <RichText
                    content={post.content}
                    facets={post.facets}
                    className="text-[14px] text-gray-800 dark:text-dark-text mb-1.5 leading-snug break-words"
                />

                {post.linkPreview && (
                    <div className="mb-1.5 mt-1">
                        <LinkPreviewCard preview={post.linkPreview} isSmall={true} />
                    </div>
                )}

                {post.quotePost && (
                    <div className="flex items-center gap-1.5 mb-1.5 px-2 py-1.5 bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-dark-border rounded-lg text-[11px] text-gray-500 dark:text-dark-text-secondary">
                        <FiRepeat size={12} />
                        <span>{t('post.quote_post', 'Quote post')}</span>
                    </div>
                )}

                {(post.images?.length || post.imageUrls?.length || post.media?.length || post.video || post.videoUrl) && (
                    <div className="max-h-[200px] overflow-hidden rounded-lg mt-1 border border-gray-100 dark:border-dark-border">
                        <MediaGrid
                            images={post.images}
                            imageUrls={post.imageUrls}
                            media={post.media}
                            video={post.video}
                            videoUrl={post.videoUrl}
                            onImageClick={() => {
                                navigate(`/profile/${post.author.handle}/post/${post.tid || post.id}`);
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuotedPost;
