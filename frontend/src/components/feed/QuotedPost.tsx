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
        if (post.isDeleted || !post.uri) return;
        const postShortId = post.uri.split('/').pop();
        navigate(`/profile/${post.author.handle}/post/${postShortId}`);
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
                ${isCard ? 'mt-2 mb-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface/30 transition-colors' : ''}
            `}
        >
            <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                    <Avatar
                        src={post.author.avatarUrl || post.author.avatar}
                        alt={post.author.displayName}
                        size="xs"
                    />
                    <span className="font-bold text-[14px] text-gray-900 dark:text-dark-text truncate flex items-center gap-0.5">
                        {post.author.displayName}
                        {post.author.isVerified && (
                            <BsPatchCheckFill className="text-blue-500 flex-shrink-0" size={13} />
                        )}
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

                {(post.images?.length || post.imageUrls?.length || post.media?.length || post.video || post.videoUrl) && (
                    <div className="max-h-[260px] overflow-hidden rounded-lg mt-1 border border-gray-100 dark:border-dark-border">
                        <MediaGrid
                            images={post.images}
                            imageUrls={post.imageUrls}
                            media={post.media}
                            video={post.video}
                            videoUrl={post.videoUrl}
                            onImageClick={() => {
                                if (post.uri) {
                                    const postShortId = post.uri.split('/').pop();
                                    navigate(`/profile/${post.author.handle}/post/${postShortId}`);
                                }
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuotedPost;
