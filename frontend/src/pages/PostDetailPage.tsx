import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useStore } from 'react-redux';
import { RootState } from '../redux/store';
import { Post, User } from '../types';
import { clearThreadPosts, toggleBookmark, toggleLike, repostPost } from '../redux/slices/postsSlice';
import { 
    useGetPostDetailsQuery,  
    useToggleLikeMutation, 
    useRepostMutation, 
    useDeletePostMutation 
} from '../redux/api/postApi';
import { useUpdateSettingsMutation } from '../redux/api/authApi';
import { openReply, openMobileMenu, openEditPost, openReport, openQuote, openAuthWall } from '../redux/slices/modalsSlice';
import Avatar from '../components/common/Avatar';
import UserHoverCard from '../components/common/UserHoverCard';
import IconButton from '../components/common/IconButton';
import PostCard from '../components/feed/PostCard';
import ModerationBanner from '../components/common/ModerationBanner';
import MediaGrid from '../components/feed/MediaGrid';
import QuotedPost from '../components/feed/QuotedPost';
import LinkPreviewCard from '../components/common/LinkPreviewCard';
import RichText from '../components/common/RichText';
import ExpandableRichText from '../components/common/ExpandableRichText';
import Dropdown, { DropdownItem } from '../components/common/Dropdown';
import { showToast } from '../redux/slices/toastSlice';
import { usePostActions } from '../hooks/usePostActions';
import { updateSettings } from '../redux/slices/authSlice';
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
    FiFlag,
    FiLock
} from 'react-icons/fi';
import { BsPatchCheckFill } from 'react-icons/bs';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/classNames';
import { followUserAsync, unfollowUserAsync } from '../redux/slices/userSlice';
import LoadingIndicator from '../components/common/LoadingIndicator';
import PostInteractionSettingsModal from '../modals/PostInteractionSettingsModal';
import ConfirmModal from '../components/common/ConfirmModal';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatHandleText } from '../utils/identity';
import { getDynamicBatchSize } from '../utils/pagination';

import {
    FiAnchor,
    FiClipboard,
    FiVolumeX,
    FiSettings,
    FiExternalLink
} from 'react-icons/fi';

const ThreadMoreReplies = ({ count, onClick, t, variant = 'default' }: { count: number, onClick: () => void, t: any, variant?: 'default' | 'minimal' }) => (
    <div
        className={cn(
            "flex items-center gap-1.5 pb-3 pt-0 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-dark-surface/30 bg-white dark:bg-dark-bg group transition-colors",
            variant === 'default' ? "px-4 border-b border-gray-200 dark:border-dark-border" : "px-0"
        )}
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

    const { user: currentUser, settings, isInitializing } = useAppSelector((state: RootState) => state.auth);
    const { data: threadDataModel, isLoading: isThreadLoading, isFetching: isThreadFetching, isError: isThreadError, error: threadError, refetch: refetchThread } = useGetPostDetailsQuery({ handle: handle!, uri: postId!, depth: 10, parentHeight: 2 }, { skip: !postId });
    const threadData = threadDataModel?.allPosts;
    const targetPostFromApi = threadDataModel?.targetPost;
    // Insurance: if the handshake finishes but we don't have data, force a refetch
    // This handles cases where a mid-load resetApiState() might have cleared the pending query.
    React.useEffect(() => {
        if (!isInitializing && !isThreadLoading && !threadDataModel && postId) {
            refetchThread();
        }
    }, [isInitializing, isThreadLoading, threadDataModel, postId, refetchThread]);



    const postData = React.useMemo(() => {
        try {
            if (targetPostFromApi) return targetPostFromApi;
            if (!threadData || !postId) return null;
            const normalizedId = postId.toLowerCase();
            
            return threadData.find((p: Post) => {
                const pid = p.id?.toLowerCase();
                const ptid = p.tid?.toLowerCase();
                const puri = p.uri?.toLowerCase();
                
                return pid === normalizedId || 
                       ptid === normalizedId || 
                       (puri && (puri === normalizedId || puri.endsWith('/' + normalizedId)));
            });
        } catch (e) {
            console.error('[PostDetailPage] Error resolving post data:', e);
            return null;
        }
    }, [threadData, targetPostFromApi, postId]) as Post;

    const posts = useAppSelector((state: RootState) => state.posts.threadPosts);
    const isRepliesLoading = isThreadLoading || isThreadFetching;
    
    const [toggleLikeMutation] = useToggleLikeMutation();
    const [repostMutation] = useRepostMutation();
    const [deletePostMutation, { isLoading: isDeleting }] = useDeletePostMutation();
    const [updateSettingsMutation] = useUpdateSettingsMutation();

    const interactionTruth = useAppSelector((state: RootState) => {
        const uriStr = postData?.uri?.toLowerCase();
        const idStr = postData?.id?.toLowerCase();
        const tidStr = postData?.tid?.toLowerCase();
        return (uriStr && state.posts.interactionTruth[uriStr]) || 
               (idStr && state.posts.interactionTruth[idStr]) || 
               (tidStr && state.posts.interactionTruth[tidStr]) || null;
    });

    const sortOrder = settings?.sortReplies || 'top';
    const treeViewEnabled = settings?.treeView || false;

    const post = React.useMemo(() => {
        if (!postData) return null;
        if (!interactionTruth) return postData;
        return {
            ...postData,
            ...interactionTruth
        };
    }, [postData, interactionTruth]) as Post;

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

        // Local DB replies (e.g. from our own users)
        const filtered = posts.filter((p: Post) => {
            const parentId = p.replyToPostId;
            const parentUri = p.parentPost?.uri;
            if (!parentId && !parentUri) return false;
            return parentId === post.id ||
                parentId === post.tid ||
                (parentUri && parentUri === post.uri) ||
                (post.uri && (parentId === post.uri || post.uri.endsWith('/' + parentId)));
        });

        // Use only the posts from the main thread query result
        const combined = filtered;

        // Deduplicate by URI or ID
        const seen = new Set<string>();
        const unique = combined.filter(p => {
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
    const [isUnmuted, setIsUnmuted] = React.useState(false);
    const isOwnPost = post && currentUser && (
        currentUser.id === post.author.id ||
        (currentUser.did && post.author.did && currentUser.did === post.author.did) ||
        (currentUser.handle && post.author.handle && currentUser.handle === post.author.handle)
    );
    const hasMoreReplies = isRepliesLoading;
    // Track which post IDs we've already fetched replies for to avoid re-fetching
    const fetchedRepliesRef = React.useRef<Set<string>>(new Set());

    React.useEffect(() => {
        if (postId && (post?.id || post?.uri)) {
            const idToJoin = post?.uri || post?.id;
            import('../services/postSignalrService').then(m => {
                m.default.joinPost(idToJoin);
            });
            return () => {
                import('../services/postSignalrService').then(m => {
                    m.default.leavePost(idToJoin);
                });
            };
        }
    }, [postId, post?.id, post?.uri]);

    const oldestKnown = ancestors.length > 0 ? ancestors[0] : post;

    // Tracking the current thread state

    const mainPostRef = React.useRef<HTMLDivElement>(null);
    const hasScrolledRef = React.useRef(false);

    // Auto scroll to main post if it has a parent
    React.useEffect(() => {
        if (parentPost && post?.replyToPostId && mainPostRef.current && !isThreadLoading && !hasScrolledRef.current) {
            const timer = setTimeout(() => {
                if (mainPostRef.current) {
                    const rect = mainPostRef.current.getBoundingClientRect();
                    window.scrollTo({
                        top: rect.top + window.scrollY - 68,
                        behavior: 'smooth'
                    });
                    hasScrolledRef.current = true;
                }
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [parentPost, post, isThreadLoading]);

    // Reset scroll ref when post changes
    React.useEffect(() => {
        hasScrolledRef.current = false;
    }, [postId]);


    // Show skeleton while loading the thread (first fetch in progress and no post in cache yet)
    const isShell = post && !post.content && !post.media?.length && (!post.imageUrls || post.imageUrls.length === 0);

    if ((isThreadLoading || isInitializing) && !post) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-white dark:bg-dark-bg">
                <LoadingIndicator />
                <p className="mt-4 text-gray-400 text-sm">{t('common.loading', 'Loading...')}</p>
            </div>
        );
    }


    if (isShell && (isThreadLoading || isInitializing)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-white dark:bg-dark-bg">
                <LoadingIndicator text={t('post.loading', { defaultValue: 'Loading post...' })} />
            </div>
        );
    }

    // Only show not-found AFTER the load attempt and initialization have finished
    if (!post && !isThreadLoading && !isInitializing) {
        return (
            <div className="min-h-screen flex flex-col bg-white dark:bg-dark-bg">
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border px-4 h-[53px] flex items-center">
                    <IconButton icon={<FiArrowLeft size={20} />} onClick={() => navigate(-1)} />
                    <h1 className="ml-4 font-bold text-gray-900 dark:text-dark-text">{t('post.not_found', 'Post not found')}</h1>
                </div>
                <div className="flex flex-col items-center justify-center min-h-[600px] p-8 text-center">
                    <h2 className="text-2xl font-bold mb-2">{t('post.not_found', 'Post not found')}</h2>
                    <p className="text-gray-500 mb-6">{t('post.not_found_desc', "This post doesn't exist or is unavailable.")}</p>
                    <p className="text-sm text-gray-400 mb-8">{t('post.not_found_sub', 'It might have been deleted or the link is incorrect.')}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2 bg-primary text-white rounded-full font-bold hover:bg-opacity-90 transition-all"
                    >
                        {t('common.go_back', 'Go back')}
                    </button>
                </div>
            </div>
        );
    }

    const handleBack = () => {
        navigate(-1);
    };

    const handleLike = async () => {
        if (!currentUser) {
            dispatch(openAuthWall());
            return;
        }
        if (!post.uri || !post.cid) return;
        
        dispatch(toggleLike({ 
            uri: post.uri, 
            cid: post.cid, 
            isLiked: !!post.isLiked, 
            likeUri: post.viewer?.like ?? post.likeUri,
            currentLikesCount: post.likesCount
        }));
    };

    const handleRepost = async () => {
        if (!currentUser) {
            dispatch(openAuthWall());
            return;
        }
        if (!post.uri || !post.cid) return;

        dispatch(repostPost({ 
            uri: post.uri, 
            cid: post.cid, 
            isReposted: !!post.isReposted, 
            repostUri: post.viewer?.repost,
            currentRepostsCount: post.repostsCount
        }));
    };




    const handleBookmark = () => {
        if (!currentUser) {
            dispatch(openAuthWall());
            return;
        }
        if (!post) return;
        dispatch(toggleBookmark({ post }));
    };


    const handleDelete = async () => {
        try {
            await deletePostMutation(post.uri!).unwrap();
            
            // Dispatch custom event for ProfileTabContent to listen to
            window.dispatchEvent(new CustomEvent('postDeleted', { detail: { uri: post.uri } }));
            
            dispatch(showToast({ message: t('common.post_deleted'), type: 'success' }));
            navigate(-1);
        } catch (error: any) {
            dispatch(showToast({ message: error?.data?.message || error?.message || t('common.failed_to_delete'), type: 'error' }));
        }
    };



    const shareDropdownItems: DropdownItem[] = [
        {
            id: 'copy-link',
            label: t('post.copy_link'),
            icon: <FiLink />,
            onClick: () => handleCopyLink(post.author.handle, post.tid || post.id),
        },
        ...(currentUser ? [{
            id: 'send-message',
            label: t('post.send_via_message'),
            icon: <FiSend />,
            onClick: () => openShareModal(post),
        }] : []),
        {
            id: 'embed-post',
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
            onClick: () => {
                const newSettings = { treeView: false };
                dispatch(updateSettings(newSettings));
                if (currentUser) updateSettingsMutation(newSettings);
            },
            type: 'radio',
            selected: !treeViewEnabled,
        },
        {
            id: 'threaded',
            label: t('post.threaded', 'Threaded'),
            onClick: () => {
                const newSettings = { treeView: true };
                dispatch(updateSettings(newSettings));
                if (currentUser) updateSettingsMutation(newSettings);
            },
            type: 'radio',
            selected: treeViewEnabled,
            hasDivider: true,
        },
        {
            id: 'loading',
            label: t('post.loading', 'Loading post...'),
            onClick: () => { },
            type: 'default',
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
            onClick: () => {
                const newSettings = { sortReplies: 'top' as const };
                dispatch(updateSettings(newSettings));
                if (currentUser) updateSettingsMutation(newSettings);
            },
            type: 'radio',
            selected: sortOrder === 'top',
        },
        {
            id: 'oldest',
            label: t('post.oldest_replies_first', 'Oldest replies first'),
            onClick: () => {
                const newSettings = { sortReplies: 'oldest' as const };
                dispatch(updateSettings(newSettings));
                if (currentUser) updateSettingsMutation(newSettings);
            },
            type: 'radio',
            selected: sortOrder === 'oldest',
        },
        {
            id: 'newest',
            label: t('post.newest_replies_first', 'Newest replies first'),
            onClick: () => {
                const newSettings = { sortReplies: 'newest' as const };
                dispatch(updateSettings(newSettings));
                if (currentUser) updateSettingsMutation(newSettings);
            },
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
        ...(currentUser ? [
            {
                id: 'toggle-view-shortcut',
                label: treeViewEnabled ? t('post.view_as_linear') : t('post.view_as_threaded'),
                icon: <FiList />,
                onClick: () => {
                    dispatch(updateSettings({ treeView: !treeViewEnabled }));
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
                    dispatch(updateSettings({ sortReplies: orders[nextIndex] }));
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
            },
            ...(isOwnPost ? [
                { id: 'divider-own', label: '', icon: null, onClick: () => { }, hasDivider: true },
                {
                    id: 'delete',
                    label: t('common.delete_post', 'Delete Post'),
                    icon: <FiTrash2 />,
                    onClick: () => setShowDeleteConfirm(true),
                    danger: true,
                }
            ] : []),
        ] : []),
    ];


    const dateLocale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

    const handleFollowToggle = async () => {
        if (!currentUser) {
            dispatch(openAuthWall());
            return;
        }
        try {
            const author = post.author as User;
            const followActor = author.did || author.handle || author.id;
            if (author.isFollowing && author.followingReference) {
                dispatch(unfollowUserAsync({ userId: followActor, followUri: author.followingReference }));
            } else {
                dispatch(followUserAsync(followActor));
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
                                    onClick={() => { }} // Explicitly interactive
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

            {(() => {
                const isMuted = post.muteInfo?.isMuted && !isUnmuted;
                const behavior = post.muteInfo?.behavior;
                const reason = post.muteInfo?.reason || t('moderation.sensitive_content', 'Sensitive Content');

                if (isMuted && behavior === 'hide' && reason === 'Authentication Required') {
                    return (
                        <div ref={mainPostRef} className="px-4 py-6 border-b border-gray-100 dark:border-dark-border relative bg-white dark:bg-dark-bg">
                            <div className="flex bg-gray-50 dark:bg-dark-surface/50 border border-gray-200 dark:border-dark-border p-4 rounded-xl gap-3">
                                <div className="mt-0.5">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-dark-surface flex items-center justify-center text-gray-500">
                                        <FiLock size={16} />
                                    </div>
                                </div>
                                <div className="text-gray-600 dark:text-dark-text-secondary italic">
                                    {t('post.auth_required_full', 'This author has chosen to make their posts visible only to people who are signed in.')}
                                </div>
                            </div>
                        </div>
                    );
                }

                return (
                    <div ref={mainPostRef} className={cn(
                        "px-4 pt-4 sm:pt-5 pb-3 border-b border-gray-100 dark:border-dark-border relative bg-white dark:bg-dark-bg transition-all duration-300 scroll-mt-16",
                        isDeleting && "opacity-50 pointer-events-none"
                    )}>
                        {/* Deleting overlay */}
                        {isDeleting && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-dark-bg/60 backdrop-blur-sm">
                                <div className="flex flex-col items-center gap-2">
                                    <LoadingIndicator />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('post.deleting', 'Deleting post...')}</span>
                                </div>
                            </div>
                        )}
                        {/* Post Content & Moderation UI logic */}
                        {(() => {

                    if (isMuted && behavior === 'hide') {
                        return (
                            <>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 relative flex flex-col items-center">
                                            {/* Connection line to parent if this post is a reply */}
                                            {parentPost && (
                                                <div className="absolute top-[-16px] w-[2px] h-[16px] bg-gray-200 dark:bg-dark-border z-0" />
                                            )}
                                            <div className="z-10 bg-white dark:bg-dark-bg rounded-full" style={{ cursor: 'pointer' }}>
                                                <UserHoverCard user={post.author}>
                                                    <div onClick={() => navigate(`/profile/${post.author.handle}`)}>
                                                        <Avatar
                                                            src={post.author.avatarUrl || post.author.avatar}
                                                            alt={post.author.displayName}
                                                            size="md"
                                                        />
                                                    </div>
                                                </UserHoverCard>
                                            </div>
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <UserHoverCard user={post.author}>
                                                <span
                                                    className="block truncate font-bold text-gray-900 dark:text-dark-text hover:underline cursor-pointer"
                                                    onClick={() => navigate(`/profile/${post.author.handle}`)}
                                                    title={post.author.displayName || post.author.handle || 'Unknown'}
                                                >
                                                    {post.author.displayName || post.author.handle || 'Unknown'}
                                                </span>
                                            </UserHoverCard>
                                            <span
                                                className="truncate text-gray-500 dark:text-dark-text-secondary"
                                                title={post.author.handle || ''}
                                            >
                                                {post.author.handle?.startsWith('did:') ? '' : formatHandleText(post.author.handle)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <ModerationBanner reason={reason} behavior="hide" isDetailView={true} className="mb-6" />
                            </>
                        );
                    }

                    return (
                        <>
                            {(post.isReposted || post.repostedBy) && (
                                <div
                                    className="flex items-center gap-2 mb-3 text-[13px] text-gray-500 dark:text-dark-text-secondary font-semibold"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const handle = post.repostedBy?.handle || currentUser?.handle;
                                        if (handle) {
                                            navigate(`/profile/${handle}`);
                                        }
                                    }}
                                >
                                    <FiRepeat size={14} className={post.isReposted ? 'text-green-500' : 'text-gray-500'} />
                                    <span className="truncate">
                                        {post.repostedBy
                                            ? ((post.repostedBy.did !== currentUser?.did && post.repostedBy.handle !== currentUser?.handle)
                                                ? t('post.reposted_by', { name: post.repostedBy.displayName || post.repostedBy.handle || 'Unknown' })
                                                : t('post.reposted_by_you', 'Reposted by you'))
                                            : (post.isReposted ? t('post.reposted_by_you', 'Reposted by you') : t('post.reposted', 'Reposted'))}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 pb-3">
                                <UserHoverCard user={post.author}>
                                    <div 
                                        onClick={() => navigate(`/profile/${post.author.handle}`)}
                                        className="w-[42px] h-[42px] rounded-full overflow-hidden relative border border-gray-200/60 dark:border-dark-border/60 cursor-pointer flex-shrink-0"
                                    >
                                        <Avatar
                                            src={post.author.avatarUrl || post.author.avatar}
                                            alt={post.author.displayName}
                                            size={42}
                                            hasBorder={false}
                                            className="w-[42px] h-[42px] object-cover"
                                        />
                                    </div>
                                </UserHoverCard>
                                <div className="flex flex-col min-w-0 flex-1 justify-center">
                                    <UserHoverCard user={post.author} className="inline-flex min-w-0 max-w-full">
                                        <span
                                            className="font-semibold text-[16.9px] leading-[22px] text-gray-900 dark:text-white truncate hover:underline cursor-pointer flex items-center gap-1 font-sans"
                                            onClick={() => navigate(`/profile/${post.author.handle}`)}
                                            title={post.author.displayName || post.author.handle || 'Unknown'}
                                        >
                                            {post.author.displayName || post.author.handle || 'Unknown'}
                                            {post.author.isVerified && (
                                                <BsPatchCheckFill className="text-blue-500 shrink-0" size={15} />
                                            )}
                                        </span>
                                    </UserHoverCard>
                                    <span
                                        className="text-[15px] leading-[20px] text-[#405168] dark:text-[#8798B0] truncate cursor-pointer"
                                        onClick={() => navigate(`/profile/${post.author.handle}`)}
                                        title={post.author.handle || ''}
                                    >
                                        {post.author.handle?.startsWith('did:') ? '' : formatHandleText(post.author.handle)}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <ExpandableRichText
                                content={post.content}
                                facets={post.facets}
                                className="text-[16.9px] leading-[22px] text-gray-900 dark:text-white mb-2 whitespace-pre-wrap break-words font-sans tracking-[0.25px]"
                                maxLines={8}
                                maxChars={450}
                                isDetailView={true}
                            />

                            {isMuted && behavior === 'warn' ? (
                                <ModerationBanner
                                    reason={reason}
                                    behavior="warn"
                                    onShow={() => setIsUnmuted(true)}
                                    isDetailView={true}
                                    className="mb-4"
                                />
                            ) : (
                                <>
                                    {/* Media */}
                                    <div className="mb-3">
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
                                    {(post.linkPreview || post.isLinkPreviewPending) && (
                                        <div className="mb-3">
                                            <LinkPreviewCard
                                                preview={post.linkPreview}
                                                isLoading={post.isLinkPreviewPending}
                                            />
                                        </div>
                                    )}

                                    {/* Quoted Post */}
                                    {post.quotePost && (
                                        <div className="mb-3">
                                            <QuotedPost post={post.quotePost} isCard={true} />
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    );
                })()}

                {/* Footer Info: Date & Reply Permission Row */}
                <div className="flex items-center gap-2 pt-3 text-[13.1px] leading-[17px] text-[#405168] dark:text-[#8798B0]">
                    <span>
                        {new Date(post.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        {' · '}
                        {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <button
                        type="button"
                        className={cn(
                            "flex items-center gap-1 hover:opacity-80 transition-opacity",
                            isOwnPost && "cursor-pointer"
                        )}
                        onClick={() => {
                            if (isOwnPost) {
                                setIsInteractionModalOpen(true);
                            }
                        }}
                    >
                        <svg fill="none" width="16" height="16" viewBox="0 0 24 24" className="text-[#8798B0]">
                            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M4.4 9.493C4.14 10.28 4 11.124 4 12a8 8 0 1 0 10.899-7.459l-.953 3.81a1 1 0 0 1-.726.727l-3.444.866-.772 1.533a1 1 0 0 1-1.493.35L4.4 9.493Zm.883-1.84L7.756 9.51l.44-.874a1 1 0 0 1 .649-.52l3.306-.832.807-3.227a7.993 7.993 0 0 0-7.676 3.597ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm8.43.162a1 1 0 0 1 .77-.29l1.89.121a1 1 0 0 1 .494.168l2.869 1.928a1 1 0 0 1 .336 1.277l-.973 1.946a1 1 0 0 1-.894.553h-2.92a1 1 0 0 1-.831-.445L9.225 14.5a1 1 0 0 1 .126-1.262l1.08-1.076Zm.915 1.913.177-.177 1.171.074 1.914 1.286-.303.607h-1.766l-1.194-1.79Z" />
                        </svg>
                        <span className="text-[13.1px] text-[#405168] dark:text-[#8798B0]">
                            {post.replyRestriction === 'nobody'
                                ? t('post.reply_nobody', 'Replies disabled')
                                : post.replyRestriction === 'following'
                                    ? t('post.reply_following', 'People you follow')
                                    : post.replyRestriction === 'followers'
                                        ? t('post.reply_followers', 'Followers')
                                        : post.replyRestriction === 'mentioned'
                                            ? t('post.reply_mentioned', 'People you mention')
                                            : t('post.anyone_can_reply', 'Everybody can reply')}
                        </span>
                    </button>
                </div>

                {/* Stats Row */}
                {(post.likesCount > 0 || post.repostsCount > 0 || (post.quotesCount && post.quotesCount > 0)) && (
                    <div className="flex items-center gap-4 border-t border-gray-200 dark:border-dark-border mt-3 py-2 text-[15px] leading-[20px] text-[#405168] dark:text-[#8798B0]">
                        {post.repostsCount > 0 && (
                            <button 
                                className="flex items-center gap-1 hover:underline group cursor-pointer"
                                onClick={() => navigate(`/profile/${post.author.handle}/post/${post.tid || post.id}/reposted-by`)}
                            >
                                <span className="font-semibold text-gray-900 dark:text-white">{post.repostsCount}</span>
                                <span>{t('post.reposts')}</span>
                            </button>
                        )}
                        {post.quotesCount && post.quotesCount > 0 && (
                            <button 
                                className="flex items-center gap-1 hover:underline group cursor-pointer"
                                onClick={() => navigate(`/profile/${post.author.handle}/post/${post.tid || post.id}/quotes`)}
                            >
                                <span className="font-semibold text-gray-900 dark:text-white">{post.quotesCount}</span>
                                <span>{t('post.quotes')}</span>
                            </button>
                        )}
                        {post.likesCount > 0 && (
                            <button 
                                className="flex items-center gap-1 hover:underline group cursor-pointer"
                                onClick={() => navigate(`/profile/${post.author.handle}/post/${post.tid || post.id}/liked-by`)}
                            >
                                <span className="font-semibold text-gray-900 dark:text-white">{post.likesCount}</span>
                                <span>{t('post.likes')}</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Actions Row */}
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-dark-border py-1 mt-1 -ml-1">
                    <div className="flex items-center flex-1 max-w-[320px]">
                        {/* Reply */}
                        <div className="flex-1 flex items-center">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!currentUser) { dispatch(openAuthWall()); return; }
                                    if (post.canReply === false) { dispatch(showToast({ message: t('post.replies_disabled'), type: 'info' })); return; }
                                    dispatch(openReply(post));
                                }}
                                disabled={post.canReply === false}
                                className="flex items-center gap-1 p-1.5 rounded-full text-[#667B99] hover:bg-primary-500/10 hover:text-primary-500 transition-colors"
                            >
                                <svg fill="none" width="22" height="22" viewBox="0 0 24 24" className="text-current pointer-events-none">
                                    <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M20.002 7a2 2 0 0 0-2-2h-12a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2a1 1 0 0 1 1 1v1.918l3.375-2.7a1 1 0 0 1 .625-.218h5a2 2 0 0 0 2-2V7Zm2 8a4 4 0 0 1-4 4h-4.648l-4.727 3.781A1.001 1.001 0 0 1 7.002 22v-3h-1a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8Z" />
                                </svg>
                                {post.repliesCount ? (
                                    <span className="text-[15px] leading-[20px] font-normal">{post.repliesCount}</span>
                                ) : null}
                            </button>
                        </div>

                        {/* Repost */}
                        <div className="flex-1 flex items-center">
                            <Dropdown
                                trigger={
                                    <button
                                        type="button"
                                        className={cn(
                                            "flex items-center gap-1 p-1.5 rounded-full transition-colors",
                                            post.isReposted ? "text-green-500 hover:bg-green-500/10" : "text-[#667B99] hover:bg-green-500/10 hover:text-green-500"
                                        )}
                                    >
                                        <svg fill="none" width="22" height="22" viewBox="0 0 24 24" className="text-current pointer-events-none">
                                            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M17.957 2.293a1 1 0 1 0-1.414 1.414L17.836 5H6a3 3 0 0 0-3 3v3a1 1 0 1 0 2 0V8a1 1 0 0 1 1-1h11.836l-1.293 1.293a1 1 0 0 0 1.414 1.414l2.47-2.47a1.75 1.75 0 0 0 0-2.474l-2.47-2.47ZM20 12a1 1 0 0 1 1 1v3a3 3 0 0 1-3 3H6.164l1.293 1.293a1 1 0 1 1-1.414 1.414l-2.47-2.47a1.75 1.75 0 0 1 0-2.474l2.47-2.47a1 1 0 0 1 1.414 1.414L6.164 17H18a1 1 0 0 0 1-1v-3a1 1 0 0 1 1-1Z" />
                                        </svg>
                                        {post.repostsCount ? (
                                            <span className="text-[15px] leading-[20px] font-normal">{post.repostsCount}</span>
                                        ) : null}
                                    </button>
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
                        </div>

                        {/* Like */}
                        <div className="flex-1 flex items-center">
                            <button
                                type="button"
                                onClick={handleLike}
                                className={cn(
                                    "flex items-center gap-1 p-1.5 rounded-full transition-colors",
                                    post.isLiked ? "text-red-500 hover:bg-red-500/10" : "text-[#667B99] hover:bg-red-500/10 hover:text-red-500"
                                )}
                            >
                                <svg fill="none" width="22" height="22" viewBox="0 0 24 24" className="text-current pointer-events-none">
                                    <path fill={post.isLiked ? "#EC4899" : "currentColor"} fillRule="evenodd" clipRule="evenodd" d="M16.734 5.091c-1.238-.276-2.708.047-4.022 1.38a1 1 0 0 1-1.424 0C9.974 5.137 8.504 4.814 7.266 5.09c-1.263.282-2.379 1.206-2.92 2.556C3.33 10.18 4.252 14.84 12 19.348c7.747-4.508 8.67-9.168 7.654-11.7-.541-1.351-1.657-2.275-2.92-2.557Zm4.777 1.812c1.604 4-.494 9.69-9.022 14.47a1 1 0 0 1-.978 0C2.983 16.592.885 10.902 2.49 6.902c.779-1.942 2.414-3.334 4.342-3.764 1.697-.378 3.552.003 5.169 1.286 1.617-1.283 3.472-1.664 5.17-1.286 1.927.43 3.562 1.822 4.34 3.764Z" />
                                </svg>
                                {post.likesCount ? (
                                    <span className="text-[15px] leading-[20px] font-normal">{post.likesCount}</span>
                                ) : null}
                            </button>
                        </div>
                    </div>

                    {/* Right Action Icons */}
                    <div className="flex items-center gap-1 justify-end">
                        {/* Bookmark */}
                        <button
                            type="button"
                            onClick={handleBookmark}
                            className={cn(
                                "p-1.5 rounded-full transition-colors",
                                post.isBookmarked ? "text-primary-500 hover:bg-primary-500/10" : "text-[#667B99] hover:bg-primary-500/10 hover:text-primary-500"
                            )}
                        >
                            <svg fill="none" width="22" height="22" viewBox="0 0 24 24" className="text-current pointer-events-none">
                                <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M9.7 16.895a4 4 0 0 1 4.6 0l3.7 2.6V6.5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v12.995l3.7-2.6Zm10.3 2.6c0 1.62-1.825 2.567-3.15 1.636l-3.7-2.6a2.001 2.001 0 0 0-2.3 0l-3.7 2.6C5.825 22.062 4 21.115 4 19.495V6.5a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v12.995Z" />
                            </svg>
                        </button>

                        {/* Share */}
                        <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                            <Dropdown
                                trigger={
                                    <button type="button" className="p-1.5 rounded-full text-[#667B99] hover:bg-primary-500/10 hover:text-primary-500 transition-colors">
                                        <svg fill="none" width="22" height="22" viewBox="0 0 24 24" className="text-current pointer-events-none">
                                            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M11.839 4.744c0-1.488 1.724-2.277 2.846-1.364l.107.094 7.66 7.256.128.134c.558.652.558 1.62 0 2.272l-.128.135-7.66 7.255c-1.115 1.057-2.953.267-2.953-1.27v-2.748c-3.503.055-5.417.41-6.592.97-.997.474-1.525 1.122-2.084 2.14l-.243.46c-.558 1.088-2.09.583-2.08-.515l.015-.748c.111-3.68.777-6.5 2.546-8.415 1.83-1.98 4.63-2.771 8.438-2.884V4.744Zm2 3.256c0 .79-.604 1.41-1.341 1.494l-.149.01c-3.9.057-6.147.813-7.48 2.254-.963 1.043-1.562 2.566-1.842 4.79.38-.327.826-.622 1.361-.877 1.656-.788 4.08-1.14 7.938-1.169l.153.007c.754.071 1.36.704 1.36 1.491v2.675L20.884 12l-7.045-6.676V8Z" />
                                        </svg>
                                    </button>
                                }
                                items={shareDropdownItems}
                                align="right"
                            />
                        </div>

                        {/* More */}
                        <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                            <Dropdown
                                trigger={
                                    <button type="button" className="p-1.5 rounded-full text-[#667B99] hover:bg-gray-500/10 hover:text-gray-900 dark:hover:text-white transition-colors">
                                        <svg fill="none" width="22" height="22" viewBox="0 0 24 24" className="text-current pointer-events-none">
                                            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M2 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm16 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm-6-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
                                        </svg>
                                    </button>
                                }
                                items={moreDropdownItems}
                                align="right"
                            />
                        </div>
                    </div>
                </div>
            </div>
            );
            })()}

            {/* Reply Input */}
            {!currentUser ? (
                <div
                    onClick={() => dispatch(openAuthWall())}
                    className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-dark-border cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                >
                    <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-dark-surface flex-shrink-0" />
                    <div className="flex-1 text-gray-400 dark:text-dark-text-secondary text-sm">
                        {t('auth.sign_in_to_reply', 'Sign in to reply')}
                    </div>
                </div>
            ) : post.canReply !== false ? (
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
                            const MAX_REPLY_DEPTH = 5; // Level 6 in user terms (Root is 0, Replies are 1...6)

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
                                                {hasSubReplies && depth < MAX_REPLY_DEPTH && (
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
                                                depth < MAX_REPLY_DEPTH ? (
                                                    <div>
                                                        {renderTree(subReplies, depth + 1, nextActiveLines)}
                                                    </div>
                                                ) : (
                                                    <div style={{ paddingLeft: (depth + 1) * DEPTH_STEP }}>
                                                        <ThreadMoreReplies 
                                                            count={reply.repliesCount || subReplies.length}
                                                            onClick={() => navigate(`/profile/${reply.author.handle}/post/${reply.id || reply.uri?.split('/').pop()}`)}
                                                            t={t}
                                                            variant="minimal"
                                                        />
                                                    </div>
                                                )
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
                                const lastItem = chain[chain.length - 1];
                                // Search in THE COMBINED REPLIES LIST (including streamed ones), not just store 'posts'
                                const subReplies = sortPosts(replies.filter((p: Post) => {
                                    const pid = p.replyToPostId;
                                    if (!pid || p.id === lastItem.id || p.uri === lastItem.uri) return false;
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
                {isRepliesLoading && (
                    <div className="h-20 flex flex-col items-center justify-center border-t border-gray-100 dark:border-dark-border gap-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
                        <span className="text-xs text-gray-400">
                            {t('common.loading_replies')}
                        </span>
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
                    setReplyRestriction={() => { }}
                    allowQuotes={post.allowQuotes !== false}
                    setAllowQuotes={() => { }}
                    postUri={post.uri!}
                    loading={false}
                />
            )}
        </div>
    );
};

export default PostDetailPage;
