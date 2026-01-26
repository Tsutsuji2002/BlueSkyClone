import React from 'react';
import { Post } from '../../types';
import ConfirmModal from '../common/ConfirmModal';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { toggleLike, repostPost, bookmarkPost, deletePost } from '../../redux/slices/postsSlice';
import LinkPreviewCard from '../common/LinkPreviewCard';
import { blockUserAsync, muteUserAsync } from '../../redux/slices/userSlice';
import { openImageViewer, openReply } from '../../redux/slices/modalsSlice';
import { showToast } from '../../redux/slices/toastSlice';
import { usePostActions } from '../../hooks/usePostActions';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import Avatar from '../common/Avatar';
import IconButton from '../common/IconButton';
import Dropdown, { DropdownItem } from '../common/Dropdown';
import { cn } from '../../utils/classNames';
import { useNavigate, Link } from 'react-router-dom';
import MediaGrid from './MediaGrid';
import { formatPostDate } from '../../utils/formatDate';
import RichText from '../common/RichText';

import { formatDistanceToNowStrict } from 'date-fns';
import { vi, enUS, ja, ko, zhCN, es, fr, de } from 'date-fns/locale';
import {
    FiHeart,
    FiRepeat,
    FiMessageCircle,
    FiShare2,
    FiMoreHorizontal,
    FiBookmark,
    FiLink,
    FiSend,
    FiCode,
    FiHelpCircle,
    FiType,
    FiSmile,
    FiFrown,
    FiBellOff,
    FiFilter,
    FiEyeOff,
    FiUserMinus,
    FiUserX,
    FiAlertTriangle,
    FiTrash2
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

interface PostCardProps {
    post: Post;
    isOwnPost?: boolean;
    isComment?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ post, isOwnPost = false, isComment = false }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { handleTranslate, handleCopyText, handleCopyLink, handleEmbedPost, openShareModal } = usePostActions();
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

    const handleCardClick = () => {
        navigate(`/profile/${post.author.handle}/post/${post.id}`);
    };

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(toggleLike(post.id));
    };

    const handleRepost = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(repostPost(post.id));
    };

    const handleBookmark = () => {
        dispatch(bookmarkPost(post.id));
    };

    const handleDelete = async () => {
        try {
            await dispatch(deletePost(post.id)).unwrap();
            dispatch(showToast({ message: t('common.post_deleted'), type: 'success' }));
        } catch (error: any) {
            dispatch(showToast({ message: error || t('common.failed_to_delete'), type: 'error' }));
        }
    };

    const handleImageClick = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        const imagesToView = post.imageUrls || post.images?.map(img => img.url) || [];
        if (imagesToView.length > 0) {
            dispatch(openImageViewer({
                images: imagesToView,
                index
            }));
        }
    };

    const handleAvatarClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentUser?.id === post.author.id) {
            navigate(`/profile/${post.author.handle}`);
        } else {
            navigate(`/profile/user/${post.author.id}`);
        }
    };

    const shareDropdownItems: DropdownItem[] = [
        {
            id: 'copy-link',
            label: t('post.copy_link'),
            icon: <FiLink />,
            onClick: () => handleCopyLink(post.author.handle, post.id),
        },
        {
            id: 'send-message',
            label: t('post.send_via_message'),
            icon: <FiSend />,
            onClick: () => openShareModal(post),
        },
        {
            id: 'embed',
            label: t('post.embed_post'),
            icon: <FiCode />,
            onClick: () => handleEmbedPost(post.author.handle, post.id, post.content),
        },
    ];

    const moreDropdownItems: DropdownItem[] = [
        {
            id: 'translate',
            label: t('post.translate'),
            icon: <FiHelpCircle />,
            onClick: () => handleTranslate(post.content),
        },
        {
            id: 'copy-text',
            label: t('post.copy_text'),
            icon: <FiType />,
            hasDivider: !isComment,
            onClick: () => handleCopyText(post.content),
        },
        ...(!isComment ? [
            {
                id: 'show-more',
                label: t('post.show_more'),
                icon: <FiSmile />,
                onClick: () => { },
            },
            {
                id: 'show-less',
                label: t('post.show_less'),
                icon: <FiFrown />,
                hasDivider: true,
                onClick: () => { },
            },
        ] : []),
        {
            id: 'mute-thread',
            label: t('post.mute_thread'),
            icon: <FiBellOff />,
            onClick: () => { },
        },
        {
            id: 'hide-words',
            label: t('post.hide_words'),
            icon: <FiFilter />,
            hasDivider: true,
            onClick: () => { },
        },
        {
            id: isComment ? 'hide-reply' : 'hide-post',
            label: isComment ? t('post.hide_reply') : t('post.hide_post'),
            icon: <FiEyeOff />,
            hasDivider: true,
            onClick: () => { },
        },
        {
            id: 'mute-account',
            label: t('post.mute_account'),
            icon: <FiUserMinus />,
            onClick: () => {
                dispatch(muteUserAsync(post.author.id));
                dispatch(showToast({ message: t('profile.muted_success'), type: 'success' }));
            },
        },
        {
            id: 'block-account',
            label: t('post.block_account'),
            icon: <FiUserX />,
            onClick: () => {
                dispatch(blockUserAsync(post.author.id));
                dispatch(showToast({ message: t('profile.blocked_success'), type: 'success' }));
            },
        },
        {
            id: 'report-post',
            label: t('post.report_post'),
            icon: <FiAlertTriangle />,
            onClick: () => { },
        },
        ...(isOwnPost ? [
            { id: 'divider-own', label: '', icon: null, onClick: () => { }, hasDivider: true },
            {
                id: 'delete',
                label: t('common.delete_post'),
                icon: <FiTrash2 />,
                onClick: () => setShowDeleteConfirm(true),
                danger: true,
            }
        ] : []),
    ];

    return (
        <div
            className="border-b border-gray-200 dark:border-dark-border p-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors cursor-pointer"
            onClick={handleCardClick}
        >
            <div className="flex gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0" onClick={handleAvatarClick}>
                    <Avatar
                        src={post.author.avatarUrl || post.author.avatar}
                        alt={post.author.displayName}
                        size="md"
                    />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                            className="font-bold text-[15px] text-gray-900 dark:text-dark-text truncate hover:underline"
                            onClick={handleAvatarClick}
                        >
                            {post.author.displayName}
                        </span>
                        <span className="text-[15px] text-gray-500 dark:text-dark-text-secondary truncate">
                            @{post.author.handle}
                        </span>
                        <span className="text-[15px] text-gray-500 dark:text-dark-text-secondary">·</span>
                        <span className="text-[15px] text-gray-500 dark:text-dark-text-secondary whitespace-nowrap">
                            {formatPostDate(post.createdAt, i18n.language)}
                        </span>
                    </div>

                    {/* Replying to Context */}
                    {post.replyToHandle && !isComment && (
                        <div className="flex items-center gap-1 mb-1 text-[15px] text-gray-500 dark:text-dark-text-secondary">
                            <FiMessageCircle size={14} className="mt-0.5" />
                            <span>{t('messages.replying_to', { name: '' }).replace(' {{name}}', '').replace('{{name}}', '')}</span>
                            <Link
                                to={`/profile/${post.replyToHandle}`}
                                className="text-primary-500 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                @{post.replyToHandle}
                            </Link>
                        </div>
                    )}

                    {/* Post Content */}

                    <RichText
                        content={post.content}
                        className="text-[15px] text-gray-900 dark:text-dark-text mb-3 whitespace-pre-wrap break-words leading-normal"
                    />

                    {post.linkPreview && <LinkPreviewCard preview={post.linkPreview} />}

                    {/* Media */}
                    <div className="mb-3">
                        <MediaGrid
                            images={post.images}
                            imageUrls={post.imageUrls}
                            video={post.video}
                            videoUrl={post.videoUrl}
                            onImageClick={(index) => {
                                const baseMedia = post.imageUrls || post.images?.map(img => img.url) || [];
                                const imagesToView = post.videoUrl ? [post.videoUrl, ...baseMedia] : baseMedia;

                                if (imagesToView.length > 0) {
                                    dispatch(openImageViewer({
                                        images: imagesToView,
                                        index
                                    }));
                                }
                            }}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-10">
                            <button
                                className="flex items-center gap-2 group text-gray-500 dark:text-dark-text-secondary hover:text-blue-500 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    dispatch(openReply(post));
                                }}
                            >
                                <FiMessageCircle size={18} />
                                <span className="text-[13px]">{post.repliesCount}</span>
                            </button>

                            <button
                                onClick={handleRepost}
                                className={cn(
                                    "flex items-center gap-2 group transition-colors",
                                    post.isReposted ? "text-green-500" : "text-gray-500 dark:text-dark-text-secondary hover:text-green-500"
                                )}
                            >
                                <FiRepeat size={18} className={post.isReposted ? "fill-current" : ""} />
                                <span className="text-[13px]">{post.repostsCount}</span>
                            </button>

                            <button
                                onClick={handleLike}
                                className={cn(
                                    "flex items-center gap-2 group transition-colors",
                                    post.isLiked ? "text-red-500" : "text-gray-500 dark:text-dark-text-secondary hover:text-red-500"
                                )}
                            >
                                <FiHeart size={18} className={post.isLiked ? "fill-current" : ""} />
                                <span className="text-[13px]">{post.likesCount > 1000 ? `${(post.likesCount / 1000).toFixed(1)} N` : post.likesCount}</span>
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); handleBookmark(); }}
                                className={cn(
                                    "flex items-center transition-colors",
                                    post.isBookmarked ? "text-primary-500" : "text-gray-500 dark:text-dark-text-secondary hover:text-primary-500"
                                )}
                            >
                                <FiBookmark size={18} className={post.isBookmarked ? "fill-current" : ""} />
                            </button>

                            <div onClick={(e) => e.stopPropagation()}>
                                <Dropdown
                                    trigger={
                                        <button className="flex items-center text-gray-500 dark:text-dark-text-secondary hover:text-primary-500 transition-colors">
                                            <FiShare2 size={18} />
                                        </button>
                                    }
                                    items={shareDropdownItems}
                                    align="right"
                                />
                            </div>
                        </div>

                        <div onClick={(e) => e.stopPropagation()}>
                            <Dropdown
                                trigger={
                                    <button className="flex items-center text-gray-500 dark:text-dark-text-secondary hover:text-primary-500 transition-colors">
                                        <FiMoreHorizontal size={18} />
                                    </button>
                                }
                                items={moreDropdownItems}
                                align="right"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title={t('common.delete_post_confirm_title', { defaultValue: 'Delete post?' })}
                message={t('common.delete_post_confirm_message', { defaultValue: 'This cannot be undone. The post will be removed from your profile, the timeline of any accounts that follow you, and from search results.' })}
                confirmLabel={t('common.delete', { defaultValue: 'Delete' })}
                variant="danger"
            />
        </div>
    );
};

export default PostCard;
