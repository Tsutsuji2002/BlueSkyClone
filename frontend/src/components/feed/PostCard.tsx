import React from 'react';
import { Post } from '../../types';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { toggleLike, repostPost, toggleBookmark } from '../../redux/slices/postsSlice';
import LinkPreviewCard from '../common/LinkPreviewCard';
import { blockUserAsync, muteUserAsync } from '../../redux/slices/userSlice';
import { openReply, openEditPost, openQuote, openDeleteConfirm, openReport } from '../../redux/slices/modalsSlice';
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
    FiTrash2,
    FiHash,
    FiX
} from 'react-icons/fi';
import { BsPatchCheckFill } from 'react-icons/bs';
import { useTranslation } from 'react-i18next';

interface PostCardProps {
    post: Post;
    isOwnPost?: boolean;
    isComment?: boolean;
    isInListContext?: boolean;
    onRemoveFromList?: () => void;
    // Thread UI
    hasTopLine?: boolean;
    hasBottomLine?: boolean;
    hideBorder?: boolean;
    indentFactor?: number;
}

const PostCard: React.FC<PostCardProps> = React.memo(({ post, isOwnPost: isOwnPostProp, isComment = false, isInListContext = false, onRemoveFromList, hasTopLine, hasBottomLine, hideBorder, indentFactor }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { handleTranslate, handleCopyText, handleCopyLink, handleEmbedPost, openShareModal, primaryLangName } = usePostActions();
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const isOwnPost = isOwnPostProp ?? (currentUser?.id === post.author.id);
    const [isUnmuted, setIsUnmuted] = React.useState(false);
    const [isExpanded, setIsExpanded] = React.useState(false);
    const actionLoading = useAppSelector((state: RootState) => state.posts.actionLoading);

    const handleCardClick = () => {
        navigate(`/profile/${post.author.handle}/post/${post.tid || post.id}`);
    };

    // handleBookmark removed as not supported by standard BSky lexicons yet


    const handleAvatarClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/profile/${post.author.handle}`);
    };

    const shareDropdownItems: DropdownItem[] = [
        {
            id: 'copy-link',
            label: t('post.copy_link'),
            icon: <FiLink />,
            onClick: () => handleCopyLink(post.author.handle, post.tid || post.id),
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
            onClick: () => handleEmbedPost(post.author.handle, post.tid || post.id, post.content),
        },
    ];

    // Build more dropdown items based on context
    const moreDropdownItems: DropdownItem[] = isInListContext ? [
        // Simplified options for list context
        {
            id: 'translate',
            label: `${t('post.translate')} → ${primaryLangName}`,
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
            onClick: () => handleCopyLink(post.author.handle, post.tid || post.id),
        },
        ...(onRemoveFromList ? [
            { id: 'divider-remove-list', label: '', icon: null, onClick: () => { }, hasDivider: true },
            {
                id: 'remove-from-list',
                label: t('lists.remove_from_list'),
                icon: <FiTrash2 />,
                onClick: () => dispatch(openDeleteConfirm({ postUri: post.uri!, isListRemoval: true, onConfirm: onRemoveFromList })),
                danger: true,
            }
        ] : []),
    ] : [
        // Full options for normal context
        {
            id: 'translate',
            label: `${t('post.translate')} → ${primaryLangName}`,
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
        ...(!isComment && !isOwnPost ? [
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
        ...(!isOwnPost ? [
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
                onClick: () => dispatch(openReport({ 
                    uri: post.uri, 
                    cid: post.cid, 
                    type: isComment ? 'comment' : 'post' 
                })),
            },
        ] : []),
        ...(onRemoveFromList ? [
            { id: 'divider-remove-list', label: '', icon: null, onClick: () => { }, hasDivider: true },
            {
                id: 'remove-from-list',
                label: t('lists.remove_from_list'),
                icon: <FiTrash2 />,
                onClick: () => dispatch(openDeleteConfirm({ postUri: post.uri!, isListRemoval: true, onConfirm: onRemoveFromList })),
                danger: true,
            }
        ] : []),
        ...(isOwnPost ? [
            { id: 'divider-own', label: '', icon: null, onClick: () => { }, hasDivider: true },
            {
                id: 'edit',
                label: t('common.edit_post', 'Edit Post'),
                icon: <FiType />,
                onClick: () => dispatch(openEditPost(post)),
            },
            {
                id: 'delete',
                label: t('common.delete_post'),
                icon: <FiTrash2 />,
                onClick: () => dispatch(openDeleteConfirm({ postUri: post.uri! })),
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

    if (post.isDeleted) {
        return (
            <div className={cn(
                "p-4 flex items-center gap-3 bg-gray-50/50 dark:bg-dark-surface/10",
                hideBorder ? "" : "border-b border-gray-200 dark:border-dark-border"
            )}>
                <div className="w-10 flex flex-col items-center relative">
                    {hasTopLine && <div className="absolute top-[-16px] w-[2px] h-[16px] bg-gray-200 dark:bg-dark-border" />}
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-dark-surface flex items-center justify-center z-10">
                        <FiTrash2 className="text-gray-400" size={20} />
                    </div>
                    {hasBottomLine && <div className="absolute top-[40px] bottom-[-16px] w-[2px] bg-gray-200 dark:bg-dark-border" />}
                </div>
                <div className="flex-1 py-2">
                    <p className="text-[15px] text-gray-500 dark:text-dark-text-secondary italic">
                        {t('post.removed_post_notice', 'Post removed')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "hover:bg-gray-100/50 dark:hover:bg-dark-surface/50 transition-colors cursor-pointer",
                hideBorder ? "" : "border-b border-gray-200 dark:border-dark-border"
            )}
            onClick={handleCardClick}
        >
            {/* Repost Banner */}
            {(post.isReposted || post.repostedBy) && (
                <div
                    className="flex items-center gap-2 px-4 pt-3 pb-0 ml-8 text-[13px] text-gray-500 dark:text-dark-text-secondary font-semibold hover:underline cursor-pointer transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        const handle = post.repostedBy?.handle || currentUser?.handle;
                        if (handle) navigate(`/profile/${handle}`);
                    }}
                >
                    <FiRepeat size={14} className={post.isReposted ? "text-green-500" : "text-gray-500"} />
                    <span>
                        {post.repostedBy && post.repostedBy.id !== currentUser?.id
                            ? t('post.reposted_by', { name: post.repostedBy.displayName || post.repostedBy.handle || 'Unknown' })
                            : t('post.reposted_by_you', 'Reposted by you')}
                    </span>
                </div>
            )}
            {/* Feed Banner */}
            {post.listCaption && (
                <div
                    className="flex items-center gap-2 px-4 pt-3 pb-0 ml-8 text-[13px] text-gray-500 dark:text-dark-text-secondary font-semibold transition-colors"
                >
                    <FiHash size={14} className="text-gray-500" />
                    <span>{post.listCaption}</span>
                </div>
            )}
            <div
                className={cn("p-4 pt-3", isComment && "pb-3")}
                style={{ paddingLeft: indentFactor ? `${16 + indentFactor * 32}px` : undefined }}
            >
                <div className="flex gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 relative flex flex-col items-center">
                        {hasTopLine && (
                            <div className="absolute top-[-12px] bottom-[auto] w-[2px] h-[12px] bg-gray-200 dark:bg-dark-border z-0" />
                        )}
                        <div className="z-10 bg-white dark:bg-dark-bg cursor-pointer rounded-full flex-shrink-0" onClick={handleAvatarClick}>
                            <Avatar
                                src={post.author.avatarUrl || post.author.avatar}
                                alt={post.author.displayName || post.author.handle || '?'}
                                size="md"
                            />
                        </div>
                        {hasBottomLine && (
                            <div className="absolute top-[40px] bottom-[-12px] w-[2px] bg-gray-200 dark:bg-dark-border z-0" />
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span
                                className="font-bold text-[15px] text-gray-900 dark:text-dark-text truncate hover:underline flex items-center gap-0.5"
                                onClick={handleAvatarClick}
                            >
                                {post.author.displayName || post.author.handle || 'Unknown'}
                                {post.author.isVerified && (
                                    <BsPatchCheckFill className="text-blue-500 flex-shrink-0" size={14} />
                                )}
                            </span>
                            <span className="text-[15px] text-gray-500 dark:text-dark-text-secondary truncate">
                                @{post.author.handle}
                            </span>
                            <span className="text-[15px] text-gray-500 dark:text-dark-text-secondary">·</span>
                            <span className="text-[15px] text-gray-500 dark:text-dark-text-secondary whitespace-nowrap">
                                {formatPostDate(post.createdAt, i18n.language)}
                            </span>
                        </div>



                        {/* Curated List Caption - Removed to avoid duplication as requested */}

                        {/* Post Content */}
                        {(() => {
                            const isLongContent = post.content && (post.content.length > 400 || post.content.split('\n').length > 6);
                            return (
                                <>
                                    <div className={cn(
                                        "text-[15px] text-gray-900 dark:text-dark-text whitespace-pre-wrap break-words break-all leading-normal",
                                        !isExpanded && isLongContent ? "line-clamp-6" : "",
                                        isLongContent ? "mb-1" : "mb-3"
                                    )}>
                                        <RichText content={post.content} facets={post.facets} />
                                    </div>
                                    {isLongContent && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                                            className="text-primary-500 hover:underline text-[14px] mb-3 font-medium text-left -mt-1 block"
                                        >
                                            {isExpanded ? t('post.show_less', 'Show less') : t('post.show_more', 'Show more')}
                                        </button>
                                    )}
                                </>
                            );
                        })()}

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
                                media={post.media}
                                video={post.video}
                                videoUrl={post.videoUrl}
                                onImageClick={(index: number) => {
                                    navigate(`/profile/${post.author.handle}/post/${post.tid || post.id}/media/${index}`);
                                }}
                            />
                        </div>

                        {/* Interaction Status */}

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
                                                disabled={!!actionLoading[post.uri!]}
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
                                                onClick: () => dispatch(repostPost({ uri: post.uri!, cid: post.cid!, isReposted: !!post.isReposted }))
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch(toggleLike({ uri: post.uri!, cid: post.cid!, isLiked: !!post.isLiked }));
                                    }}
                                    disabled={!!actionLoading[post.uri!]}
                                    className={cn(
                                        "flex items-center gap-2 group transition-colors disabled:opacity-50",
                                        post.isLiked ? "text-red-500" : "text-gray-500 dark:text-dark-text-secondary hover:text-red-500"
                                    )}
                                >
                                    <FiHeart size={18} className={post.isLiked ? "fill-current" : ""} />
                                    <span className="text-[13px]">{post.likesCount > 1000 ? `${(post.likesCount / 1000).toFixed(1)} ${t('common.user').startsWith('N') ? 'N' : 'K'}` : post.likesCount}</span>
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch(toggleBookmark({ uri: post.uri!, isBookmarked: !!post.isBookmarked }));
                                    }}
                                    disabled={!!actionLoading[post.uri!]}
                                    className={cn(
                                        "flex items-center gap-2 group transition-colors disabled:opacity-50",
                                        post.isBookmarked ? "text-yellow-500" : "text-gray-500 dark:text-dark-text-secondary hover:text-yellow-500"
                                    )}
                                >
                                    <FiBookmark size={18} className={post.isBookmarked ? "fill-current" : ""} />
                                    <span className="text-[13px]">{post.bookmarksCount}</span>
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

            </div >
        </div >
    );
});

export default PostCard;
