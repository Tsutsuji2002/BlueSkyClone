import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { RootState } from '../redux/store';
import { Post, User } from '../types';
import { toggleLike, repostPost, deletePost, fetchPostById, toggleBookmark, updateInteractionSettings, fetchPostReplies } from '../redux/slices/postsSlice';
import { openReply, openMobileMenu, openEditPost, openReport, openQuote } from '../redux/slices/modalsSlice';
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
import { updateNotificationSettings } from '../redux/slices/authSlice';
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
    FiAlertTriangle,
    FiCheck,
    FiPlus,
    FiTrash2,
    FiSun, FiMoon, FiLogOut, FiEdit, FiRss, FiList, FiShield,
    FiX, FiMessageSquare,
    FiChevronDown,
    FiFlag
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/classNames';
import { followUserAsync, unfollowUserAsync } from '../redux/slices/userSlice';
import LoadingIndicator from '../components/common/LoadingIndicator';
import PostInteractionSettingsModal from '../modals/PostInteractionSettingsModal';
import ConfirmModal from '../components/common/ConfirmModal';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

import {
    FiAnchor,
    FiClipboard,
    FiVolumeX,
    FiSettings,
    FiExternalLink
} from 'react-icons/fi';

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
    const { handle, postId } = useParams<{ handle: string; postId: string }>();
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
    const post = posts.find((p: Post) => p.id === postId || p.tid === postId || p.uri?.endsWith('/' + postId));

    const pageTitle = post?.content
        ? (post.content.length > 50 ? post.content.slice(0, 50) + '...' : post.content)
        : t('post.title');

    useDocumentTitle(pageTitle);

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
        if (!post) return [];
        const filtered = posts.filter((p: Post) => {
            // Check for match against any of the parent's identifiers
            const parentId = p.replyToPostId;
            const parentUri = p.parentPost?.uri;
            
            if (!parentId && !parentUri) return false;

            return parentId === post.id || 
                   parentId === post.tid || 
                   (parentUri && parentUri === post.uri) ||
                   (post.uri && (parentId === post.uri || post.uri.endsWith('/' + parentId)));
        });
        // Safety deduplication by URI or ID
        const seen = new Set<string>();
        const unique = filtered.filter(p => {
            const uid = p.uri || p.id;
            if (!uid || seen.has(uid)) return false;
            seen.add(uid);
            return true;
        });
        
        return sortPosts(unique);
    }, [posts, post, sortPosts]);
    const ancestors = React.useMemo(() => {
        const list: Post[] = [];
        if (!post) return list;
        let current: Post | undefined = post;
        const seen = new Set<string>();
        if (post.id) seen.add(post.id);
        if (post.tid) seen.add(post.tid);
        if (post.uri) seen.add(post.uri);
        
        while (current?.replyToPostId) {
            const replyToId: string = current.replyToPostId!;
            // Find parent using any of its identifiers
            const found: Post | undefined = posts.find((p: Post) => 
                p.id === replyToId || 
                p.tid === replyToId || 
                (current?.parentPost && current.parentPost.uri === p.uri) || // Added condition for remote posts
                (p.uri && (p.uri === replyToId || p.uri.endsWith('/' + replyToId)))
            );
            
            if (found && !seen.has(found.id) && (found.tid ? !seen.has(found.tid) : true) && (found.uri ? !seen.has(found.uri) : true)) {
                list.unshift(found);
                if (found.id) seen.add(found.id);
                if (found.tid) seen.add(found.tid);
                if (found.uri) seen.add(found.uri);
                current = found;
            } else {
                break;
            }
        }
        return list;
    }, [posts, post]);
    const parentPost = ancestors.length > 0 ? ancestors[ancestors.length - 1] : null;

    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [isInteractionModalOpen, setIsInteractionModalOpen] = React.useState(false);
    const observerTarget = React.useRef<HTMLDivElement>(null);
    const REPLIES_PER_PAGE = 20;

    const hasMoreReplies = React.useMemo(() => {
        if (!post) return false;
        // Calculate top-level replies count to see if we reached the end
        const topLevelReplies = posts.filter(p => 
            p.replyToPostId === post.id || 
            p.replyToPostId === post.tid ||
            (post.uri && (p.replyToPostId === post.uri || post.uri.endsWith('/' + p.replyToPostId!)))
        ).length;
        return topLevelReplies < post.repliesCount;
    }, [post, posts]);

    // Infinite Scroll Observer for Replies
    React.useEffect(() => {
        if (!hasMoreReplies || isLoading || !post?.id) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    const currentTopLevelCount = posts.filter(p => 
                        p.replyToPostId === post.id || 
                        p.replyToPostId === post.tid ||
                        (post.uri && (p.replyToPostId === post.uri || post.uri.endsWith('/' + p.replyToPostId!)))
                    ).length;
                    dispatch(fetchPostReplies({ postId: post.id, skip: currentTopLevelCount, take: REPLIES_PER_PAGE }));
                }
            },
            { threshold: 0.5 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [dispatch, hasMoreReplies, isLoading, post?.id, posts, post?.uri, post?.tid]);

    // Track which post IDs we've already fetched replies for to avoid re-fetching
    const fetchedRepliesRef = React.useRef<Set<string>>(new Set());

    React.useEffect(() => {
        if (postId) {
            dispatch(fetchPostById({ uri: postId, handle }));
            // Replies are now usually included in fetchPostById (getPostThread)
        }
    }, [dispatch, postId, handle]);

    const oldestKnown = ancestors.length > 0 ? ancestors[0] : post;
    React.useEffect(() => {
        if (oldestKnown?.replyToPostId) {
            const hasParent = posts.some(p => p.id === oldestKnown?.replyToPostId || p.tid === oldestKnown?.replyToPostId);
            if (!hasParent) {
                dispatch(fetchPostById(oldestKnown.replyToPostId));
            }
        }
    }, [dispatch, oldestKnown?.id, oldestKnown?.replyToPostId, posts]);

    // Tracking the current thread state

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
                <LoadingIndicator text={t('post.loading', { defaultValue: 'Loading post...' })} />
            );
        }
        return (
            <div className="p-4 text-center">
                <p className="text-gray-500 dark:text-dark-text-secondary">{t('common.post_not_found')}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-4 text-primary-500 hover:underline"
                >
                    {t('common.go_back')}
                </button>
            </div>
        );
    }

    const handleBack = () => {
        navigate(-1);
    };

    const handleLike = () => {
        if (!post.uri || !post.cid) return;
        dispatch(toggleLike({ uri: post.uri, cid: post.cid, isLiked: !!post.isLiked }));
    };

    const handleRepost = () => {
        if (!post.uri || !post.cid) return;
        dispatch(repostPost({ uri: post.uri, cid: post.cid, isReposted: !!post.isReposted }));
    };

    const handleBookmark = () => {
        if (!post.uri) return;
        dispatch(toggleBookmark({ uri: post.uri, isBookmarked: !!post.isBookmarked }));
    };

    const handleDelete = async () => {
        try {
            await dispatch(deletePost(post.uri!)).unwrap();
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
            onClick: () => handleCopyLink(post.author.handle, post.tid || post.id),
        },
        {
            id: 'send-message',
            label: t('post.send_via_message'),
            icon: <FiSend />,
            onClick: () => openShareModal(post),
        },
        {
            id: 'copy-link', // duplicate ID intentionally handled
            label: t('post.embed_post'),
            icon: <FiCode />,
            onClick: () => handleEmbedPost(post.author.handle, post.tid || post.id, post.content),
        },
    ];

    const settingsDropdownItems: DropdownItem[] = [
        {
            id: 'section-view',
            label: t('post.show_replies_as', 'Show replies as'),
            onClick: () => { },
            type: 'default',
        },
        {
            id: 'linear',
            label: t('post.linear', 'Linear'),
            onClick: () => dispatch(updateNotificationSettings({ treeView: false })),
            type: 'radio',
            selected: !treeViewEnabled,
        },
        {
            id: 'threaded',
            label: t('post.threaded', 'Threaded'),
            onClick: () => dispatch(updateNotificationSettings({ treeView: true })),
            type: 'radio',
            selected: treeViewEnabled,
            hasDivider: true,
        },
        {
            id: 'section-sorting',
            label: t('post.reply_sorting', 'Reply sorting'),
            onClick: () => { },
            type: 'default',
        },
        {
            id: 'top',
            label: t('post.top_replies_first', 'Top replies first'),
            onClick: () => dispatch(updateNotificationSettings({ sortReplies: 'top' })),
            type: 'radio',
            selected: sortOrder === 'top',
        },
        {
            id: 'oldest',
            label: t('post.oldest_replies_first', 'Oldest replies first'),
            onClick: () => dispatch(updateNotificationSettings({ sortReplies: 'oldest' })),
            type: 'radio',
            selected: sortOrder === 'oldest',
        },
        {
            id: 'newest',
            label: t('post.newest_replies_first', 'Newest replies first'),
            onClick: () => dispatch(updateNotificationSettings({ sortReplies: 'newest' })),
            type: 'radio',
            selected: sortOrder === 'newest',
        }
    ];

    const moreDropdownItems: DropdownItem[] = [
        {
            id: 'translate',
            label: t('post.translate', 'Translate'),
            icon: <FiType />,
            onClick: () => handleTranslate(post.content),
        },
        {
            id: 'copy-text',
            label: t('post.copy_text', 'Copy post text'),
            icon: <FiClipboard />,
            onClick: () => handleCopyText(post.content),
        },
        {
            id: 'toggle-view-shortcut',
            label: treeViewEnabled ? t('post.view_as_linear', 'Show as List') : t('post.view_as_threaded', 'Show as Tree'),
            icon: <FiList />,
            onClick: () => {
                dispatch(updateNotificationSettings({ treeView: !treeViewEnabled }));
            },
        },
        {
            id: 'sort-replies-shortcut',
            label: t('post.sort_replies', 'Sort replies'),
            icon: <FiSliders />,
            onClick: () => {
                const orders: ('top' | 'newest' | 'oldest')[] = ['top', 'newest', 'oldest'];
                const currentIndex = orders.indexOf(sortOrder as any);
                const nextIndex = (currentIndex + 1) % orders.length;
                dispatch(updateNotificationSettings({ sortReplies: orders[nextIndex] }));
                dispatch(showToast({ message: t('post.sorted_by', { order: orders[nextIndex] }), type: 'success' }));
            },
        },
        {
            id: 'mute-thread',
            label: t('post.mute_thread', 'Mute thread'),
            icon: <FiVolumeX />,
            onClick: () => { },
        },
        {
            id: 'report-post',
            label: t('post.report_post', 'Report post'),
            icon: <FiFlag />,
            danger: true,
            onClick: () => {
                if (post.uri && post.cid) {
                    dispatch(openReport({ uri: post.uri, cid: post.cid, type: 'post' }));
                }
            },
        }
    ];

    const dateLocale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

    const handleFollowToggle = async () => {
        if (!currentUser || !post) return;
        try {
            const author = post.author as User;
            if (author.isFollowing && author.followingReference) {
                await dispatch(unfollowUserAsync({ userId: author.id, followUri: author.followingReference })).unwrap();
                // Optimistically update or re-fetch
                dispatch(fetchPostById(post.uri!));
            } else {
                await dispatch(followUserAsync(post.author.id)).unwrap();
                dispatch(fetchPostById(post.uri!));
            }
        } catch (error: any) {
            console.error('Failed to toggle follow:', error);
            dispatch(showToast({ message: error.message || 'Failed to update follow status', type: 'error' }));
        }
    };


    return (
        <div className="min-h-screen">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border">
                    <div className="flex items-center justify-between px-4 h-[53px]">
                        <div className="flex items-center gap-2">
                            <IconButton
                                icon={<FiArrowLeft size={20} />}
                                onClick={handleBack}
                                variant="default"
                                className="mr-2"
                            />
                            <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text truncate max-w-[200px] sm:max-w-xs">
                                {t('post.title')}
                            </h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <Dropdown
                                trigger={
                                    <IconButton
                                        icon={<FiSliders size={20} />}
                                        variant="default"
                                        onClick={() => {}} // Explicitly interactive
                                    />
                                }
                                items={settingsDropdownItems}
                            />
                            <div className="lg:hidden ml-2">
                                <button
                                    onClick={() => dispatch(openMobileMenu())}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full flex-shrink-0"
                                >
                                    <Avatar src={currentUser?.avatar} alt={currentUser?.displayName || 'User'} size="sm" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Parent Post Chain */}
                {ancestors.map((ancestor, index) => (
                    <div
                        key={ancestor.id}
                        className="bg-white dark:bg-dark-bg cursor-pointer"
                        onClick={() => navigate(`/profile/${ancestor.author.handle}/post/${ancestor.tid || ancestor.id}`)}
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
                        facets={post.facets}
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
                                const currentPostId = post.tid || post.id;
                                navigate(`/profile/${post.author.handle}/post/${currentPostId}/media/${index}`);
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

                    {/* Interaction Status & Details */}

                    {/* Footer Info */}
                    <div className="flex items-center gap-2 text-gray-500 dark:text-dark-text-secondary text-sm mb-4">
                        <span>{new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>·</span>
                        <span>{new Date(post.createdAt).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                        <span>·</span>
                        <div
                            className={cn(
                                "flex items-center gap-1 cursor-default",
                                currentUser?.id === post.author.id && "text-[#0085FF] cursor-pointer hover:underline"
                            )}
                            onClick={() => {
                                if (currentUser?.id === post.author.id) {
                                    setIsInteractionModalOpen(true);
                                }
                            }}
                        >
                            <FiMessageSquare size={14} />
                            <span>{
                                post.replyRestriction === 'nobody'
                                    ? t('post.reply_nobody', 'Replies disabled')
                                    : post.replyRestriction === 'following'
                                        ? t('post.reply_following', 'People you follow')
                                        : post.replyRestriction === 'followers'
                                            ? t('post.reply_followers', 'Followers')
                                            : post.replyRestriction === 'mentioned'
                                                ? t('post.reply_mentioned', 'People you mention')
                                                : post.replyRestriction === 'custom' || (post.replyRestriction && post.replyRestriction.includes(','))
                                                    ? t('post.interaction_limited', 'Interaction limited')
                                                    : t('post.anyone_can_reply', 'Everybody can reply')
                            }</span>
                            {currentUser?.id === post.author.id && <FiChevronDown size={14} />}
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
                        <Dropdown
                            trigger={
                                <IconButton
                                    icon={<FiRepeat size={22} className={post.isReposted ? 'text-green-500' : ''} />}
                                    variant="default"
                                />
                            }
                            items={[
                                {
                                    id: 'repost',
                                    label: post.isReposted ? t('post.undo_repost', 'Undo repost') : t('post.repost', 'Repost'),
                                    icon: <FiRepeat className={post.isReposted ? 'text-green-500' : ''} />,
                                    onClick: handleRepost
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
                        <IconButton
                            icon={<FiHeart size={22} className={post.isLiked ? 'fill-red-500 text-red-500' : ''} />}
                            onClick={handleLike}
                            variant="default"
                        />
                        <IconButton
                            icon={<FiBookmark size={22} className={post.isBookmarked ? 'fill-primary-500 text-primary-500' : ''} />}
                            onClick={handleBookmark}
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
                                    onClick={() => {}} // Explicitly interactive
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
                                        const subReplies = sortPosts(posts.filter((p: Post) => {
                                            const pid = p.replyToPostId;
                                            if (!pid || p.id === reply.id || p.uri === reply.uri) return false;
                                            return pid === reply.id || 
                                                   pid === reply.tid || 
                                                   (reply.uri && (pid === reply.uri || reply.uri.endsWith('/' + pid)));
                                        }));
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
                                            <div key={reply.id}>
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

                                                {/* Explicit separator after each depth-0 thread group (including all its children).
                                                    Using a real div instead of CSS border-b to prevent the PostCard's
                                                    background from visually hiding the parent's border edge. */}
                                                {depth === 0 && (
                                                    <div className="h-px bg-gray-200 dark:bg-dark-border" />
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
                                    const cidForClosure = currentId; // Create stable reference for filter
                                    const lastItem = chain[chain.length - 1];
                                    const subReplies = sortPosts(posts.filter((p: Post) => {
                                        const pid = p.replyToPostId;
                                        if (!pid || p.id === lastItem.id || p.uri === lastItem.uri) return false;
                                        // Check against any identifier of the CURRENT chain item
                                        return pid === lastItem.id || 
                                               pid === lastItem.tid ||
                                               (lastItem.uri && (pid === lastItem.uri || lastItem.uri.endsWith('/' + pid)));
                                    }));
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
                                                onClick={() => navigate(`/profile/${reply.author.handle}/post/${reply.uri?.split('/').pop() || reply.id}`)}
                                                t={t}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {/* Infinite Scroll Trigger for Replies */}
                    {hasMoreReplies && (
                        <div ref={observerTarget} className="h-20 flex items-center justify-center border-t border-gray-100 dark:border-dark-border">
                            {isLoading && (
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                            )}
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

                {currentUser && (
                    <PostInteractionSettingsModal
                        isOpen={isInteractionModalOpen}
                        onClose={() => setIsInteractionModalOpen(false)}
                        replyRestriction={post.replyRestriction || 'anyone'}
                        setReplyRestriction={(val) => {
                            dispatch(updateInteractionSettings({
                                postUri: post.uri!,
                                replyRestriction: val,
                                allowQuotes: post.allowQuotes !== false
                            }));
                        }}
                        allowQuotes={post.allowQuotes !== false}
                        setAllowQuotes={(val) => {
                            dispatch(updateInteractionSettings({
                                postUri: post.uri!,
                                replyRestriction: post.replyRestriction || 'anyone',
                                allowQuotes: val
                            }));
                        }}
                        postUri={post.uri!}
                    />
                )}
        </div>
    );
};

export default PostDetailPage;
