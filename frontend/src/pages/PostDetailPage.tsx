import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { RootState } from '../redux/store';
import { Post } from '../types';
import { toggleLike, repostPost, bookmarkPost, deletePost, fetchPostById, fetchPostReplies } from '../redux/slices/postsSlice';
import { openReply, openMobileMenu, openEditPost } from '../redux/slices/modalsSlice';
import MainLayout from '../components/layout/MainLayout';
import Avatar from '../components/common/Avatar';
import IconButton from '../components/common/IconButton';
import PostCard from '../components/feed/PostCard';
import MediaGrid from '../components/feed/MediaGrid';
import QuotedPost from '../components/feed/QuotedPost';
import LinkPreviewCard from '../components/common/LinkPreviewCard';
import RichText from '../components/common/RichText';
import Dropdown, { DropdownItem } from '../components/common/Dropdown';
import { showToast } from '../redux/slices/toastSlice';
import { usePostActions } from '../hooks/usePostActions';
import {
    FiArrowLeft,
    FiHeart,
    FiRepeat,
    FiMessageCircle,
    FiShare2,
    FiBookmark,
    FiMoreHorizontal,
    FiSliders,
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
    FiAlertTriangle
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/classNames';
import { followUserAsync, unfollowUserAsync } from '../redux/slices/userSlice';
import { FiCheck, FiPlus, FiTrash2 } from 'react-icons/fi';
import ConfirmModal from '../components/common/ConfirmModal';

import LoadingIndicator from '../components/common/LoadingIndicator';

const PostDetailPage: React.FC = () => {
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t, i18n } = useTranslation();
    const { handleTranslate, handleCopyText, handleCopyLink, handleEmbedPost, openShareModal } = usePostActions();

    const posts = useAppSelector((state: RootState) => state.posts.posts);
    const isLoading = useAppSelector((state: RootState) => state.posts.isLoading);
    const actionLoading = useAppSelector((state: RootState) => state.posts.actionLoading);
    const userActionLoading = useAppSelector((state: RootState) => state.user.actionLoading);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const settings = useAppSelector((state: RootState) => state.auth.settings);
    const sortOrder = settings?.sortReplies || 'top';
    const treeViewEnabled = settings?.treeView || false;
    const post = posts.find((p: Post) => p.id === postId);

    const replies = React.useMemo(() => {
        const filtered = posts.filter((p: Post) => p.replyToPostId === postId);

        return [...filtered].sort((a, b) => {
            if (sortOrder === 'oldest') {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            } else if (sortOrder === 'newest') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            } else {
                // 'top' - Sort by likesCount descending, then by date descending
                if (b.likesCount !== a.likesCount) {
                    return b.likesCount - a.likesCount;
                }
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
        });
    }, [posts, postId, sortOrder]);
    const parentPost = post?.replyToPostId ? posts.find(p => p.id === post.replyToPostId) : null;

    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

    React.useEffect(() => {
        if (postId) {
            if (!post) {
                dispatch(fetchPostById(postId));
            }
            dispatch(fetchPostReplies(postId));
        }
    }, [dispatch, postId, post]);

    React.useEffect(() => {
        if (post?.replyToPostId && !parentPost) {
            dispatch(fetchPostById(post.replyToPostId));
        }
    }, [dispatch, post?.replyToPostId, parentPost]);


    if (!post) {
        if (isLoading) {
            return (
                <MainLayout>
                    <LoadingIndicator text={t('post.loading', { defaultValue: 'Loading post...' })} />
                </MainLayout>
            );
        }
        return (
            <MainLayout hideTopBar={true}>
                <div className="p-4 text-center">
                    <p className="text-gray-500 dark:text-dark-text-secondary">{t('common.post_not_found')}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-4 text-primary-500 hover:underline"
                    >
                        {t('common.go_back')}
                    </button>
                </div>
            </MainLayout>
        );
    }

    const handleBack = () => {
        navigate(-1);
    };

    const handleLike = () => {
        dispatch(toggleLike(post.id));
    };

    const handleRepost = () => {
        dispatch(repostPost(post.id));
    };

    const handleBookmark = () => {
        dispatch(bookmarkPost(post.id));
    };

    const handleDelete = async () => {
        try {
            await dispatch(deletePost(post.id)).unwrap();
            dispatch(showToast({ message: t('common.post_deleted'), type: 'success' }));
            navigate(-1);
        } catch (error: any) {
            dispatch(showToast({ message: error || t('common.failed_to_delete'), type: 'error' }));
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
            hasDivider: true,
            onClick: () => handleCopyText(post.content),
        },
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
            id: 'hide-post',
            label: t('post.hide_post'),
            icon: <FiEyeOff />,
            hasDivider: true,
            onClick: () => { },
        },
        {
            id: 'mute-account',
            label: t('post.mute_account'),
            icon: <FiUserMinus />,
            onClick: () => { },
        },
        {
            id: 'block-account',
            label: t('post.block_account'),
            icon: <FiUserX />,
            onClick: () => { },
        },
        {
            id: 'report-post',
            label: t('post.report_post'),
            icon: <FiAlertTriangle />,
            onClick: () => { },
        },
        ...(currentUser?.id === post.author.id ? [
            {
                id: 'edit-post',
                label: t('common.edit_post', 'Edit post'),
                icon: <FiType />,
                onClick: () => dispatch(openEditPost(post)),
            },
            {
                id: 'delete-post',
                label: t('common.delete_post'),
                icon: <FiTrash2 />,
                danger: true,
                hasDivider: true,
                onClick: () => setShowDeleteConfirm(true),
            }
        ] : []),
    ];

    const dateLocale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

    const handleFollowToggle = async () => {
        if (!currentUser || !post) return;
        try {
            if (post.author.isFollowing) {
                await dispatch(unfollowUserAsync(post.author.id)).unwrap();
                // Optimistically update or re-fetch
                dispatch(fetchPostById(post.id));
            } else {
                await dispatch(followUserAsync(post.author.id)).unwrap();
                dispatch(fetchPostById(post.id));
            }
        } catch (error: any) {
            console.error('Failed to toggle follow:', error);
            dispatch(showToast({ message: error.message || 'Failed to update follow status', type: 'error' }));
        }
    };

    const pageTitle = post.content
        ? (post.content.length > 50 ? post.content.slice(0, 50) + '...' : post.content)
        : t('post.title');

    return (
        <MainLayout hideTopBar={true} title={pageTitle}>
            <div className="min-h-screen">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border">
                    <div className="flex items-center justify-between px-4 py-2">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => dispatch(openMobileMenu())}
                                className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full flex-shrink-0"
                            >
                                <Avatar src={currentUser?.avatar} alt={currentUser?.displayName || 'User'} size="sm" />
                            </button>
                            <IconButton
                                icon={<FiArrowLeft size={20} />}
                                onClick={handleBack}
                                variant="default"
                            />
                            <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                                {t('post.title')}
                            </h1>
                        </div>
                        <IconButton
                            icon={<FiSliders size={20} />}
                            variant="default"
                        />
                    </div>
                </div>

                {/* Thread Parent */}
                {parentPost && (
                    <div className="border-b border-gray-100 dark:border-dark-border/50">
                        <PostCard post={parentPost} />
                        <div className="ml-9 h-4 border-l-2 border-gray-200 dark:border-dark-border" />
                    </div>
                )}

                {/* Main Post */}
                <div className="p-4 border-b border-gray-200 dark:border-dark-border">
                    {/* Author Info */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="cursor-pointer" onClick={(e) => {
                                e.stopPropagation();
                                if (currentUser?.id === post.author.id) {
                                    navigate(`/profile/${post.author.handle}`);
                                } else {
                                    navigate(`/profile/user/${post.author.id}`);
                                }
                            }}>
                                <Avatar
                                    src={post.author.avatarUrl || post.author.avatar}
                                    alt={post.author.displayName}
                                    size="lg"
                                />
                            </div>
                            <div className="flex flex-col cursor-pointer" onClick={(e) => {
                                e.stopPropagation();
                                if (currentUser?.id === post.author.id) {
                                    navigate(`/profile/${post.author.handle}`);
                                } else {
                                    navigate(`/profile/user/${post.author.id}`);
                                }
                            }}>
                                <span className="font-bold text-gray-900 dark:text-dark-text hover:underline">
                                    {post.author.displayName}
                                </span>
                                <span className="text-gray-500 dark:text-dark-text-secondary hover:underline">
                                    @{post.author.handle}
                                </span>
                            </div>
                        </div>
                        {currentUser?.id !== post.author.id && (
                            <button
                                onClick={handleFollowToggle}
                                disabled={userActionLoading[post.author.id]}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-sm font-bold transition-opacity flex items-center gap-1 disabled:opacity-50",
                                    post.author.isFollowing
                                        ? "bg-gray-200 dark:bg-dark-surface text-gray-900 dark:text-dark-text hover:bg-gray-300 dark:hover:bg-dark-surface/80"
                                        : "bg-gray-900 dark:bg-dark-text text-white dark:text-dark-bg hover:opacity-90"
                                )}
                            >
                                {post.author.isFollowing ? (
                                    <>
                                        <FiCheck size={16} />
                                        {t('profile.following_btn')}
                                    </>
                                ) : (
                                    <>
                                        <FiPlus size={16} />
                                        {t('profile.follow')}
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    <RichText
                        content={post.content}
                        className="text-lg text-gray-900 dark:text-dark-text mb-4 whitespace-pre-wrap"
                    />

                    {/* Media */}
                    <div className="mb-4">
                        <MediaGrid
                            images={post.images}
                            imageUrls={post.imageUrls}
                            media={post.media}
                            video={post.video}
                            videoUrl={post.videoUrl}
                            isDetailView={true}
                            onImageClick={(index: number) => {
                                navigate(`/profile/${post.author.handle}/post/${post.id}/media/${index}`);
                            }}
                        />
                    </div>

                    {/* Link Preview */}
                    {post.linkPreview && <LinkPreviewCard preview={post.linkPreview} />}

                    {/* Quoted Post */}
                    {post.quotePost && (
                        <div className="mb-4">
                            <QuotedPost post={post.quotePost} isCard={true} />
                        </div>
                    )}

                    {/* Footer Info */}
                    <div className="flex items-center gap-2 text-gray-500 dark:text-dark-text-secondary text-sm mb-4">
                        <span>{new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>·</span>
                        <span>{new Date(post.createdAt).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                        <span>·</span>
                        <div className="flex items-center gap-1">
                            <FiShare2 size={14} />
                            <span>{
                                post.replyRestriction?.toLowerCase() === 'none' || post.replyRestriction?.toLowerCase() === 'no_one'
                                    ? t('privacy.no_one')
                                    : post.replyRestriction?.toLowerCase() === 'followed'
                                        ? t('moderation.following')
                                        : post.replyRestriction?.toLowerCase() === 'mentioned'
                                            ? t('moderation.mentioned')
                                            : t('post.everyone_can_reply')
                            }</span>
                        </div>
                        <span>·</span>
                        <button
                            onClick={() => handleTranslate(post.content)}
                            className="text-primary-500 hover:underline"
                        >
                            {t('post.translate')}
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 py-3 border-t border-gray-100 dark:border-dark-border/50 text-sm">
                        <div className="flex items-center gap-1">
                            <span className="font-bold text-gray-900 dark:text-dark-text">{post.repostsCount}</span>
                            <span className="text-gray-500 dark:text-dark-text-secondary">{t('post.reposts')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="font-bold text-gray-900 dark:text-dark-text">{post.quotesCount || 0}</span>
                            <span className="text-gray-500 dark:text-dark-text-secondary">{t('post.quotes')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="font-bold text-gray-900 dark:text-dark-text">{post.likesCount}</span>
                            <span className="text-gray-500 dark:text-dark-text-secondary">{t('post.likes')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="font-bold text-gray-900 dark:text-dark-text">{post.bookmarksCount || 0}</span>
                            <span className="text-gray-500 dark:text-dark-text-secondary">{t('post.saves')}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between py-1 border-t border-gray-100 dark:border-dark-border/50">
                        <IconButton
                            icon={<FiMessageCircle size={22} className={post.canReply === false ? 'text-gray-300 dark:text-gray-700' : ''} />}
                            onClick={() => {
                                if (post.canReply === false) {
                                    dispatch(showToast({ message: t('post.replies_disabled'), type: 'info' }));
                                    return;
                                }
                                dispatch(openReply(post));
                            }}
                            variant="default"
                            disabled={post.canReply === false}
                            tooltip={post.canReply === false ? t('post.replies_disabled') : undefined}
                        />
                        <IconButton
                            icon={<FiRepeat size={22} className={post.isReposted ? 'text-primary-500' : ''} />}
                            onClick={handleRepost}
                            disabled={actionLoading[post.id]}
                            variant="default"
                        />
                        <IconButton
                            icon={<FiHeart size={22} className={post.isLiked ? 'fill-red-500 text-red-500' : ''} />}
                            onClick={handleLike}
                            disabled={actionLoading[post.id]}
                            variant="default"
                        />
                        <IconButton
                            icon={<FiBookmark size={22} className={post.isBookmarked ? 'fill-primary-500 text-primary-500' : ''} />}
                            onClick={handleBookmark}
                            disabled={actionLoading[post.id]}
                            variant="default"
                        />
                        <Dropdown
                            trigger={
                                <IconButton
                                    icon={<FiShare2 size={22} />}
                                    variant="default"
                                />
                            }
                            items={shareDropdownItems}
                        />
                        <Dropdown
                            trigger={
                                <IconButton
                                    icon={<FiMoreHorizontal size={22} />}
                                    variant="default"
                                />
                            }
                            items={moreDropdownItems}
                        />
                    </div>
                </div>

                {/* Reply Input */}
                {post.canReply !== false ? (
                    <div
                        onClick={() => dispatch(openReply(post))}
                        className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-dark-border cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                    >
                        <Avatar
                            src={currentUser?.avatar || post.author.avatar}
                            alt="Current user"
                            size="md"
                        />
                        <div className="flex-1 text-gray-500 dark:text-dark-text-secondary">
                            {t('common.reply_placeholder')}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface/30">
                        <p className="text-center text-gray-500 dark:text-dark-text-secondary text-sm italic">
                            {t('post.replies_disabled')}
                        </p>
                    </div>
                )}

                <div className="pb-20">
                    {treeViewEnabled ? (
                        <div className="divide-y divide-gray-100 dark:divide-dark-border/30">
                            {replies.map((reply: Post) => (
                                <div key={reply.id} className="relative">
                                    <PostCard post={reply} isComment={true} />
                                    {/* Sub-replies (Simple 1-level for now) */}
                                    <div className="ml-8 border-l-2 border-gray-100 dark:border-dark-border/30">
                                        {posts
                                            .filter(p => p.replyToPostId === reply.id)
                                            .map(subReply => (
                                                <PostCard key={subReply.id} post={subReply} isComment={true} />
                                            ))
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        replies.map((reply: Post) => (
                            <PostCard key={reply.id} post={reply} isComment={true} />
                        ))
                    )}
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
        </MainLayout>
    );
};

export default PostDetailPage;
