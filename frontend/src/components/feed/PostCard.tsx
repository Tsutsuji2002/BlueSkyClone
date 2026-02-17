import React from 'react';
import { Post } from '../../types';
import ConfirmModal from '../common/ConfirmModal';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { toggleLike, repostPost, bookmarkPost, deletePost } from '../../redux/slices/postsSlice';
import LinkPreviewCard from '../common/LinkPreviewCard';
import { blockUserAsync, muteUserAsync } from '../../redux/slices/userSlice';
import { openReply, openEditPost, openQuote } from '../../redux/slices/modalsSlice';
import QuotedPost from './QuotedPost';
import { showToast } from '../../redux/slices/toastSlice';
import { usePostActions } from '../../hooks/usePostActions';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import Avatar from '../common/Avatar';
import Dropdown, { DropdownItem } from '../common/Dropdown';
import { cn } from '../../utils/classNames';
import { useNavigate, Link } from 'react-router-dom';
import MediaGrid from './MediaGrid';
import { formatPostDate } from '../../utils/formatDate';
import RichText from '../common/RichText';
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
    isInListContext?: boolean;
    onRemoveFromList?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, isOwnPost: isOwnPostProp, isComment = false, isInListContext = false, onRemoveFromList }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { handleTranslate, handleCopyText, handleCopyLink, handleEmbedPost, openShareModal } = usePostActions();
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const isOwnPost = isOwnPostProp ?? (currentUser?.id === post.author.id);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [showRemoveConfirm, setShowRemoveConfirm] = React.useState(false);
    const [isUnmuted, setIsUnmuted] = React.useState(false);
    const actionLoading = useAppSelector((state: RootState) => state.posts.actionLoading);

    const handleCardClick = () => {
        navigate(`/profile/${post.author.handle}/post/${post.id}`);
    };

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log('PostCard handleLike clicked for:', post.id);
        dispatch(toggleLike(post.id));
    };

    const handleRepost = (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log('PostCard handleRepost clicked for:', post.id);
        dispatch(repostPost(post.id));
    };

    const handleBookmark = () => {
        console.log('PostCard handleBookmark clicked for:', post.id);
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

    // Build more dropdown items based on context
    const moreDropdownItems: DropdownItem[] = isInListContext ? [
        // Simplified options for list context
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
            onClick: () => handleCopyText(post.content),
        },
        {
            id: 'copy-link',
            label: t('post.copy_link'),
            icon: <FiLink />,
            onClick: () => handleCopyLink(post.author.handle, post.id),
        },
        ...(onRemoveFromList ? [
            { id: 'divider-remove-list', label: '', icon: null, onClick: () => { }, hasDivider: true },
            {
                id: 'remove-from-list',
                label: t('lists.remove_from_list'),
                icon: <FiTrash2 />,
                onClick: () => setShowRemoveConfirm(true),
                danger: true,
            }
        ] : []),
    ] : [
        // Full options for normal context
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
        ...(!isOwnPost ? [
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
        ] : []),
        ...(onRemoveFromList ? [
            { id: 'divider-remove-list', label: '', icon: null, onClick: () => { }, hasDivider: true },
            {
                id: 'remove-from-list',
                label: t('lists.remove_from_list'),
                icon: <FiTrash2 />,
                onClick: () => setShowRemoveConfirm(true),
                danger: true,
            }
        ] : []),
        ...(isOwnPost ? [
            { id: 'divider-own', label: '', icon: null, onClick: () => { }, hasDivider: true },
            {
                id: 'edit',
                label: t('common.edit_post', 'Edit post'),
                icon: <FiType />, // Reusing FiType or specific edit icon like FiEdit
                onClick: () => dispatch(openEditPost(post)),
            },
            {
                id: 'delete',
                label: t('common.delete_post'),
                icon: <FiTrash2 />,
                onClick: () => setShowDeleteConfirm(true),
                danger: true,
            }
        ] : []),
    ];

    if (post.muteInfo?.isMuted && post.muteInfo?.behavior === 'warn' && !isUnmuted) {
        return (
            <div
                className="border-b border-gray-200 dark:border-dark-border p-6 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-dark-surface/30 group cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setIsUnmuted(true); }}
            >
                <div className="flex items-center gap-3 text-gray-500 dark:text-dark-text-secondary mb-3">
                    <FiEyeOff size={24} className="group-hover:text-primary-500 transition-colors" />
                    <span className="font-medium">
                        {t('post.muted_by_word', 'Post hidden by your muted word')}: <span className="font-bold text-gray-700 dark:text-dark-text">{post.muteInfo.reason}</span>
                    </span>
                </div>
                <button
                    className="px-6 py-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-full text-sm font-bold shadow-sm hover:bg-gray-100 dark:hover:bg-dark-bg transition-all"
                    onClick={(e) => { e.stopPropagation(); setIsUnmuted(true); }}
                >
                    {t('post.show_anyway', 'Show anyway')}
                </button>
            </div>
        );
    }

    return (
        <div
            className="border-b border-gray-200 dark:border-dark-border p-4 hover:bg-gray-100/50 dark:hover:bg-dark-surface/50 transition-colors cursor-pointer"
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
                            <span>{t('messages.replying_to_prefix')}</span>
                            <Link
                                to={`/profile/${post.replyToHandle}`}
                                className="text-primary-500 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                @{post.replyToHandle}
                            </Link>
                        </div>
                    )}

                    {/* Curated List Caption - Removed to avoid duplication as requested */}

                    {/* Post Content */}

                    <RichText
                        content={post.content}
                        className="text-[15px] text-gray-900 dark:text-dark-text mb-3 whitespace-pre-wrap break-words break-all leading-normal"
                    />

                    {post.linkPreview && <LinkPreviewCard preview={post.linkPreview} />}

                    {post.quotePost && (
                        <div onClick={(e) => e.stopPropagation()}>
                            <QuotedPost post={post.quotePost} />
                        </div>
                    )}

                    {/* Media */}
                    <div className="mb-3">
                        <MediaGrid
                            images={post.images}
                            imageUrls={post.imageUrls}
                            video={post.video}
                            videoUrl={post.videoUrl}
                            onImageClick={(index: number) => {
                                // If clicking a video (always at index 0 when present), go to post detail
                                const hasVideo = post.video || post.videoUrl;
                                if (hasVideo && index === 0) {
                                    navigate(`/profile/${post.author.handle}/post/${post.id}`);
                                } else {
                                    navigate(`/profile/${post.author.handle}/post/${post.id}/media/${index}`);
                                }
                            }}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-10">
                            <button
                                className={cn(
                                    "flex items-center gap-2 group transition-colors",
                                    post.canReply === false
                                        ? "text-gray-300 dark:text-gray-700 cursor-not-allowed"
                                        : "text-gray-500 dark:text-dark-text-secondary hover:text-blue-500"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (post.canReply === false) {
                                        dispatch(showToast({ message: t('post.replies_disabled'), type: 'info' }));
                                        return;
                                    }
                                    dispatch(openReply(post));
                                }}
                                title={post.canReply === false ? t('post.replies_disabled') : undefined}
                            >
                                <FiMessageCircle size={18} />
                                <span className="text-[13px]">{post.repliesCount}</span>
                            </button>

                            <div onClick={(e) => e.stopPropagation()}>
                                <Dropdown
                                    trigger={
                                        <button
                                            disabled={actionLoading[post.id]}
                                            className={cn(
                                                "flex items-center gap-2 group transition-colors disabled:opacity-50",
                                                post.isReposted ? "text-green-500" : "text-gray-500 dark:text-dark-text-secondary hover:text-green-500"
                                            )}
                                        >
                                            <FiRepeat size={18} className={post.isReposted ? "fill-current" : ""} />
                                            <span className="text-[13px]">{post.repostsCount}</span>
                                        </button>
                                    }
                                    items={[
                                        {
                                            id: 'repost',
                                            label: post.isReposted ? t('post.undo_repost', 'Undo repost') : t('post.repost', 'Repost'),
                                            icon: <FiRepeat />,
                                            onClick: () => dispatch(repostPost(post.id))
                                        },
                                        {
                                            id: 'quote',
                                            label: t('post.quote_post', 'Quote post'),
                                            icon: <FiType />,
                                            onClick: () => dispatch(openQuote(post))
                                        }
                                    ]}
                                    align="left"
                                />
                            </div>

                            <button
                                onClick={handleLike}
                                disabled={actionLoading[post.id]}
                                className={cn(
                                    "flex items-center gap-2 group transition-colors disabled:opacity-50",
                                    post.isLiked ? "text-red-500" : "text-gray-500 dark:text-dark-text-secondary hover:text-red-500"
                                )}
                            >
                                <FiHeart size={18} className={post.isLiked ? "fill-current" : ""} />
                                <span className="text-[13px]">{post.likesCount > 1000 ? `${(post.likesCount / 1000).toFixed(1)} ${t('common.user').startsWith('N') ? 'N' : 'K'}` : post.likesCount}</span>
                            </button>

                            <button
                                onClick={(e) => { e.stopPropagation(); handleBookmark(); }}
                                disabled={actionLoading[post.id]}
                                className={cn(
                                    "flex items-center transition-colors disabled:opacity-50",
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

            {/* Remove from List Confirmation */}
            <ConfirmModal
                isOpen={showRemoveConfirm}
                title={t('lists.remove_from_list')}
                message={t('lists.confirm_remove_post', 'Remove this post from the list?')}
                onConfirm={() => {
                    onRemoveFromList?.();
                }}
                onClose={() => setShowRemoveConfirm(false)}
            />
        </div>
    );
};

export default PostCard;
