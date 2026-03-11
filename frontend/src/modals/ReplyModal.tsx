import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { closeReply } from '../redux/slices/modalsSlice';
import { createPost } from '../redux/slices/postsSlice';
import { showToast } from '../redux/slices/toastSlice';

import Avatar from '../components/common/Avatar';
import GifPicker from '../components/common/GifPicker';
import PostInteractionSettingsModal from './PostInteractionSettingsModal';
import { FiX, FiImage, FiSmile, FiChevronRight } from 'react-icons/fi';
import { TbWorld } from 'react-icons/tb';
import { useTranslation } from 'react-i18next';
import { POST_CHARACTER_LIMIT, ALL_LANGUAGES } from '../constants';
import { detectLanguage } from '../utils/languageDetector';
import { PostImage, PostVideo, LinkPreview } from '../types';
import AltTextModal from './AltTextModal';
import { cn } from '../utils/classNames';
import { getLinkMetadata } from '../utils/linkMetadata';
import ConfirmModal from '../components/common/ConfirmModal';
import { useUserSearch } from '../hooks/useUserSearch';
import MentionSuggester from '../components/common/MentionSuggester';
import { User } from '../types';
import { RootState } from '../redux/store';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import LanguagePickerModal from '../components/modals/LanguagePickerModal';

/* ────────────────────────────────────────────────────────────────────
   OriginalPostMedia
   - Images, video, link card → small thumbnail (right side)
   - GIF → full-width below the text (same as regular media)
──────────────────────────────────────────────────────────────────── */
interface OriginalPostMediaProps {
    post: any;
    /** true = render in "thumbnail" mode (images/video/linkcard); false = render full-width GIF */
    thumbMode: boolean;
}

const OriginalPostThumb: React.FC<{ post: any }> = ({ post }) => {
    const media: { url: string; type?: string }[] =
        post.media && post.media.length > 0
            ? post.media
            : (post.imageUrls || []).map((u: string) => ({ url: u, type: 'image' }));

    const images = media.filter((m: any) => !m.type || m.type === 'image').slice(0, 4);
    const videoUrl = post.videoUrl || post.video?.url || media.find((m: any) => m.type === 'video')?.url || null;
    const lp = post.linkPreview ?? null;

    const base = 'rounded-md overflow-hidden bg-gray-700 flex-shrink-0 object-cover';

    if (images.length > 0) {
        return (
            <div className="flex gap-1 flex-shrink-0">
                {images.map((img: any, i: number) => (
                    <img key={i} src={img.url} alt="" className={cn(base, images.length === 1 ? 'w-[68px] h-[68px]' : 'w-[42px] h-[42px]')} />
                ))}
            </div>
        );
    }
    if (videoUrl) {
        return (
            <div className={cn('relative w-[68px] h-[68px]', base)}>
                <video src={videoUrl} className="w-full h-full object-cover" preload="metadata" muted />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="w-5 h-5 border-2 border-white rounded-full flex items-center justify-center">
                        <div className="w-0 h-0 border-y-[4px] border-y-transparent border-l-[7px] border-l-white ml-[2px]" />
                    </div>
                </div>
            </div>
        );
    }
    if (lp) {
        return (
            <div className={cn('w-[68px] h-[68px]', base)}>
                {lp.image
                    ? <img src={lp.image} alt={lp.title || ''} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center p-1">
                        <span className="text-[9px] text-gray-400 text-center leading-tight">{lp.domain}</span>
                    </div>
                }
            </div>
        );
    }
    return null;
};

/** Full-width GIF strip — only shown when original post has a GIF */
const OriginalPostGif: React.FC<{ post: any }> = ({ post }) => {
    const gifUrl = post.gifUrl
        || post.media?.find((m: any) => m.type === 'gif')?.url
        || null;
    if (!gifUrl) return null;
    return (
        <div className="mt-2 rounded-xl overflow-hidden bg-black max-h-[200px]">
            <img src={gifUrl} alt="GIF" className="w-full h-full object-cover" />
        </div>
    );
};

/* ════════════════════════════════════════════════════════════════════
   ReplyModal — layout matches pic 3
════════════════════════════════════════════════════════════════════ */
const ReplyModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const { t, i18n } = useTranslation();
    const { isOpen, post } = useAppSelector((s: RootState) => s.modals.reply);
    const user = useAppSelector((s: RootState) => s.auth.user);
    const isPostLoading = useAppSelector((s: RootState) => s.posts.isLoading);

    // Composer state
    const [content, setContent] = useState('');
    const [images, setImages] = useState<PostImage[]>([]);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [video, setVideo] = useState<PostVideo | null>(null);
    const [selectedGifUrl, setSelectedGifUrl] = useState<string | null>(null);

    // Link preview
    const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
    const [isLinkLoading, setIsLinkLoading] = useState(false);
    const [stickyLink, setStickyLink] = useState<string | null>(null);

    // UI toggles
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [isAltModalOpen, setIsAltModalOpen] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
    const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

    // Interaction settings — default to anyone/true unless user saved custom
    const authSettings = useAppSelector((s: RootState) => s.auth.settings);
    const [replyRestriction, setReplyRestriction] = useState<string>('anyone');
    const [allowQuotes, setAllowQuotes] = useState<boolean>(true);
    const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
    const { results: mentionResults, isLoading: isMentionLoading } = useUserSearch(mentionSearch);

    // Language
    const uiLanguage = useAppSelector((s: RootState) => (s as any).language?.appLanguage) || i18n.language || 'en';
    const [postLanguage, setPostLanguage] = useState<string>('');
    const [isLanguageManual, setIsLanguageManual] = useState(false);
    const [languageAccepted, setLanguageAccepted] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const prevContentRef = useRef('');

    // Reset on open: always start with 'anyone' unless user saved a preference
    useEffect(() => {
        if (isOpen) {
            setPostLanguage(uiLanguage);
            setIsLanguageManual(false);
            setLanguageAccepted(false);
            // Use saved defaults if present, otherwise 'anyone'
            setReplyRestriction(authSettings?.defaultReplyRestriction || 'anyone');
            setAllowQuotes(authSettings?.defaultAllowQuotes ?? true);
        } else {
            setPostLanguage('');
        }
    }, [isOpen, uiLanguage, authSettings]);

    // Auto-detect composing language
    useEffect(() => {
        if (!isOpen || isLanguageManual || content.trim().length < 5) return;
        const detected = detectLanguage(content);
        if (detected && detected !== postLanguage) setPostLanguage(detected);
    }, [content, isOpen, isLanguageManual, postLanguage]);

    // Link preview
    useEffect(() => {
        if (!isOpen) return;
        const urlRe = /(https?:\/\/[^\s]+)/g;
        const cur = (content.match(urlRe) || []) as string[];
        const prev = (prevContentRef.current.match(urlRe) || []) as string[];
        const count = (arr: string[]) => { const m: Record<string, number> = {}; arr.forEach(v => (m[v] = (m[v] || 0) + 1)); return m; };
        const cc = count(cur), pc = count(prev);
        const added = cur.find(l => cc[l] > (pc[l] || 0));
        if (added && !linkPreview && (!stickyLink || added !== stickyLink)) {
            (async () => {
                setIsLinkLoading(true);
                const meta = await getLinkMetadata(added);
                if (meta) { setStickyLink(added); setLinkPreview(meta); }
                setIsLinkLoading(false);
            })();
        }
        prevContentRef.current = content;
    }, [content, stickyLink, isOpen, linkPreview]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const v = e.target.value;
        const cursor = e.target.selectionStart;
        setContent(v);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`;
        const atMatch = v.slice(0, cursor).match(/@(\w*)$/);
        if (atMatch) {
            setMentionSearch(atMatch[1]);
            setMentionRange({ start: cursor - atMatch[0].length, end: cursor });
        } else {
            setMentionSearch(''); setMentionRange(null);
        }
    };

    const handleMentionSelect = (u: User) => {
        if (!mentionRange) return;
        const handle = u.handle || u.username;
        setContent(content.slice(0, mentionRange.start) + `@${handle} ` + content.slice(mentionRange.end));
        setMentionSearch(''); setMentionRange(null);
        const pos = mentionRange.start + handle.length + 2;
        setTimeout(() => textareaRef.current?.setSelectionRange(pos, pos), 0);
    };

    const handleClose = () => { if (content.trim() || images.length || video || selectedGifUrl) setShowConfirm(true); else performClose(); };

    const performClose = () => {
        dispatch(closeReply());
        setContent(''); setImages([]); setImageFiles([]); setVideo(null);
        setSelectedGifUrl(null); setLinkPreview(null); setStickyLink(null);
        setShowEmojiPicker(false); setShowGifPicker(false);
        setLanguageAccepted(false); setPostLanguage(''); setIsLanguageManual(false);
        setReplyRestriction(authSettings?.defaultReplyRestriction || 'anyone');
        setAllowQuotes(authSettings?.defaultAllowQuotes ?? true);
        prevContentRef.current = '';
    };

    const handleSubmit = async () => {
        if ((!content.trim() && images.length === 0 && !selectedGifUrl) || !user || !post) return;

        try {
            const mediaFiles = imageFiles.length > 0 ? imageFiles : undefined;
            // Extract string ID from post for replyToPostId
            const replyToPostId = post.id;

            await dispatch(createPost({
                content,
                replyToPostId,
                mediaFiles,
            })).unwrap();

            performClose();
            dispatch(showToast({ message: t('post.reply_success'), type: 'success' }));
        } catch (err: any) {
            dispatch(showToast({ message: err.message || t('common.failed_to_reply'), type: 'error' }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files; if (!files) return;
        Array.from(files).forEach(file => {
            if (file.type.startsWith('video/')) {
                if (images.length > 0 || video) return;
                const r = new FileReader();
                r.onloadend = () => setVideo({ url: r.result as string });
                r.readAsDataURL(file); return;
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

    const handleBannerAccept = () => {
        if (originalPostLang) { setPostLanguage(originalPostLang); setIsLanguageManual(true); setLanguageAccepted(true); }
    };

    if (!isOpen || !post) return null;

    const originalPostLang = post.language ?? null;
    const langMap: Record<string, string> = { en: 'English', vi: 'Vietnamese', ja: 'Japanese', fr: 'French', ko: 'Korean', zh: 'Chinese', es: 'Spanish', de: 'German' };
    const currentLangName = ALL_LANGUAGES.find(l => l.code === postLanguage)?.englishName || langMap[postLanguage] || 'English';
    const postLangName = originalPostLang ? (langMap[originalPostLang] || originalPostLang.toUpperCase()) : '';
    const showLanguageBanner = !!(originalPostLang && originalPostLang !== postLanguage && !languageAccepted);

    const remaining = POST_CHARACTER_LIMIT - content.length;
    const isOverLimit = remaining < 0;
    const progress = Math.min(content.length / POST_CHARACTER_LIMIT, 1);
    const C = 2 * Math.PI * 9;
    const canSubmit = (content.trim() || images.length > 0 || !!selectedGifUrl) && !isOverLimit && !isPostLoading;

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/60" onClick={handleClose} />

            {/* Modal: vertically centered, safe margins */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-dark-surface w-full max-w-[600px] flex flex-col shadow-2xl rounded-[14px] border border-dark-border pointer-events-auto"
                    style={{ maxHeight: 'min(92vh, 760px)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header: Cancel | Reply */}
                    <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
                        <button onClick={handleClose} className="text-[15px] font-bold text-[#1d9bf0] hover:text-[#60b8f5] transition-colors">Cancel</button>
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className={cn('px-[18px] py-[6px] rounded-full text-[14px] font-bold transition-all select-none',
                                !canSubmit ? 'bg-[#1d9bf0]/50 text-white/60 cursor-not-allowed' : 'bg-[#1d9bf0] text-white hover:bg-[#1a8cd8] active:scale-95')}
                        >{isPostLoading ? 'Posting…' : 'Reply'}</button>
                    </div>

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-2 flex flex-col min-h-0">

                        {/* ── Original post (no vertical thread line, per pic 3) ── */}
                        <div className="flex gap-3">
                            <div className="flex-shrink-0">
                                <Avatar src={post.author.avatarUrl || post.author.avatar} alt={post.author.displayName} size="md" />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                                <span className="font-bold text-dark-text text-[15px]">{post.author.displayName || post.author.handle}</span>
                                {/* Content row: text + thumbnail (images/video/linkcard) */}
                                <div className="flex items-start gap-2 mt-0.5">
                                    <p className="flex-1 text-[15px] text-dark-text-secondary leading-[1.35] break-all whitespace-pre-wrap">
                                        {post.content}
                                    </p>
                                    <OriginalPostThumb post={post} />
                                </div>
                                {/* GIF = full width below text */}
                                <OriginalPostGif post={post} />
                            </div>
                        </div>

                        {/* Horizontal divider (matches pic 3) */}
                        <div className="h-px bg-gray-700/60 my-3 flex-shrink-0" />

                        {/* ── Reply composer ── */}
                        <div className="flex gap-3 flex-1">
                            <div className="flex-shrink-0 pt-0.5">
                                <Avatar src={user?.avatar} alt={user?.displayName || 'You'} size="md" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <textarea
                                    ref={textareaRef}
                                    value={content}
                                    onChange={handleContentChange}
                                    placeholder="Write your reply"
                                    className="w-full text-[18px] bg-transparent border-none resize-none focus:outline-none text-dark-text placeholder-dark-text-secondary min-h-[56px] leading-[1.35]"
                                    autoFocus
                                    rows={1}
                                />

                                {mentionRange && (
                                    <MentionSuggester users={mentionResults} isLoading={isMentionLoading} onSelect={handleMentionSelect} />
                                )}

                                {/* Interaction Settings */}
                                <div className="mt-1 mb-2">
                                    <button
                                        onClick={() => setIsInteractionModalOpen(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold border border-dark-border text-dark-text-secondary hover:bg-dark-hover transition-colors"
                                    >
                                        <FiSmile size={13} className="text-dark-text-secondary" />
                                        <span>{replyRestriction === 'anyone' && allowQuotes ? 'Anyone can interact' : 'Interaction limited'}</span>
                                        <FiChevronRight size={12} className="ml-0.5 rotate-90 opacity-40" />
                                    </button>
                                </div>

                                {/* Attached images */}
                                {images.length > 0 && (
                                    <div className={cn('grid gap-1.5 rounded-2xl overflow-hidden mt-1 mb-2', images.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
                                        {images.map((img, idx) => (
                                            <div key={idx} className="relative aspect-video group">
                                                <img src={img.url} alt="" className="w-full h-full object-cover" />
                                                <button onClick={() => { setImages(p => p.filter((_, i) => i !== idx)); setImageFiles(p => p.filter((_, i) => i !== idx)); }} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80"><FiX size={14} /></button>
                                                <button onClick={() => { setEditingImageIndex(idx); setIsAltModalOpen(true); }} className={cn('absolute bottom-2 left-2 px-2 py-[3px] rounded text-[10px] font-bold', img.alt ? 'bg-[#1d9bf0] text-white' : 'bg-black/60 text-white hover:bg-black/80')}>ALT</button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Attached video */}
                                {video && (
                                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black mt-1 mb-2">
                                        <video src={video.url} controls className="w-full h-full object-contain" />
                                        <button onClick={() => setVideo(null)} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80"><FiX size={16} /></button>
                                    </div>
                                )}

                                {/* Attached GIF (composer's own GIF) */}
                                {selectedGifUrl && (
                                    <div className="relative rounded-2xl overflow-hidden bg-black mt-1 mb-2 aspect-video">
                                        <img src={selectedGifUrl} alt="GIF" className="w-full h-full object-contain" />
                                        <button onClick={() => setSelectedGifUrl(null)} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80"><FiX size={16} /></button>
                                        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/60 text-white rounded font-bold text-[10px]">GIF</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Language banner */}
                        {showLanguageBanner && (
                            <div className="mt-3 mb-1 flex items-center gap-3 px-3 py-3 border border-gray-700/70 rounded-xl">
                                <TbWorld size={20} className="text-[#1d9bf0] flex-shrink-0" strokeWidth={2} />
                                <p className="flex-1 text-[13px] text-gray-200 leading-[1.4]">
                                    The post you're replying to was marked as being written in <strong className="text-white">{postLangName}</strong> by its author. Would you like to reply in <strong className="text-white">{postLangName}</strong>?
                                </p>
                                <button onClick={handleBannerAccept} className="px-3 py-[5px] rounded-full bg-gray-700/60 hover:bg-gray-700 text-white text-[13px] font-bold transition-colors flex-shrink-0">Yes</button>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-800 px-2 py-2 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" multiple />
                            <button onClick={() => { fileInputRef.current?.click(); setShowEmojiPicker(false); setShowGifPicker(false); }} disabled={images.length >= 4 || !!video || !!selectedGifUrl} className="p-2.5 rounded-full text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors disabled:opacity-40"><FiImage size={20} strokeWidth={2.5} /></button>
                            <button onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }} disabled={images.length > 0 || !!video || !!selectedGifUrl} className="px-2.5 py-2.5 rounded-full text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors font-bold text-[14px] leading-none disabled:opacity-40">GIF</button>
                            <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }} className="p-2.5 rounded-full text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors"><FiSmile size={20} strokeWidth={2.5} /></button>
                        </div>

                        <div className="flex items-center gap-3 pr-2">
                            <div className="relative">
                                <button onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)} className="text-[13px] font-bold text-[#1d9bf0] hover:text-[#60b8f5] transition-colors">{currentLangName}</button>
                                {isLanguageDropdownOpen && (
                                    <div className="absolute bottom-full right-0 mb-2 w-52 bg-dark-surface border border-dark-border rounded-2xl shadow-2xl overflow-hidden z-[65]">
                                        <div className="max-h-[240px] overflow-y-auto p-1 space-y-0.5">
                                            {['en', 'vi', 'ja', 'fr', 'ko', 'zh'].map(code => {
                                                const lang = ALL_LANGUAGES.find(l => l.code === code);
                                                if (!lang) return null;
                                                return <button key={code} onClick={() => { setPostLanguage(code); setIsLanguageManual(true); setIsLanguageDropdownOpen(false); }} className={cn('w-full text-left px-4 py-2.5 rounded-xl text-[14px] transition-colors', postLanguage === code ? 'bg-[#1d9bf0] text-white font-bold' : 'text-dark-text hover:bg-dark-hover')}>{lang.englishName}</button>;
                                            })}
                                            <div className="h-px bg-dark-border my-1" />
                                            <button onClick={() => { setIsLanguageDropdownOpen(false); setIsLanguageModalOpen(true); }} className="w-full flex items-center justify-between px-4 py-2 text-[13px] text-dark-text-secondary hover:bg-dark-hover rounded-xl transition-colors">More languages… <FiChevronRight size={13} /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <span className={cn('text-[14px] font-medium tabular-nums', isOverLimit ? 'text-red-500 font-bold' : remaining <= 20 ? 'text-yellow-500' : 'text-gray-400')}>{remaining}</span>
                            <div className="w-[22px] h-[22px] flex-shrink-0">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 22 22">
                                    <circle cx="11" cy="11" r="9" fill="none" strokeWidth="2.5" className="stroke-gray-700/50" />
                                    <circle cx="11" cy="11" r="9" fill="none" strokeWidth="2.5" strokeDasharray={`${C}`} strokeDashoffset={`${C * (1 - progress)}`} strokeLinecap="round"
                                        className={cn('transition-all duration-150', isOverLimit ? 'stroke-red-500' : remaining <= 20 ? 'stroke-yellow-500' : 'stroke-[#1d9bf0]')} />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* GIF Picker overlay */}
            {showGifPicker && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/30" onClick={() => setShowGifPicker(false)}>
                    <div className="bg-white dark:bg-[#1e2028] w-full max-w-lg h-[500px] rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <GifPicker onSelect={(url) => { setSelectedGifUrl(url); setImages([]); setVideo(null); setShowGifPicker(false); }} onClose={() => setShowGifPicker(false)} />
                    </div>
                </div>
            )}

            {/* Emoji Picker overlay */}
            {showEmojiPicker && (
                <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-4 bg-black/20" onClick={() => setShowEmojiPicker(false)}>
                    <div className="rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <EmojiPicker onEmojiClick={(d: EmojiClickData) => { setContent(p => p + d.emoji); textareaRef.current?.focus(); }} theme={Theme.DARK} width={320} height={420} lazyLoadEmojis />
                    </div>
                </div>
            )}

            <PostInteractionSettingsModal
                isOpen={isInteractionModalOpen}
                onClose={() => setIsInteractionModalOpen(false)}
                replyRestriction={replyRestriction}
                setReplyRestriction={setReplyRestriction}
                allowQuotes={allowQuotes}
                setAllowQuotes={setAllowQuotes}
            />
            <LanguagePickerModal isOpen={isLanguageModalOpen} onClose={() => setIsLanguageModalOpen(false)} selectedCode={postLanguage} onSelect={(code) => { setPostLanguage(code); setIsLanguageManual(true); }} />
            <AltTextModal isOpen={isAltModalOpen} onClose={() => setIsAltModalOpen(false)} imageUrl={editingImageIndex !== null ? (images[editingImageIndex]?.url ?? '') : ''} initialAlt={editingImageIndex !== null ? (images[editingImageIndex]?.alt ?? '') : ''} onSave={saveAltText} />
            <ConfirmModal isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={performClose} title={t('post.discard_title', 'Discard reply?')} message={t('post.discard_message', "This can't be undone.")} confirmLabel={t('post.discard_confirm', 'Discard')} cancelLabel={t('post.discard_cancel', 'Cancel')} variant="danger" />
        </>
    );
};

export default ReplyModal;
