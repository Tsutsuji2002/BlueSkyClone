import React, { useRef, useEffect } from 'react';
import { Post, MutedWord } from '../../types';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { toggleLike, repostPost, toggleBookmark, pinPost, unpinPost } from '../../redux/slices/postsSlice';
import LinkPreviewCard from '../common/LinkPreviewCard';
import { blockUserAsync, muteUserAsync } from '../../redux/slices/userSlice';
import { openReply, openEditPost, openQuote, openDeleteConfirm, openReport, openAuthWall, openMutedWords } from '../../redux/slices/modalsSlice';
import { useMuteThreadMutation, useUnmuteThreadMutation } from '../../redux/api/postApi';
import {
    PostTranslateIcon,
    PostCopyTextIcon,
    PostMuteThreadIcon,
    PostMuteWordsIcon,
    PostHideIcon,
    PostMuteAccountIcon,
    PostBlockAccountIcon,
    PostReportIcon,
    PostPinIcon,
    PostDeleteIcon
} from '../common/PostDropdownIcons';
import QuotedPost from './QuotedPost';
import { showToast } from '../../redux/slices/toastSlice';
import { usePostActions } from '../../hooks/usePostActions';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import Avatar from '../common/Avatar';
import Dropdown, { DropdownItem } from '../common/Dropdown';
import ModerationBanner from '../common/ModerationBanner';
import UserHoverCard from '../common/UserHoverCard';
import { cn } from '../../utils/classNames';
import { useNavigate, Link } from 'react-router-dom';
import MediaGrid from './MediaGrid';
import { formatPostDate } from '../../utils/formatDate';
import RichText from '../common/RichText';
import ExpandableRichText from '../common/ExpandableRichText';
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
    FiX,
    FiPaperclip as FiPin
} from 'react-icons/fi';
import { BsPatchCheckFill } from 'react-icons/bs';
import { useTranslation } from 'react-i18next';
import { formatHandleText } from '../../utils/identity';

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
    // Feed interaction signals
    onSeen?: (uri: string) => void;
    feedContext?: string;
}

const normalizeLowercaseStrings = (values: unknown[]): string[] => {
    return values
        .map((value) => {
            if (typeof value === 'string') return value;
            if (value && typeof value === 'object') {
                const record = value as Record<string, unknown>;
                if (typeof record.val === 'string') return record.val;
                if (typeof record.label === 'string') return record.label;
                if (typeof record.name === 'string') return record.name;
            }

            return null;
        })
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.toLowerCase());
};

const PostCard: React.FC<PostCardProps> = React.memo(({ post: postData, isOwnPost: isOwnPostProp, isComment = false, isInListContext = false, onRemoveFromList, hasTopLine, hasBottomLine, hideBorder, indentFactor, onSeen, feedContext }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { handleTranslate, handleCopyText, handleCopyLink, handleEmbedPost, openShareModal, primaryLangName } = usePostActions();
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const actionLoading = useAppSelector((state: RootState) => state.posts.actionLoading);
    const interactionTruth = useAppSelector((state: RootState) => {
        const uri = postData.uri?.toLowerCase();
        const id = postData.id?.toLowerCase();
        const tid = postData.tid?.toLowerCase();
        
        const result = (uri && state.posts.interactionTruth[uri]) || 
                       (id && state.posts.interactionTruth[id]) || 
                       (tid && state.posts.interactionTruth[tid]);
        
        if (result) {
            // console.log(`[PostCard Selector] Resolved Truth for ${uri}:`, result);
        }
        
        return result || null;
    });
    
    // Merge global interaction truth with the local post object data
    const post = React.useMemo(() => {
        if (!interactionTruth) return postData;
        return {
            ...postData,
            ...interactionTruth
        };
    }, [postData, interactionTruth]);

    const [isUnmuted, setIsUnmuted] = React.useState(false);
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [muteThreadMutation] = useMuteThreadMutation();
    const [unmuteThreadMutation] = useUnmuteThreadMutation();
    const [isThreadMuted, setIsThreadMuted] = React.useState<boolean>(!!post?.viewer?.threadMuted);
    const [isPostHidden, setIsPostHidden] = React.useState<boolean>(false);

    React.useEffect(() => {
        if (post?.viewer?.threadMuted !== undefined) {
            setIsThreadMuted(!!post.viewer.threadMuted);
        }
    }, [post?.viewer?.threadMuted]);

    React.useEffect(() => {
        try {
            const hidden = JSON.parse(localStorage.getItem('bluesky_hidden_posts') || '[]');
            if ((post.uri && hidden.includes(post.uri)) || (post.id && hidden.includes(post.id))) {
                setIsPostHidden(true);
            }
        } catch {}
    }, [post.uri, post.id]);

    const handleToggleMuteThread = async () => {
        if (!currentUser) {
            dispatch(openAuthWall());
            return;
        }
        const rootUri = post.uri;
        if (!rootUri) return;
        try {
            if (isThreadMuted) {
                await unmuteThreadMutation({ root: rootUri }).unwrap();
                setIsThreadMuted(false);
                dispatch(showToast({ message: t('post.thread_unmuted', 'Thread unmuted'), type: 'success' }));
            } else {
                await muteThreadMutation({ root: rootUri }).unwrap();
                setIsThreadMuted(true);
                dispatch(showToast({ message: t('post.thread_muted', 'Thread muted'), type: 'success' }));
            }
        } catch (err: any) {
            dispatch(showToast({ message: err?.data?.message || err?.message || 'Failed to update thread mute', type: 'error' }));
        }
    };

    const handleHidePost = () => {
        const targetUri = post.uri || post.id;
        if (targetUri) {
            try {
                const hidden = JSON.parse(localStorage.getItem('bluesky_hidden_posts') || '[]');
                if (!hidden.includes(targetUri)) {
                    hidden.push(targetUri);
                    localStorage.setItem('bluesky_hidden_posts', JSON.stringify(hidden));
                }
            } catch {}
            setIsPostHidden(true);
            dispatch(showToast({ message: isComment ? t('post.hide_reply', 'Hide reply for me') : t('post.post_hidden', 'Post hidden for me'), type: 'info' }));
        }
    };

    // Report interactionSeen when this card scrolls into view (≥50% visible, ≥100ms dwell)
    useEffect(() => {
        if (!onSeen || !postData.uri || !postData.uri.startsWith('at://')) return;
        const el = cardRef.current;
        if (!el) return;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    timer = setTimeout(() => onSeen(postData.uri!), 100);
                } else {
                    if (timer) { clearTimeout(timer); timer = null; }
                }
            },
            { threshold: 0.5 }
        );
        observer.observe(el);
        return () => { observer.disconnect(); if (timer) clearTimeout(timer); };
    }, [postData.uri, onSeen]);

    const isOwnPost = isOwnPostProp ?? (
        currentUser?.id === post.author?.id ||
        (currentUser?.did && post.author?.did && currentUser.did === post.author.did) ||
        (currentUser?.handle && post.author?.handle && currentUser.handle === post.author.handle)
    );

    // CRITICAL FIX: For posts by current user, dynamically read fresh avatar from auth state
    // This ensures profile updates reflect immediately in all posts, regardless of where posts are stored
    const displayAuthor = React.useMemo(() => {
        if (!isOwnPost || !currentUser) return post.author;
        
        // For own posts, overlay fresh data from currentUser
        return {
            ...post.author,
            avatarUrl: currentUser.avatarUrl,
            avatar: currentUser.avatar,
            displayName: currentUser.displayName,
            bio: currentUser.bio,
        };
    }, [isOwnPost, currentUser, post.author]);

    const mutedWords = useAppSelector((state: RootState) => (state.user as any).mutedWords as MutedWord[] ?? []);

    const moderationSettings = useAppSelector((state: RootState) => state.auth.settings);

    // Client-side muted word + label content moderation — mirrors backend EnrichAndFilterPostsAsync
    const effectiveMuteInfo = React.useMemo(() => {
        if (isOwnPost) return post.muteInfo; // never filter own posts

        // --- 1. Check post labels against moderation settings ---
        const labels = normalizeLowercaseStrings(post.labels || []);
        if (labels.length > 0 && moderationSettings) {
            const { enableAdultContent, adultContentFilter, sexuallyExplicitFilter, graphicMediaFilter, nonSexualNudityFilter } = moderationSettings;
            let worstBehavior: 'hide' | 'warn' | null = null;
            let worstReason = '';

            for (const label of labels) {
                let filter: 'show' | 'warn' | 'hide' = 'show';
                let reason = '';
                const isAdult = ['porn', 'sexual', 'nudity', 'graphic-media', 'nsfw', 'adult', 'sexual-explicit', 'sexual-suggestive'].includes(label);

                if (['porn', 'sexual-explicit', 'sexual'].includes(label)) {
                    filter = sexuallyExplicitFilter ?? (enableAdultContent ? 'warn' : 'hide');
                    reason = 'sexually_explicit';
                } else if (['nsfw', 'adult', 'sexual-suggestive'].includes(label)) {
                    filter = adultContentFilter ?? (enableAdultContent ? 'warn' : 'hide');
                    reason = 'adult_content';
                } else if (['graphic-media', 'gore', 'violence'].includes(label)) {
                    filter = graphicMediaFilter ?? (enableAdultContent ? 'warn' : 'hide');
                    reason = 'graphic_media';
                } else if (label === 'nudity') {
                    filter = nonSexualNudityFilter ?? (enableAdultContent ? 'show' : 'hide');
                    reason = 'non_sexual_nudity';
                } else if (label === '!hide') {
                    filter = 'hide'; reason = 'sensitive_content';
                } else if (label === '!warn') {
                    filter = 'warn'; reason = 'sensitive_content';
                }

                // Global adult content disable overrides individual settings
                if (!enableAdultContent && isAdult) { filter = 'hide'; }

                if (filter === 'hide') { worstBehavior = 'hide'; worstReason = reason; break; }
                if (filter === 'warn' && worstBehavior == null) { worstBehavior = 'warn'; worstReason = reason; }
            }

            if (worstBehavior) {
                return { isMuted: true, behavior: worstBehavior, reason: worstReason };
            }
        }

        // --- 2. Backend already flagged it (don't double-check muted words) ---
        if (post.muteInfo?.isMuted) return post.muteInfo;

        // --- 3. Client-side muted word matching ---
        if (!mutedWords.length) return post.muteInfo;
        const content = typeof post.content === 'string' ? post.content.toLowerCase() : String(post.content ?? '').toLowerCase();
        const tags = normalizeLowercaseStrings(post.tags || []);
        for (const mw of mutedWords) {
            const word = (mw.word || '').toLowerCase().replace(/^#/, '');
            if (!word) continue;

            // Check expiration
            if (mw.expiresAt && new Date(mw.expiresAt) < new Date()) continue;

            // Check follow exclusion
            if (mw.excludeFollowing && (post.author?.isFollowing || post.author?.viewer?.following)) continue;

            const targets = (mw.targets || 'content').split(',').map((t: string) => t.trim()).filter(Boolean);
            const matchContent = targets.includes('content') && content.includes(word);
            const matchTag = targets.includes('tag') && tags.includes(word);
            if (matchContent || matchTag) {
                return {
                    isMuted: true,
                    behavior: mw.muteBehavior === 'hide' ? 'hide' as const : 'warn' as const,
                    reason: 'muted_word',
                };
            }
        }
        return post.muteInfo;
    }, [post.muteInfo, post.content, post.tags, post.labels, mutedWords, isOwnPost, moderationSettings]);


    const handleCardClick = () => {
        navigate(`/profile/${post.author.handle}/post/${post.tid || post.id}`);
    };

    // handleBookmark removed as not supported by standard BSky lexicons yet
    const ensureAuth = (callback: () => void) => {
        if (!currentUser) {
            dispatch(openAuthWall());
            return;
        }
        callback();
    };


    const handleAvatarClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/profile/${post.author.handle}`);
    };

    const shareDropdownItems: DropdownItem[] = [
        {
            id: 'copy-link',
            label: t('post.copy_link'),
            icon: <FiLink />,
            onClick: () => handleCopyLink(post.author?.handle || 'Unknown', post.tid || post.id),
        },
        ...(currentUser ? [{
            id: 'send-message',
            label: t('post.send_via_message'),
            icon: <FiSend />,
            onClick: () => openShareModal(post),
        }] : []),
        {
            id: 'embed',
            label: t('post.embed_post'),
            icon: <FiCode />,
            onClick: () => handleEmbedPost(post.author?.handle || 'Unknown', post.tid || post.id, post.content),
        },
    ];


    // Build more dropdown items based on context
    const moreDropdownItems: DropdownItem[] = (isInListContext ? [
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
        ...(currentUser && onRemoveFromList ? [
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
            testId: 'postDropdownTranslateBtn',
            label: t('post.translate', 'Translate'),
            icon: <PostTranslateIcon />,
            onClick: () => handleTranslate(post.content),
        },
        {
            id: 'copy-text',
            testId: 'postDropdownCopyTextBtn',
            label: t('post.copy_text', 'Copy post text'),
            icon: <PostCopyTextIcon />,
            hasDivider: true,
            onClick: () => handleCopyText(post.content)
        },
        ...(currentUser ? [
            ...(!isOwnPost ? [
                {
                    id: 'mute-thread',
                    testId: 'postDropdownMuteThreadBtn',
                    label: isThreadMuted ? t('post.unmute_thread', 'Unmute thread') : t('post.mute_thread', 'Mute thread'),
                    icon: <PostMuteThreadIcon />,
                    onClick: handleToggleMuteThread,
                },
                {
                    id: 'muted-words-tags',
                    testId: 'postDropdownMuteWordsBtn',
                    label: t('post.mute_words', 'Mute words & tags'),
                    icon: <PostMuteWordsIcon />,
                    hasDivider: true,
                    onClick: () => dispatch(openMutedWords()),
                },
                {
                    id: isComment ? 'hide-reply' : 'hide-post',
                    testId: 'postDropdownHideBtn',
                    label: isComment ? t('post.hide_reply', 'Hide reply for me') : t('post.hide_post', 'Hide post for me'),
                    icon: <PostHideIcon />,
                    hasDivider: true,
                    onClick: handleHidePost,
                },
                {
                    id: 'mute-account',
                    testId: 'postDropdownMuteBtn',
                    label: t('post.mute_account', 'Mute account'),
                    icon: <PostMuteAccountIcon />,
                    onClick: () => {
                        const authorActor = post.author?.did || post.author?.handle || post.author?.id;
                        if (authorActor) {
                            dispatch(muteUserAsync(authorActor));
                            dispatch(showToast({ message: t('profile.muted_success', 'Account muted'), type: 'success' }));
                        }
                    },
                },
                {
                    id: 'block-account',
                    testId: 'postDropdownBlockBtn',
                    label: t('post.block_account', 'Block account'),
                    icon: <PostBlockAccountIcon />,
                    onClick: () => {
                        const authorActor = post.author?.did || post.author?.handle || post.author?.id;
                        if (authorActor) {
                            dispatch(blockUserAsync(authorActor));
                            dispatch(showToast({ message: t('profile.blocked_success', 'Account blocked'), type: 'success' }));
                        }
                    },
                },
                {
                    id: 'report-post',
                    testId: 'postDropdownReportBtn',
                    label: t('post.report_post', 'Report post'),
                    icon: <PostReportIcon />,
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
                    icon: <PostDeleteIcon />,
                    onClick: () => dispatch(openDeleteConfirm({ postUri: post.uri!, isListRemoval: true, onConfirm: onRemoveFromList })),
                    danger: true,
                }
            ] : []),
            ...(isOwnPost ? [
                { id: 'divider-own', label: '', icon: null, onClick: () => { }, hasDivider: true },
                {
                    id: 'pin',
                    testId: 'postDropdownPinBtn',
                    label: post.isPinned ? t('post.unpin_from_profile', 'Unpin from profile') : t('post.pin_to_profile', 'Pin to profile'),
                    icon: <PostPinIcon />,
                    hasDivider: true,
                    onClick: () => {
                        if (post.isPinned) {
                            dispatch(unpinPost());
                            dispatch(showToast({ message: t('post.unpinned_success', 'Post unpinned from profile'), type: 'success' }));
                        } else {
                            dispatch(pinPost(post.uri!));
                            dispatch(showToast({ message: t('post.pinned_success', 'Post pinned to profile'), type: 'success' }));
                        }
                    }
                },
                {
                    id: 'delete',
                    testId: 'postDropdownDeleteBtn',
                    label: t('common.delete_post', 'Delete post'),
                    icon: <PostDeleteIcon />,
                    onClick: () => dispatch(openDeleteConfirm({ postUri: post.uri! })),
                    danger: true,
                },
            ] : []),
        ] : []),
    ]);

    if (isPostHidden) {
        return (
            <div className="p-3 text-[13.1px] text-gray-500 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
                <span>{t('post.post_hidden_notice', 'You hid this post for yourself.')}</span>
                <button
                    type="button"
                    onClick={() => {
                        try {
                            const hidden = JSON.parse(localStorage.getItem('bluesky_hidden_posts') || '[]').filter((id: string) => id !== post.uri && id !== post.id);
                            localStorage.setItem('bluesky_hidden_posts', JSON.stringify(hidden));
                        } catch {}
                        setIsPostHidden(false);
                    }}
                    className="text-primary-500 font-semibold hover:underline cursor-pointer"
                >
                    {t('common.undo', 'Undo')}
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

    if (!post.author) {
        return null;
    }

    return (
        <div
            ref={cardRef}
            className={cn(
                "hover:bg-gray-100/50 dark:hover:bg-dark-surface/50 transition-colors cursor-pointer",
                hideBorder ? "" : "border-b border-[#DCE2EA] dark:border-[#232E3E]"
            )}
            onClick={handleCardClick}
        >
            {/* Repost Banner */}
            {(post.isReposted || post.repostedBy) && (
                <div className="flex flex-row gap-[10px] px-3 pt-2 pb-0">
                    <div className="w-[42px] shrink-0" />
                    <div
                        className="flex items-center gap-1.5 text-[13.1px] font-medium text-[#405168] dark:text-dark-text-secondary hover:underline cursor-pointer transition-colors leading-[17px] min-w-0 truncate"
                        onClick={(e) => {
                            e.stopPropagation();
                            const handle = post.repostedBy?.handle || currentUser?.handle;
                            if (handle) navigate(`/profile/${handle}`);
                        }}
                    >
                        <FiRepeat size={13} className={post.isReposted ? "text-green-500 flex-shrink-0" : "text-[#405168] flex-shrink-0"} />
                        <span className="truncate">
                            {post.repostedBy
                                ? ((post.repostedBy.did !== currentUser?.did && post.repostedBy.handle !== currentUser?.handle)
                                    ? t('post.reposted_by', { name: post.repostedBy.displayName || post.repostedBy.handle || 'Unknown' })
                                    : t('post.reposted_by_you', 'Reposted by you'))
                                : (post.isReposted ? t('post.reposted_by_you', 'Reposted by you') : t('post.reposted', 'Reposted'))}
                        </span>
                    </div>
                </div>
            )}

            {/* Pinned Banner */}
            {post.isPinned && (
                <div className="flex flex-row gap-[10px] px-3 pt-2 pb-0">
                    <div className="w-[42px] shrink-0" />
                    <div className="flex items-center gap-1.5 text-[13.1px] font-medium text-[#405168] dark:text-dark-text-secondary transition-colors leading-[17px]">
                        <svg fill="none" width="13" height="13" viewBox="0 0 24 24" className="text-[#405168] dark:text-dark-text-secondary flex-shrink-0">
                            <path fill="currentColor" stroke="none" strokeWidth="0" fillRule="evenodd" clipRule="evenodd" d="M6.5 3a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v3.997a6.25 6.25 0 0 0 1.83 4.42l.377.376A1 1 0 0 1 20 12.5V15a1 1 0 0 1-1 1h-6v5a1 1 0 1 1-2 0v-5H5a1 1 0 0 1-1-1v-2.5a1 1 0 0 1 .293-.707l.376-.377A6.25 6.25 0 0 0 6.5 6.996V3.001Zm2 1v2.997a8.25 8.25 0 0 1-2.416 5.834L6 12.914V14h12v-1.086l-.084-.083A8.25 8.25 0 0 1 15.5 6.997V4h-7Z" />
                        </svg>
                        <span>{t('post.pinned', 'Pinned')}</span>
                    </div>
                </div>
            )}
            {/* Feed Banner */}
            {post.listCaption && (
                <div className="flex flex-row gap-[10px] px-3 pt-2 pb-0">
                    <div className="w-[42px] shrink-0" />
                    <div className="flex items-center gap-1.5 text-[13.1px] font-medium text-[#405168] dark:text-dark-text-secondary transition-colors leading-[17px]">
                        <FiHash size={13} className="text-[#405168] flex-shrink-0" />
                        <span>{post.listCaption}</span>
                    </div>
                </div>
            )}
            <div
                className={cn("px-3 pt-2 pb-2", isComment && "pb-3")}
                style={{ paddingLeft: indentFactor ? `${12 + indentFactor * 32}px` : undefined }}
            >
                <div className="flex gap-[10px]">
                    {/* Avatar */}
                    <div className="flex-shrink-0 relative flex flex-col items-center w-[42px]">
                        {hasTopLine && (
                            <div className="absolute top-[-12px] bottom-[auto] w-[2px] h-[12px] bg-gray-200 dark:bg-dark-border z-0" />
                        )}
                        <div className="z-10 bg-white dark:bg-dark-bg cursor-pointer rounded-full flex-shrink-0 w-[42px] h-[42px] overflow-hidden">
                            <UserHoverCard user={displayAuthor}>
                                <div onClick={handleAvatarClick} className="w-full h-full">
                                    <Avatar
                                        src={displayAuthor.avatarUrl || displayAuthor.avatar}
                                        alt={displayAuthor.displayName || displayAuthor.handle || '?'}
                                        size="md"
                                        className="w-[42px] h-[42px] rounded-full object-cover"
                                    />
                                </div>
                            </UserHoverCard>
                        </div>
                        {hasBottomLine && (
                            <div className="absolute top-[40px] bottom-[-12px] w-[2px] bg-gray-200 dark:bg-dark-border z-0" />
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center pb-1 min-w-0 flex-nowrap leading-[17px] z-20">
                            <div className="flex items-baseline shrink min-w-0 max-w-full">
                                <UserHoverCard user={displayAuthor} className="inline-flex min-w-0 max-w-[70%] shrink-0">
                                    <span
                                        className="font-semibold text-[15px] text-gray-900 dark:text-white truncate hover:underline inline-flex items-center gap-0.5 min-w-0 max-w-full"
                                        onClick={handleAvatarClick}
                                        title={displayAuthor.displayName || displayAuthor.handle || 'Unknown'}
                                    >
                                        {displayAuthor.displayName || displayAuthor.handle || 'Unknown'}
                                        {post.author.isVerified && (
                                            <BsPatchCheckFill className="text-blue-500 shrink-0" size={14} />
                                        )}
                                    </span>
                                </UserHoverCard>
                                <span
                                    className="text-[15px] text-[#405168] dark:text-[#8798B0] truncate shrink-[10] min-w-0 pl-1"
                                    title={displayAuthor.handle || ''}
                                >
                                    {displayAuthor.handle?.startsWith('did:') ? '' : formatHandleText(displayAuthor.handle)}
                                </span>
                                <span className="text-[15px] text-[#405168] dark:text-[#8798B0] pl-1 whitespace-nowrap shrink-0">
                                    · {formatPostDate(post.createdAt, i18n.language)}
                                </span>
                            </div>
                        </div>

                        {post.replyToHandle && !hasTopLine && (
                            <div className="flex items-center gap-1 mb-1.5 text-gray-500 dark:text-dark-text-secondary select-none">
                                <FiMessageCircle size={14} className="flex-shrink-0 opacity-70" />
                                <span className="text-[14px]">{t('post.reply_to', 'Reply to')}</span>
                                <span
                                    className="text-primary-500 text-[14px] font-medium hover:underline cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/profile/${post.replyToHandle}`);
                                    }}
                                >
                                    @{post.replyToHandle}
                                </span>
                            </div>
                        )}

                        {/* Curated List Caption - Removed to avoid duplication as requested */}

                        {/* Post Content & Moderation UI */}
                        {(() => {
                            const isMuted = effectiveMuteInfo?.isMuted && !isUnmuted;
                            const behavior = effectiveMuteInfo?.behavior;
                            const reason = effectiveMuteInfo?.reason || t('moderation.sensitive_content', 'Sensitive Content');

                            // If hidden, show only banner (already handled by returning early in some layouts, 
                            // but here we ensure complete suppression for both 'hide' and 'warn')
                            if (isMuted && (behavior === 'hide' || behavior === 'warn')) {
                                return (
                                    <ModerationBanner
                                        reason={reason}
                                        behavior={behavior as 'hide' | 'warn'}
                                        onShow={reason === 'Authentication Required' ? undefined : () => setIsUnmuted(true)}
                                    />
                                );
                            }

                            // Normal content rendering
                            return (
                                <>
                                    <ExpandableRichText
                                        content={post.content === '[Remote interaction...]' ? '' : post.content}
                                        facets={post.facets}
                                        className="text-[15px] text-gray-900 dark:text-white whitespace-pre-wrap break-words leading-[20px] tracking-[0.25px]"
                                        maxLines={6}
                                        maxChars={400}
                                    />

                                    {(() => {
                                        const hasLinkPreview = post.linkPreview || post.isLinkPreviewPending;
                                        if (hasLinkPreview) {
                                            return (
                                                <LinkPreviewCard
                                                    preview={post.linkPreview}
                                                    isLoading={post.isLinkPreviewPending}
                                                />
                                            );
                                        }
                                        return null;
                                    })()}

                                    {/* Media */}
                                    <div className="mb-2 mt-2">
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

                                    {post.quotePost && (
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <QuotedPost post={post.quotePost} />
                                        </div>
                                    )}
                                </>
                            );
                        })()}

                        {/* Interaction Status */}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-1 gap-3 text-[#667B99] dark:text-[#8798B0]">
                            <div className="flex items-center flex-1 max-w-[320px] justify-between">
                                <button
                                    className={cn(
                                        "flex items-center gap-1 group transition-colors p-1.5 rounded-full hover:bg-blue-500/10",
                                        post.canReply === false
                                            ? "text-gray-300 dark:text-gray-700 cursor-not-allowed"
                                            : "hover:text-blue-500"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        ensureAuth(() => {
                                            if (post.canReply === false) {
                                                dispatch(showToast({ message: t('post.replies_disabled'), type: 'info' }));
                                                return;
                                            }
                                            dispatch(openReply(post));
                                        });
                                    }}
                                    title={post.canReply === false ? t('post.replies_disabled') : undefined}
                                >
                                    <FiMessageCircle size={18} />
                                    <span className={cn("text-[13.1px] font-normal", post.repliesCount > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>{post.repliesCount}</span>
                                </button>

                                <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                                    <Dropdown
                                        trigger={
                                            <button
                                                className={cn(
                                                    "flex items-center gap-1 group transition-colors p-1.5 rounded-full hover:bg-green-500/10",
                                                    post.isReposted ? "text-green-500" : "hover:text-green-500"
                                                )}
                                            >
                                                <FiRepeat size={18} className={post.isReposted ? "stroke-[2.5px]" : ""} />
                                                <span className={cn("text-[13.1px] font-normal", post.repostsCount > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>{post.repostsCount}</span>
                                            </button>
                                        }
                                        items={[
                                            {
                                                id: 'repost',
                                                label: post.isReposted ? t('post.undo_repost', 'Undo repost') : t('post.repost', 'Repost'),
                                                icon: <FiRepeat />,
                                                onClick: () => ensureAuth(() => dispatch(repostPost({ uri: post.uri!, cid: post.cid!, isReposted: !!post.isReposted, repostUri: post.viewer?.repost, currentRepostsCount: post.repostsCount })))
                                            },
                                            {
                                                id: 'quote',
                                                label: t('post.quote_post', 'Quote post'),
                                                icon: <FiType />,
                                                onClick: () => ensureAuth(() => dispatch(openQuote(post)))
                                            }
                                        ]}
                                        align="left"
                                    />
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        ensureAuth(() => dispatch(toggleLike({ uri: post.uri!, cid: post.cid!, isLiked: !!post.isLiked, likeUri: post.viewer?.like ?? post.likeUri, currentLikesCount: post.likesCount })));
                                    }}
                                    className={cn(
                                        "flex items-center gap-1 group transition-colors p-1.5 rounded-full hover:bg-red-500/10",
                                        post.isLiked ? "text-red-600" : "hover:text-red-500"
                                    )}
                                >
                                    <FiHeart size={18} className={post.isLiked ? "fill-current stroke-red-600" : ""} />
                                    <span className={cn("text-[13.1px] font-normal", post.likesCount > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>{post.likesCount > 1000 ? `${(post.likesCount / 1000).toFixed(1)} ${t('common.user').startsWith('N') ? 'N' : 'K'}` : post.likesCount}</span>
                                </button>
                            </div>

                            <div className="flex items-center justify-end gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        ensureAuth(() => dispatch(toggleBookmark({ post })));
                                    }}
                                    className={cn(
                                        "flex items-center group transition-colors p-1.5 rounded-full hover:bg-yellow-500/10",
                                        post.isBookmarked ? "text-yellow-600" : "hover:text-yellow-500"
                                    )}
                                >
                                    <FiBookmark size={18} className={post.isBookmarked ? "fill-current" : ""} />
                                </button>

                                <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                                    <Dropdown
                                        trigger={
                                            <button className="flex items-center hover:text-primary-500 transition-colors p-1.5 rounded-full hover:bg-primary-500/10">
                                                <svg fill="none" width="18" height="18" viewBox="0 0 24 24" className="text-current pointer-events-none">
                                                    <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M11.839 4.744c0-1.488 1.724-2.277 2.846-1.364l.107.094 7.66 7.256.128.134c.558.652.558 1.62 0 2.272l-.128.135-7.66 7.255c-1.115 1.057-2.953.267-2.953-1.27v-2.748c-3.503.055-5.417.41-6.592.97-.997.474-1.525 1.122-2.084 2.14l-.243.46c-.558 1.088-2.09.583-2.08-.515l.015-.748c.111-3.68.777-6.5 2.546-8.415 1.83-1.98 4.63-2.771 8.438-2.884V4.744Zm2 3.256c0 .79-.604 1.41-1.341 1.494l-.149.01c-3.9.057-6.147.813-7.48 2.254-.963 1.043-1.562 2.566-1.842 4.79.38-.327.826-.622 1.361-.877 1.656-.788 4.08-1.14 7.938-1.169l.153.007c.754.071 1.36.704 1.36 1.491v2.675L20.884 12l-7.045-6.676V8Z" />
                                                </svg>
                                            </button>
                                        }
                                        items={shareDropdownItems}
                                        align="right"
                                    />
                                </div>

                                <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                                    <Dropdown
                                        trigger={
                                            <button className="flex items-center hover:text-primary-500 transition-colors p-1.5 rounded-full hover:bg-primary-500/10">
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
                </div>

            </div>
        </div>
    );
});

export default PostCard;
