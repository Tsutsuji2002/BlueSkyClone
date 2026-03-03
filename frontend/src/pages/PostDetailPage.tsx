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

const ThreadMoreReplies = ({ count, onClick, t }: { count: number, onClick: () => void, t: any }) => (
    <div
        className="flex items-center gap-1.5 px-4 pb-3 pt-0 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-dark-surface/30 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg group transition-colors"
        onClick={(e) => {
            e.stopPropagation();
            onClick();
        }}
    >
        {/* ⊕ circle icon matching Bluesky style */}
        <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-gray-400 dark:border-gray-500 flex items-center justify-center flex-shrink-0 ml-[11px]">
            <FiPlus className="text-gray-400 dark:text-gray-500 w-2.5 h-2.5" strokeWidth={3} />
        </div>
        <span className="text-gray-500 dark:text-gray-400 text-[13px] group-hover:underline">
            {count === 1
                ? t('post.read_more_reply')
                : t('post.read_more_replies', { count })}
        </span>
    </div>
);

const PostDetailPage: React.FC = () => {
    const { postId } = useParams<{ postId: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t, i18n } = useTranslation();
    const { handleTranslate, handleCopyText, handleCopyLink, handleEmbedPost, openShareModal, primaryLangName } = usePostActions();

    const posts = useAppSelector((state: RootState) => state.posts.posts);
    const isLoading = useAppSelector((state: RootState) => state.posts.isLoading);
    const actionLoading = useAppSelector((state: RootState) => state.posts.actionLoading);
    const userActionLoading = useAppSelector((state: RootState) => state.user.actionLoading);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const settings = useAppSelector((state: RootState) => state.auth.settings);
    const sortOrder = settings?.sortReplies || 'top';
    const treeViewEnabled = settings?.treeView || false;
    const post = posts.find((p: Post) => p.id === postId);

    // Helper to sort a list of posts by current sortOrder
    const sortPosts = React.useCallback((arr: Post[]) => {
        return [...arr].sort((a, b) => {
            if (sortOrder === 'oldest') {
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            } else if (sortOrder === 'newest') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            } else {
                if (b.likesCount !== a.likesCount) return b.likesCount - a.likesCount;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
        });
    }, [sortOrder]);

    const replies = React.useMemo(() => {
        const filtered = posts.filter((p: Post) => p.replyToPostId === postId);
        return sortPosts(filtered);
    }, [posts, postId, sortPosts]);
    const ancestors = React.useMemo(() => {
        const list: Post[] = [];
        if (!post) return list;
        let current: Post | undefined = post;
        while (current?.replyToPostId) {
            const replyToId: string = current.replyToPostId!;
            const found: Post | undefined = posts.find((p: Post) => p.id === replyToId);
            if (found) {
                list.unshift(found);
                current = found;
            } else {
                break;
            }
        }
        return list;
    }, [posts, post]);
    const parentPost = ancestors.length > 0 ? ancestors[ancestors.length - 1] : null;

    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

    // Track which post IDs we've already fetched replies for to avoid re-fetching
    const fetchedRepliesRef = React.useRef<Set<string>>(new Set());

    React.useEffect(() => {
        if (postId) {
            if (!post) {
                dispatch(fetchPostById(postId));
            }
            dispatch(fetchPostReplies(postId));
            fetchedRepliesRef.current.add(postId);
        }
    }, [dispatch, postId, post]);

    const oldestKnown = ancestors.length > 0 ? ancestors[0] : post;
    React.useEffect(() => {
        if (oldestKnown?.replyToPostId) {
            const hasParent = posts.some(p => p.id === oldestKnown?.replyToPostId);
            if (!hasParent) {
                dispatch(fetchPostById(oldestKnown.replyToPostId));
            }
        }
    }, [dispatch, oldestKnown?.id, oldestKnown?.replyToPostId, posts]);

    // Fetch sub-replies for chain building
    React.useEffect(() => {
        replies.forEach(reply => {
            if (reply.repliesCount > 0 && !fetchedRepliesRef.current.has(reply.id)) {
                fetchedRepliesRef.current.add(reply.id);
                dispatch(fetchPostReplies(reply.id));
            }
        });
    }, [dispatch, replies]);

    // Build chain depth for non-tree view
    React.useEffect(() => {
        if (treeViewEnabled) return;
        replies.forEach(reply => {
            let currentId = reply.id;
            for (let depth = 0; depth < 5; depth++) {
                const subReplies = posts.filter(p => p.replyToPostId === currentId);
                if (subReplies.length === 0) break;
                const topSub = sortPosts(subReplies)[0];
                if (!topSub) break;
                if (topSub.repliesCount > 0 && !fetchedRepliesRef.current.has(topSub.id)) {
                    fetchedRepliesRef.current.add(topSub.id);
                    dispatch(fetchPostReplies(topSub.id));
                }
                currentId = topSub.id;
            }
        });
    }, [dispatch, replies, posts, treeViewEnabled, sortPosts]);

    // For tree view: fetch sub-replies recursively for all loaded posts
    React.useEffect(() => {
        if (!treeViewEnabled) return;
        const fetchNested = () => {
            posts.forEach(p => {
                if (p.repliesCount > 0 && !fetchedRepliesRef.current.has(p.id)) {
                    // Only fetch if this post is a descendant of the main post
                    const isDescendant = p.replyToPostId === postId ||
                        posts.some(ancestor => ancestor.id === p.replyToPostId && ancestor.replyToPostId === postId) ||
                        posts.some(a1 => a1.id === p.replyToPostId && posts.some(a2 => a2.id === a1.replyToPostId));
                    if (isDescendant) {
                        fetchedRepliesRef.current.add(p.id);
                        dispatch(fetchPostReplies(p.id));
                    }
                }
            });
        };
        fetchNested();
    }, [dispatch, posts, postId, treeViewEnabled]);

    const mainPostRef = React.useRef<HTMLDivElement>(null);
    const hasScrolledRef = React.useRef(false);

    // Auto scroll to main post if it has a parent
    React.useEffect(() => {
        if (parentPost && post?.replyToPostId && mainPostRef.current && !isLoading && !hasScrolledRef.current) {
            const rect = mainPostRef.current.getBoundingClientRect();
            window.scrollTo({
                top: rect.top + window.scrollY - 60,
                behavior: 'smooth'
            });
            hasScrolledRef.current = true;
        }
    }, [parentPost, post, isLoading]);

    // Reset scroll ref when post changes
    React.useEffect(() => {
        hasScrolledRef.current = false;
    }, [postId]);

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
            label: `${t('post.translate')} → ${primaryLangName}`,
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
        ...(currentUser?.id !== post.author.id ? [
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
            }
        ] : []),
        {
            id: 'mute-thread',
            label: t('post.mute_thread'),
            icon: <FiBellOff />,
            onClick: () => { },
        },
        ...(currentUser?.id !== post.author.id ? [
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
            }
        ] : []),
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

                {/* Parent Post Chain */}
                {ancestors.map((ancestor, index) => (
                    <div
                        key={ancestor.id}
                        className="bg-white dark:bg-dark-bg cursor-pointer"
                        onClick={() => navigate(`/profile/${ancestor.author.handle}/post/${ancestor.id}`)}
                    >
                        <PostCard
                            post={ancestor}
                            isComment={true}
                            hasTopLine={index > 0}
                            hasBottomLine={true}
                            hideBorder={true}
                        />
                    </div>
                ))}

                {/* Main Post */}
                <div ref={mainPostRef} className="p-4 border-b border-gray-200 dark:border-dark-border relative bg-white dark:bg-dark-bg">
                    <div className="flex justify-between items-start">
                        <div className="flex gap-3 mb-4">
                            <div className="flex-shrink-0 relative flex flex-col items-center">
                                {/* Connection line to parent if this post is a reply */}
                                {parentPost && (
                                    <div className="absolute top-[-16px] w-[2px] h-[16px] bg-gray-200 dark:bg-dark-border z-0" />
                                )}
                                <div className="z-10 bg-white dark:bg-dark-bg rounded-full" onClick={() => navigate(`/profile/${post.author.handle}`)} style={{ cursor: 'pointer' }}>
                                    <Avatar
                                        src={post.author.avatarUrl || post.author.avatar}
                                        alt={post.author.displayName}
                                        size="md"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-900 dark:text-dark-text hover:underline cursor-pointer" onClick={() => navigate(`/profile/${post.author.handle}`)}>
                                    {post.author.displayName}
                                </span>
                                <span className="text-gray-500 dark:text-dark-text-secondary hover:underline cursor-pointer" onClick={() => navigate(`/profile/${post.author.handle}`)}>
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
                            {`${t('post.translate')} → ${primaryLangName}`}
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
                        /* ===== TREE VIEW: Bluesky-style connector lines ===== */
                        <div className="divide-y-0 relative">
                            {(() => {
                                const DEPTH_STEP = 36; // Indentation per depth level
                                const AVATAR_CENTER = 36; // Center of depth=0 avatar (16px padding + 20px half-avatar)

                                const renderTree = (replyList: Post[], depth: number = 0, activeLines: boolean[] = []): React.ReactNode => {
                                    return replyList.map((reply, idx) => {
                                        const subReplies = sortPosts(posts.filter(p => p.replyToPostId === reply.id));
                                        const hasSubReplies = subReplies.length > 0;
                                        const isLast = idx === replyList.length - 1;

                                        // The activeLines array keeps track of which ancestor vertical lines should continue downward.
                                        // When passing this state to our children:
                                        const nextActiveLines = [...activeLines];
                                        if (depth > 0) {
                                            // Our immediate parent's line stops if we are the last child.
                                            nextActiveLines[depth - 1] = nextActiveLines[depth - 1] && !isLast;
                                        }
                                        // We append 'true' because our OWN vertical line will always drop into our immediate children.
                                        nextActiveLines.push(true);

                                        const indent = depth * DEPTH_STEP;

                                        return (
                                            <div key={reply.id} className={depth === 0 ? "border-b border-gray-200 dark:border-dark-border" : ""}>
                                                {/* Parent's own block - bounds its absolute line heights exclusively to itself */}
                                                <div className="relative bg-white dark:bg-dark-bg group">
                                                    {/* Left structural lines for all depth levels */}
                                                    <div className="absolute top-0 bottom-0 left-0 pointer-events-none">
                                                        {/* Draw continuous vertical lines for active ancestor depths */}
                                                        {activeLines.map((isActive, level) => {
                                                            if (!isActive) return null;
                                                            // For the immediate parent line connecting to this exact post:
                                                            const isImmediateParent = level === depth - 1;
                                                            // If we are the LAST child, DO NOT draw the straight continuous line.
                                                            // We will let the elbow pure curve handle it, stopping cleanly without ugly overhangs!
                                                            if (isImmediateParent && isLast) return null;

                                                            return (
                                                                <div
                                                                    key={level}
                                                                    className="absolute bg-gray-200 dark:bg-dark-border"
                                                                    style={{
                                                                        left: AVATAR_CENTER + (level * DEPTH_STEP) - 1,
                                                                        width: 2,
                                                                        top: 0,
                                                                        bottom: 0 // Perfectly spans the block downwards
                                                                    }}
                                                                />
                                                            );
                                                        })}

                                                        {/* The elbow connector from immediate parent up to this child's avatar */}
                                                        {depth > 0 && (
                                                            <div
                                                                className={cn(
                                                                    "absolute border-b-2 border-gray-200 dark:border-dark-border",
                                                                    // Only give it a rounded left curve if it's the last child!
                                                                    // Intermediate children get a sharp T-branch connection like Bluesky
                                                                    isLast ? "border-l-2 rounded-bl-[12px]" : ""
                                                                )}
                                                                style={{
                                                                    left: AVATAR_CENTER + ((depth - 1) * DEPTH_STEP) - 1,
                                                                    top: isLast ? 0 : 31, // T-branches just draw a horizontal line at 31px top right into the avatar
                                                                    width: 14,
                                                                    height: isLast ? 33 : 2 // Height is 2 if just a horizontal line
                                                                }}
                                                            />
                                                        )}
                                                    </div>

                                                    {/* The post card itself, indented. Disabling internal PostCard lines completely. */}
                                                    <div style={{ paddingLeft: indent }}>
                                                        <PostCard
                                                            post={reply}
                                                            isComment={true}
                                                            hasBottomLine={false}
                                                            hasTopLine={false}
                                                            hideBorder={true}
                                                        />
                                                    </div>

                                                    {/* Vertical connector line going from THIS post's avatar DOWN strictly linking to its children */}
                                                    {hasSubReplies && (
                                                        <div
                                                            className="absolute bg-gray-200 dark:bg-dark-border pointer-events-none"
                                                            style={{
                                                                left: AVATAR_CENTER + (depth * DEPTH_STEP) - 1,
                                                                width: 2,
                                                                top: 54, // Starts below avatar
                                                                bottom: 0  // Ends precisely at bottom of this wrapper, handing off to child blocks
                                                            }}
                                                        />
                                                    )}
                                                </div>

                                                {/* Render Children separately so their heights don't distort their parent's background layout wrappers */}
                                                {hasSubReplies && (
                                                    <div>
                                                        {renderTree(subReplies, depth + 1, nextActiveLines)}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    });
                                };
                                return renderTree(replies, 0, []);
                            })()}
                        </div>
                    ) : (
                        /* ===== NON-TREE VIEW: Chain of replies connected with vertical lines, no indentation ===== */
                        <div className="divide-y-0">
                            {replies.map((reply: Post) => {
                                // Build chain: reply → top sub-reply → top sub-sub-reply...
                                const chain: Post[] = [reply];
                                let currentId = reply.id;
                                for (let depth = 0; depth < 5; depth++) {
                                    const subReplies = sortPosts(posts.filter(p => p.replyToPostId === currentId));
                                    if (subReplies.length === 0) break;
                                    chain.push(subReplies[0]);
                                    currentId = subReplies[0].id;
                                }

                                // ONE "Read more" at the bottom of the entire group
                                // If chain extended (we followed 1 sub-reply path), remaining = repliesCount - 1
                                // If chain didn't extend (no sub-replies loaded), remaining = repliesCount
                                const chainExtended = chain.length > 1;
                                const remainingCount = chainExtended
                                    ? reply.repliesCount - 1
                                    : reply.repliesCount;
                                const showReadMore = remainingCount > 0;

                                return (
                                    <div key={reply.id} className="relative z-10 bg-white dark:bg-dark-bg">
                                        {chain.map((chainItem, idx) => {
                                            const isFirstInChain = idx === 0;
                                            const isLastInChain = idx === chain.length - 1;
                                            const hasNextInChain = !isLastInChain;

                                            return (
                                                <PostCard
                                                    key={chainItem.id}
                                                    post={chainItem}
                                                    isComment={true}
                                                    hasTopLine={!isFirstInChain}
                                                    hasBottomLine={hasNextInChain}
                                                    hideBorder={hasNextInChain || (isLastInChain && showReadMore)}
                                                />
                                            );
                                        })}
                                        {showReadMore && (
                                            <ThreadMoreReplies
                                                count={remainingCount}
                                                onClick={() => navigate(`/profile/${reply.author.handle}/post/${reply.id}`)}
                                                t={t}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
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
        </MainLayout >
    );
};

export default PostDetailPage;
