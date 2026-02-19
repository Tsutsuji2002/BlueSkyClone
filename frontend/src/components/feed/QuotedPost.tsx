import React from 'react';
import { Post } from '../../types';
import Avatar from '../common/Avatar';
import { formatPostDate } from '../../utils/formatDate';
import { useTranslation } from 'react-i18next';
import RichText from '../common/RichText';
import MediaGrid from './MediaGrid';
import LinkPreviewCard from '../common/LinkPreviewCard';
import { FiRepeat } from 'react-icons/fi';

interface QuotedPostProps {
    post: Post;
    isCard?: boolean; // If true, rendering inside a PostCard (needs border/padding)
}

const QuotedPost: React.FC<QuotedPostProps> = ({ post, isCard = true }) => {
    const { i18n } = useTranslation();

    return (
        <div className={`
            border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden
            ${isCard ? 'mt-2 mb-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface/30' : ''}
        `}>
            <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                    <Avatar
                        src={post.author.avatarUrl || post.author.avatar}
                        alt={post.author.displayName}
                        size="xs"
                    />
                    <span className="font-bold text-[14px] text-gray-900 dark:text-dark-text truncate">
                        {post.author.displayName}
                    </span>
                    <span className="text-[14px] text-gray-500 dark:text-dark-text-secondary truncate">
                        @{post.author.handle}
                    </span>
                    <span className="text-[14px] text-gray-500 dark:text-dark-text-secondary">·</span>
                    <span className="text-[14px] text-gray-500 dark:text-dark-text-secondary">
                        {formatPostDate(post.createdAt, i18n.language)}
                    </span>
                </div>

                <RichText
                    content={post.content}
                    className="text-[14px] text-gray-800 dark:text-dark-text mb-2 leading-snug break-words"
                />

                {post.linkPreview && (
                    <div className="mb-2 mt-1">
                        <LinkPreviewCard preview={post.linkPreview} isSmall={true} />
                    </div>
                )}

                {post.quotePost && (
                    <div className="flex items-center gap-1.5 mb-2 px-3 py-2 bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-dark-border rounded-lg text-[12px] text-gray-500 dark:text-dark-text-secondary">
                        <FiRepeat size={14} />
                        <span>{t('post.quote_post', 'Quote post')}</span>
                    </div>
                )}

                {(post.images?.length || post.imageUrls?.length || post.video || post.videoUrl) && (
                    <div className="max-h-[260px] overflow-hidden rounded-lg mt-1 border border-gray-100 dark:border-dark-border">
                        <MediaGrid
                            images={post.images}
                            imageUrls={post.imageUrls}
                            video={post.video}
                            videoUrl={post.videoUrl}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuotedPost;
