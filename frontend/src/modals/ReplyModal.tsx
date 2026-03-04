import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { closeReply } from '../redux/slices/modalsSlice';
import { createPost } from '../redux/slices/postsSlice';
import { showToast } from '../redux/slices/toastSlice';

import Avatar from '../components/common/Avatar';
import GifPicker from '../components/common/GifPicker';
import { FiX, FiImage, FiSmile } from 'react-icons/fi';
import { TbWorld } from 'react-icons/tb';
import { useTranslation } from 'react-i18next';
import { POST_CHARACTER_LIMIT } from '../constants';
import { detectLanguage } from '../utils/languageDetector';
import { PostImage, PostVideo, LinkPreview } from '../types';
import AltTextModal from '../modals/AltTextModal';
import { cn } from '../utils/classNames';
import { getLinkMetadata } from '../utils/linkMetadata';
import ConfirmModal from '../components/common/ConfirmModal';
import { useUserSearch } from '../hooks/useUserSearch';
import MentionSuggester from '../components/common/MentionSuggester';
import { User } from '../types';
import { RootState } from '../redux/store';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

/* ────────────────────────────────────────────────────────────────────
   Small helper: render the original post's media attachments inline
   as tiny thumbnails (≤ 60 px) to the right of the text.
──────────────────────────────────────────────────────────────────── */
const OriginalPostMedia: React.FC<{ post: any }> = ({ post }) => {
    // Prefer: media array > imageUrls array > videoUrl > linkPreview
    const allMedia: { url: string; type?: string; alt?: string }[] =
        post.media && post.media.length > 0
            ? post.media
            : (post.imageUrls || []).map((u: string) => ({ url: u, type: 'image' }));

    const videoUrl = post.videoUrl || (post.video?.url ?? null);
    const linkPreview: any = post.linkPreview ?? null;

    // Up to 4 images
    const images = allMedia.filter(m => !m.type || m.type === 'image').slice(0, 4);
    // Has video
    const hasVideo = !!(videoUrl || allMedia.find(m => m.type === 'video'));
    const resolvedVideoUrl = videoUrl || allMedia.find(m => m.type === 'video')?.url;

    if (images.length === 0 && !hasVideo && !linkPreview) return null;

    if (images.length > 0) {
        return (
            <div className={cn("flex gap-1 flex-shrink-0", images.length === 1 ? "" : "")}>
                {images.map((img, i) => (
                    <div
                        key={i}
                        className={cn(
                            "rounded-lg overflow-hidden bg-gray-800 flex-shrink-0",
                            images.length === 1 ? "w-[70px] h-[70px]" : "w-[44px] h-[44px]"
                        )}
                    >
                        <img
                            src={img.url}
                            alt={img.alt || ''}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ))}
            </div>
        );
    }

    if (hasVideo && resolvedVideoUrl) {
        return (
            <div className="w-[70px] h-[70px] rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 relative">
                <video src={resolvedVideoUrl} className="w-full h-full object-cover" muted preload="metadata" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="w-5 h-5 border-2 border-white rounded-full flex items-center justify-center">
                        <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-white ml-0.5" />
                    </div>
                </div>
            </div>
        );
    }

    if (linkPreview) {
        return (
            <div className="w-[70px] h-[70px] rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 relative">
                {linkPreview.image
                    ? <img src={linkPreview.image} alt={linkPreview.title || ''} className="w-full h-full object-cover" />
                    : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-1 gap-0.5">
                            <span className="text-[9px] text-gray-400 text-center leading-tight line-clamp-2">
                                {linkPreview.domain || 'link'}
                            </span>
                        </div>
                    )
                }
            </div>
        );
    }

    return null;
};

/* ════════════════════════════════════════════════════════════════════
   ReplyModal
════════════════════════════════════════════════════════════════════ */
const ReplyModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const { t, i18n } = useTranslation();
    const { isOpen, post } = useAppSelector((state: RootState) => state.modals.reply);
    const user = useAppSelector((state: RootState) => state.auth.user);
    const isPostLoading = useAppSelector((state: RootState) => state.posts.isLoading);

    // Reply composer state
    const [content, setContent] = useState('');
    const [images, setImages] = useState<PostImage[]>([]);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [video, setVideo] = useState<PostVideo | null>(null);
    const [selectedGifUrl, setSelectedGifUrl] = useState<string | null>(null);

    // UI toggles
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);

    // Link preview
    const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
    const [isLinkLoading, setIsLinkLoading] = useState(false);
    const [stickyLink, setStickyLink] = useState<string | null>(null);
    const [dismissedLinks, setDismissedLinks] = useState<Set<string>>(new Set());

    // Other modals
    const [isAltModalOpen, setIsAltModalOpen] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);

    // Mention
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
    const { results: mentionResults, isLoading: isMentionLoading } = useUserSearch(mentionSearch);

    // Language
    const uiLanguage = useAppSelector((state: RootState) => (state as any).language?.appLanguage) || i18n.language || 'en';
    const [replyLanguage, setReplyLanguage] = useState<string>('');
    const [languageAccepted, setLanguageAccepted] = useState(false);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const prevContentRef = useRef('');

    // ── Bootstrap reply language on open ──────────────────────────
    useEffect(() => {
        if (isOpen && !replyLanguage) setReplyLanguage(uiLanguage);
    }, [isOpen, replyLanguage, uiLanguage]);

    // ── Auto-detect language while typing ─────────────────────────
    useEffect(() => {
        if (!isOpen || content.trim().length < 5 || languageAccepted) return;
        const detected = detectLanguage(content);
        if (detected && detected !== replyLanguage) setReplyLanguage(detected);
    }, [content, isOpen, languageAccepted, replyLanguage]);

    // ── Link preview detection ─────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const urlRe = /(https?:\/\/[^\s]+)/g;
        const cur = (content.match(urlRe) || []) as string[];
        const prev = (prevContentRef.current.match(urlRe) || []) as string[];
        const count = (arr: string[]) => {
            const m: Record<string, number> = {};
            arr.forEach(v => (m[v] = (m[v] || 0) + 1));
            return m;
        };
        const cc = count(cur), pc = count(prev);
        const added = cur.find(l => cc[l] > (pc[l] || 0));
        const isPaste = added && content.length - prevContentRef.current.length > 1;
        const isSpace = content.endsWith(' ') || content.endsWith('\n');
        if (added && (isPaste || isSpace || (!linkPreview && added))) {
            if (!stickyLink || added !== stickyLink) {
                (async () => {
                    setIsLinkLoading(true);
                    const meta = await getLinkMetadata(added);
                    if (meta) { setStickyLink(added); setLinkPreview(meta); }
                    setIsLinkLoading(false);
                })();
            }
        }
        prevContentRef.current = content;
    }, [content, stickyLink, isOpen, linkPreview]);

    // ── Handlers ──────────────────────────────────────────────────
    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const v = e.target.value;
        const cursor = e.target.selectionStart;
        setContent(v);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 250)}px`;

        const atMatch = v.slice(0, cursor).match(/@(\w*)$/);
        if (atMatch) {
            setMentionSearch(atMatch[1]);
            setMentionRange({ start: cursor - atMatch[0].length, end: cursor });
        } else {
            setMentionSearch('');
            setMentionRange(null);
        }
    };

    const handleMentionSelect = (u: User) => {
        if (!mentionRange) return;
        const handle = u.handle || u.username;
        setContent(content.slice(0, mentionRange.start) + `@${handle} ` + content.slice(mentionRange.end));
        setMentionSearch('');
        setMentionRange(null);
        const pos = mentionRange.start + handle.length + 2;
        setTimeout(() => textareaRef.current?.setSelectionRange(pos, pos), 0);
    };

    const handleClose = () => {
        if (content.trim() || images.length || video || selectedGifUrl) setShowConfirm(true);
        else performClose();
    };

    const performClose = () => {
        dispatch(closeReply());
        setContent(''); setImages([]); setImageFiles([]); setVideo(null);
        setSelectedGifUrl(null); setLinkPreview(null); setStickyLink(null);
        setDismissedLinks(new Set()); setShowEmojiPicker(false); setShowGifPicker(false);
        setLanguageAccepted(false); setReplyLanguage('');
        prevContentRef.current = '';
    };

    const handleSubmit = async () => {
        if ((!content.trim() && images.length === 0 && !selectedGifUrl) || !user || !post) return;
        const fd = new FormData();
        fd.append('Content', content);
        fd.append('ReplyToPostId', post.id);
        fd.append('RootPostId', (post as any).rootPostId || post.id);
        imageFiles.forEach(f => fd.append('Images', f));
        if (selectedGifUrl) fd.append('GifUrl', selectedGifUrl);
        if (replyLanguage) fd.append('Language', replyLanguage);
        if (linkPreview) {
            fd.append('LinkPreviewUrl', linkPreview.url);
            if (linkPreview.title) fd.append('LinkPreviewTitle', linkPreview.title);
            if (linkPreview.description) fd.append('LinkPreviewDescription', linkPreview.description);
            if (linkPreview.image) fd.append('LinkPreviewImage', linkPreview.image);
            if (linkPreview.domain) fd.append('LinkPreviewDomain', linkPreview.domain);
        }
        try {
            await dispatch(createPost(fd)).unwrap();
            performClose();
            dispatch(showToast({ message: t('post.reply_success'), type: 'success' }));
        } catch (err: any) {
            dispatch(showToast({ message: err || t('common.failed_to_reply'), type: 'error' }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        Array.from(files).forEach(file => {
            if (file.type.startsWith('video/')) {
                if (images.length > 0 || video) return;
                const r = new FileReader();
                r.onloadend = () => setVideo({ url: r.result as string });
                r.readAsDataURL(file);
                return;
            }
            if (video || images.length >= 4) return;
            setImageFiles(p => [...p, file]);
            const r = new FileReader();
            r.onloadend = () => setImages(p => [...p, { url: r.result as string }].slice(0, 4));
            r.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const saveAltText = (alt: string) => {
        if (editingImageIndex !== null)
            setImages(p => p.map((img, i) => i === editingImageIndex ? { ...img, alt } : img));
        setIsAltModalOpen(false);
    };

    const onEmojiClick = (d: EmojiClickData) => {
        setContent(p => p + d.emoji);
        textareaRef.current?.focus();
    };

    const handleGifSelect = (url: string) => {
        setSelectedGifUrl(url);
        setShowGifPicker(false);
    };

    const handleBannerAccept = () => {
        if (postLanguage) { setReplyLanguage(postLanguage); setLanguageAccepted(true); }
    };

    if (!isOpen || !post) return null;

    // Language data
    const postLanguage = post.language ?? null;
    const langNames: Record<string, string> = {
        en: 'English', vi: 'Vietnamese', ja: 'Japanese', fr: 'French',
        ko: 'Korean', zh: 'Chinese', es: 'Spanish', de: 'German',
    };
    const currentLangName = langNames[replyLanguage] || replyLanguage.toUpperCase() || 'English';
    const postLangName = postLanguage ? (langNames[postLanguage] || postLanguage.toUpperCase()) : '';
    const showLanguageBanner = !!(postLanguage && postLanguage !== replyLanguage && !languageAccepted);

    // Character count
    const remainingChars = POST_CHARACTER_LIMIT - content.length;
    const isOverLimit = remainingChars < 0;
    const progress = Math.min(content.length / POST_CHARACTER_LIMIT, 1);
    const circumference = 2 * Math.PI * 9;

    const canSubmit = (content.trim() || images.length > 0 || !!selectedGifUrl) && !isOverLimit && !isPostLoading;

    return (
        <>
            {/* ── Backdrop ─────────────────────────────────────────── */}
            <div className="fixed inset-0 z-50 bg-black/60" onClick={handleClose} />

            {/* ── Modal panel ──────────────────────────────────────── */}
            <div className="fixed inset-x-0 top-0 z-50 flex justify-center lg:mt-[6vh]">
                <div
                    className="bg-[#16181c] w-full max-w-[600px] flex flex-col shadow-2xl lg:rounded-[14px] lg:border lg:border-gray-800 relative z-[51]"
                    style={{ maxHeight: '94vh' }}
                    onClick={e => e.stopPropagation()}
                >

                    {/* ═══ HEADER ═══ */}
                    <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
                        <button
                            onClick={handleClose}
                            className="text-[15px] font-bold text-[#1d9bf0] hover:text-[#60b8f5] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className={cn(
                                "px-[18px] py-[6px] rounded-full text-[14px] font-bold transition-all select-none",
                                !canSubmit
                                    ? "bg-[#1d9bf0]/50 text-white/50 cursor-not-allowed"
                                    : "bg-[#1d9bf0] text-white hover:bg-[#1a8cd8] active:scale-95"
                            )}
                        >
                            {isPostLoading ? 'Posting…' : 'Reply'}
                        </button>
                    </div>

                    {/* ═══ SCROLLABLE BODY ═══ */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-0 pb-2 flex flex-col">

                        {/* Thread connector area */}
                        <div className="relative flex flex-col">

                            {/* Vertical line connecting avatars */}
                            <div
                                className="absolute left-[23px] top-[48px] w-[2px] bg-gray-700/70 z-0"
                                style={{ bottom: '22px' }}
                            />

                            {/* ── Original post ── */}
                            <div className="flex gap-3 relative z-10 mb-2">
                                <div className="flex-shrink-0">
                                    <Avatar
                                        src={post.author.avatarUrl || post.author.avatar}
                                        alt={post.author.displayName}
                                        size="md"
                                    />
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <span className="font-bold text-white text-[15px]">
                                        {post.author.displayName || post.author.handle}
                                    </span>
                                    {/* Content + media side by side */}
                                    <div className="flex items-start gap-2 mt-0.5">
                                        <p className="flex-1 text-[15px] text-gray-300 leading-[1.35] whitespace-pre-wrap break-words">
                                            {post.content}
                                        </p>
                                        <OriginalPostMedia post={post} />
                                    </div>
                                </div>
                            </div>

                            {/* ── Reply composer ── */}
                            <div className="flex gap-3 relative z-10 pt-2">
                                <div className="flex-shrink-0 pt-0.5">
                                    <Avatar src={user?.avatar} alt={user?.displayName || 'You'} size="md" />
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <textarea
                                        ref={textareaRef}
                                        value={content}
                                        onChange={handleContentChange}
                                        placeholder="Write your reply"
                                        className="w-full text-[18px] bg-transparent border-none resize-none focus:outline-none text-white placeholder-gray-500 min-h-[56px] leading-[1.35]"
                                        autoFocus
                                        rows={1}
                                    />

                                    {mentionRange && (
                                        <MentionSuggester
                                            users={mentionResults}
                                            isLoading={isMentionLoading}
                                            onSelect={handleMentionSelect}
                                        />
                                    )}

                                    {/* Attached image previews */}
                                    {images.length > 0 && (
                                        <div className={cn(
                                            "grid gap-1.5 rounded-2xl overflow-hidden mt-2",
                                            images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                                        )}>
                                            {images.map((img, idx) => (
                                                <div key={idx} className="relative aspect-video group">
                                                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => {
                                                            setImages(p => p.filter((_, i) => i !== idx));
                                                            setImageFiles(p => p.filter((_, i) => i !== idx));
                                                        }}
                                                        className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                                                    ><FiX size={15} /></button>
                                                    <button
                                                        onClick={() => { setEditingImageIndex(idx); setIsAltModalOpen(true); }}
                                                        className={cn(
                                                            "absolute bottom-2 left-2 px-2 py-[3px] rounded text-[11px] font-bold",
                                                            img.alt ? "bg-[#1d9bf0] text-white" : "bg-black/60 text-white hover:bg-black/80"
                                                        )}
                                                    >ALT</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Attached video */}
                                    {video && (
                                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black mt-2">
                                            <video src={video.url} controls className="w-full h-full object-contain" />
                                            <button
                                                onClick={() => setVideo(null)}
                                                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80"
                                            ><FiX size={16} /></button>
                                        </div>
                                    )}

                                    {/* Attached GIF */}
                                    {selectedGifUrl && (
                                        <div className="relative rounded-2xl overflow-hidden bg-black mt-2 aspect-video">
                                            <img src={selectedGifUrl} alt="GIF" className="w-full h-full object-contain" />
                                            <button
                                                onClick={() => setSelectedGifUrl(null)}
                                                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80"
                                            ><FiX size={16} /></button>
                                            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/60 text-white rounded font-bold text-[10px]">GIF</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Language hint banner ── */}
                        {showLanguageBanner && (
                            <div className="mt-3 mb-1 flex items-center gap-3 px-3 py-3 border border-gray-700/70 rounded-xl">
                                <TbWorld size={20} className="text-[#1d9bf0] flex-shrink-0" strokeWidth={2} />
                                <p className="flex-1 text-[13px] text-gray-200 leading-[1.4] m-0">
                                    The post you're replying to was marked as being written in{' '}
                                    <strong className="text-white">{postLangName}</strong> by its author. Would you like to reply in{' '}
                                    <strong className="text-white">{postLangName}</strong>?
                                </p>
                                <button
                                    onClick={handleBannerAccept}
                                    className="px-3 py-[5px] rounded-full bg-gray-700/60 hover:bg-gray-700 text-white text-[13px] font-bold transition-colors flex-shrink-0"
                                >
                                    Yes
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ═══ FOOTER TOOLBAR ═══ */}
                    <div className="border-t border-gray-800 px-2 py-2 flex items-center justify-between flex-shrink-0 relative">

                        {/* GIF picker popup — rendered above toolbar, left side */}
                        {showGifPicker && (
                            <div
                                className="absolute left-2 z-[60] rounded-2xl overflow-hidden shadow-2xl"
                                style={{ bottom: '54px', width: '340px', height: '420px' }}
                                onClick={e => e.stopPropagation()}
                            >
                                <GifPicker
                                    onSelect={handleGifSelect}
                                    onClose={() => setShowGifPicker(false)}
                                />
                            </div>
                        )}

                        {/* Emoji picker popup — rendered above toolbar */}
                        {showEmojiPicker && (
                            <div
                                className="absolute left-2 z-[60] shadow-2xl rounded-xl overflow-hidden"
                                style={{ bottom: '54px' }}
                                onClick={e => e.stopPropagation()}
                            >
                                <EmojiPicker
                                    onEmojiClick={onEmojiClick}
                                    theme={Theme.DARK}
                                    width={320}
                                    height={400}
                                    lazyLoadEmojis
                                />
                            </div>
                        )}

                        {/* Left: media buttons */}
                        <div className="flex items-center">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*,video/*"
                                multiple
                            />
                            {/* Image */}
                            <button
                                onClick={() => { fileInputRef.current?.click(); setShowEmojiPicker(false); setShowGifPicker(false); }}
                                disabled={images.length >= 4 || !!video || !!selectedGifUrl}
                                className="p-2.5 rounded-full text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors disabled:opacity-40"
                                title="Add image"
                            >
                                <FiImage size={20} strokeWidth={2.5} />
                            </button>
                            {/* GIF */}
                            <button
                                onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
                                disabled={images.length > 0 || !!video || !!selectedGifUrl}
                                className="px-2.5 py-2.5 rounded-full text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors font-bold text-[14px] leading-none disabled:opacity-40"
                                title="Add GIF"
                            >
                                GIF
                            </button>
                            {/* Emoji */}
                            <button
                                onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
                                className="p-2.5 rounded-full text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors"
                                title="Add emoji"
                            >
                                <FiSmile size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Right: language + char count + ring */}
                        <div className="flex items-center gap-3 pr-2">
                            <button className="text-[13px] font-bold text-[#1d9bf0] hover:text-[#60b8f5] transition-colors">
                                {currentLangName}
                            </button>
                            <span className={cn(
                                "text-[14px] font-medium tabular-nums",
                                isOverLimit ? "text-red-500 font-bold" : remainingChars <= 20 ? "text-yellow-500" : "text-gray-400"
                            )}>
                                {remainingChars}
                            </span>
                            <div className="w-[22px] h-[22px] flex-shrink-0">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 22 22">
                                    <circle cx="11" cy="11" r="9" fill="none" strokeWidth="2.5" className="stroke-gray-700/50" />
                                    <circle
                                        cx="11" cy="11" r="9" fill="none" strokeWidth="2.5"
                                        strokeDasharray={`${circumference}`}
                                        strokeDashoffset={`${circumference * (1 - progress)}`}
                                        strokeLinecap="round"
                                        className={cn(
                                            "transition-all duration-150",
                                            isOverLimit ? "stroke-red-500" : remainingChars <= 20 ? "stroke-yellow-500" : "stroke-[#1d9bf0]"
                                        )}
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Alt text modal (highest z) ── */}
            <AltTextModal
                isOpen={isAltModalOpen}
                onClose={() => setIsAltModalOpen(false)}
                imageUrl={editingImageIndex !== null ? (images[editingImageIndex]?.url ?? '') : ''}
                initialAlt={editingImageIndex !== null ? (images[editingImageIndex]?.alt ?? '') : ''}
                onSave={saveAltText}
            />

            {/* ── Discard confirm ── */}
            <ConfirmModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={performClose}
                title={t('post.discard_title', 'Discard reply?')}
                message={t('post.discard_message', "This can't be undone and you'll lose your draft.")}
                confirmLabel={t('post.discard_confirm', 'Discard')}
                cancelLabel={t('post.discard_cancel', 'Cancel')}
                variant="danger"
            />
        </>
    );
};

export default ReplyModal;
