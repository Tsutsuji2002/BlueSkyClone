import React from 'react';
import { Post } from '../../types';
import Avatar from '../common/Avatar';
import { formatPostDate } from '../../utils/formatDate';
import { useTranslation } from 'react-i18next';
import RichText from '../common/RichText';
import MediaGrid from './MediaGrid';

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
                    className="text-[14px] text-gray-800 dark:text-dark-text mb-2 line-clamp-3 leading-tight"
                />

                {(post.images?.length || post.imageUrls?.length || post.video || post.videoUrl) && (
                    <div className="max-h-[200px] overflow-hidden rounded-lg">
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
