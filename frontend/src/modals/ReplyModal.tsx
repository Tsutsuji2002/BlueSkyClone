import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { closeReply } from '../redux/slices/modalsSlice';
import { createPost } from '../redux/slices/postsSlice';
import { showToast } from '../redux/slices/toastSlice';

import Avatar from '../components/common/Avatar';
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

const ReplyModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const { t, i18n } = useTranslation();
    const { isOpen, post } = useAppSelector((state: RootState) => state.modals.reply);
    const user = useAppSelector((state: RootState) => state.auth.user);
    const isPostLoading = useAppSelector((state: RootState) => state.posts.isLoading);

    const [content, setContent] = useState('');
    const [images, setImages] = useState<PostImage[]>([]);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [video, setVideo] = useState<PostVideo | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
    const [isLinkLoading, setIsLinkLoading] = useState(false);
    const [stickyLink, setStickyLink] = useState<string | null>(null);
    const [dismissedLinks, setDismissedLinks] = useState<Set<string>>(new Set());
    const [isAltModalOpen, setIsAltModalOpen] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionRange, setMentionRange] = useState<{ start: number, end: number } | null>(null);

    // Language Hint Logic
    const [replyLanguage, setReplyLanguage] = useState<string>('');
    const [languageAccepted, setLanguageAccepted] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const prevContentRef = useRef('');

    const { results: mentionResults, isLoading: isMentionLoading } = useUserSearch(mentionSearch);

    // Initial composing language defaults to appLanguage
    const uiLanguage = useAppSelector((state: RootState) => state.language.appLanguage) || i18n.language || 'en';
    useEffect(() => {
        if (isOpen && !replyLanguage) {
            setReplyLanguage(uiLanguage);
        }
    }, [isOpen, replyLanguage, uiLanguage]);

    // Detect language as user types
    useEffect(() => {
        if (!isOpen || content.trim().length < 5 || languageAccepted) return;
        const detected = detectLanguage(content);
        if (detected && detected !== replyLanguage) {
            setReplyLanguage(detected);
        }
    }, [content, isOpen, languageAccepted, replyLanguage]);

    const postLanguage = post?.language || null;
    const langNames: Record<string, string> = {
        en: 'English', vi: 'Vietnamese', ja: 'Japanese', fr: 'French',
        ko: 'Korean', zh: 'Chinese', es: 'Spanish', de: 'German'
    };

    const currentLangName = langNames[replyLanguage] || replyLanguage.toUpperCase();
    const postLangName = postLanguage ? (langNames[postLanguage] || postLanguage.toUpperCase()) : '';

    const showLanguageBanner = postLanguage && postLanguage !== replyLanguage && !languageAccepted;

    // Link detection
    useEffect(() => {
        if (!isOpen) return;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = (content.match(urlRegex) || []) as string[];
        const prevMatches = (prevContentRef.current.match(urlRegex) || []) as string[];

        const getCounts = (arr: string[]) => {
            const counts: Record<string, number> = {};
            arr.forEach(val => counts[val] = (counts[val] || 0) + 1);
            return counts;
        };
        const currentCounts = getCounts(matches);
        const prevCounts = getCounts(prevMatches);
        const addedLink = matches.find(link => currentCounts[link] > (prevCounts[link] || 0));
        const isPaste = addedLink && (content.length - prevContentRef.current.length > 1);
        const isEnterOrSpace = content.length > 0 && (content.endsWith(' ') || content.endsWith('\n'));
        const isInitialDetection = !linkPreview && addedLink;

        if (addedLink && (isPaste || isEnterOrSpace || isInitialDetection)) {
            const isDifferentLink = !stickyLink || addedLink !== stickyLink;
            if (isDifferentLink || isPaste) {
                const fetchMetadata = async () => {
                    setIsLinkLoading(true);
                    const metadata = await getLinkMetadata(addedLink);
                    if (metadata) { setStickyLink(addedLink); setLinkPreview(metadata); }
                    setIsLinkLoading(false);
                };
                fetchMetadata();
            }
        }
        prevContentRef.current = content;
    }, [content, stickyLink, isOpen, linkPreview]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart;
        setContent(newValue);

        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 250)}px`;

        const textBeforeCursor = newValue.slice(0, cursorPos);
        const atMatch = textBeforeCursor.match(/@(\w*)$/);
        if (atMatch) {
            setMentionSearch(atMatch[1]);
            setMentionRange({ start: cursorPos - atMatch[0].length, end: cursorPos });
        } else {
            setMentionSearch('');
            setMentionRange(null);
        }
    };

    const handleMentionSelect = (selectedUser: User) => {
        if (mentionRange) {
            const before = content.slice(0, mentionRange.start);
            const after = content.slice(mentionRange.end);
            const handle = selectedUser.handle || selectedUser.username;
            setContent(`${before}@${handle} ${after}`);
            setMentionSearch('');
            setMentionRange(null);
            const newCursorPos = mentionRange.start + handle.length + 2;
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                }
            }, 0);
        }
    };

    const handleClose = () => {
        if (content.trim().length > 0 || images.length > 0 || !!video) {
            setShowConfirm(true);
        } else {
            performClose();
        }
    };

    const performClose = () => {
        dispatch(closeReply());
        setContent('');
        setImages([]);
        setImageFiles([]);
        setVideo(null);
        setLinkPreview(null);
        setStickyLink(null);
        setDismissedLinks(new Set());
        setShowEmojiPicker(false);
        setLanguageAccepted(false);
        setReplyLanguage('');
        prevContentRef.current = '';
    };

    const handleSubmit = async () => {
        if ((!content.trim() && images.length === 0) || !user || !post) return;

        const formData = new FormData();
        formData.append('Content', content);
        formData.append('ReplyToPostId', post.id);
        const rootId: string = (post as any).rootPostId || post.id;
        formData.append('RootPostId', rootId);
        imageFiles.forEach((file: File) => formData.append('Images', file));

        if (replyLanguage) {
            formData.append('Language', replyLanguage);
        }

        if (linkPreview) {
            formData.append('LinkPreviewUrl', linkPreview.url);
            if (linkPreview.title) formData.append('LinkPreviewTitle', linkPreview.title);
            if (linkPreview.description) formData.append('LinkPreviewDescription', linkPreview.description);
            if (linkPreview.image) formData.append('LinkPreviewImage', linkPreview.image);
            if (linkPreview.domain) formData.append('LinkPreviewDomain', linkPreview.domain);
        }

        try {
            await dispatch(createPost(formData)).unwrap();
            performClose();
            dispatch(showToast({ message: t('post.reply_success'), type: 'success' }));
        } catch (error: any) {
            dispatch(showToast({ message: error || t('common.failed_to_reply'), type: 'error' }));
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            Array.from(files).forEach((file) => {
                if (file.type.startsWith('video/')) {
                    if (images.length > 0 || video) return;
                    const reader = new FileReader();
                    reader.onloadend = () => setVideo({ url: reader.result as string });
                    reader.readAsDataURL(file);
                    return;
                }
                if (video || images.length >= 4) return;
                setImageFiles(prev => [...prev, file]);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImages(prev => [...prev, { url: reader.result as string }].slice(0, 4));
                };
                reader.readAsDataURL(file);
            });
            event.target.value = '';
        }
    };

    const saveAltText = (alt: string) => {
        if (editingImageIndex !== null) {
            setImages(prev => prev.map((img, i) => i === editingImageIndex ? { ...img, alt } : img));
        }
        setIsAltModalOpen(false);
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setContent(prev => prev + emojiData.emoji);
    };

    const handleBannerAccept = () => {
        if (postLanguage) {
            setReplyLanguage(postLanguage);
            setLanguageAccepted(true);
        }
    };

    if (!isOpen || !post) return null;

    const remainingChars = POST_CHARACTER_LIMIT - content.length;
    const isOverLimit = remainingChars < 0;
    const progress = Math.min(content.length / POST_CHARACTER_LIMIT, 1);
    const circumference = 2 * Math.PI * 9;

    const isSubmitDisabled = (!content.trim() && images.length === 0 && !video) || isOverLimit || isPostLoading;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-none"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-x-0 top-0 z-50 flex justify-center lg:mt-[5vh]">
                <div
                    className="bg-[#16181c] w-full max-w-[600px] flex flex-col shadow-[0_0_25px_rgba(0,0,0,0.5)] lg:rounded-[14px] lg:border lg:border-gray-800 relative z-[60]"
                    style={{ maxHeight: '95vh', minHeight: '300px' }}
                    onClick={e => e.stopPropagation()}
                >

                    {/* ── Header ────────────────────────────────── */}
                    <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
                        <button
                            onClick={handleClose}
                            className="text-[15px] font-bold text-primary-500 hover:text-primary-400 transition-colors"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitDisabled}
                            className={cn(
                                "px-[16px] py-[6px] rounded-full text-[14px] font-bold transition-all",
                                isSubmitDisabled
                                    ? "bg-primary-500/50 text-white/50 cursor-not-allowed"
                                    : "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700"
                            )}
                        >
                            {isPostLoading ? 'Posting…' : 'Reply'}
                        </button>
                    </div>

                    {/* ── Scrollable Body ───────────────────────── */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-1 flex flex-col relative w-full">

                        {/* Thread visual connector container */}
                        <div className="relative flex flex-col">

                            {/* Connector line - absolute positioned to run between the avatars */}
                            <div className="absolute left-[23px] top-[48px] bottom-[30px] w-[2px] bg-gray-700/60 z-0" />

                            {/* Original post */}
                            <div className="flex gap-3 relative z-10 w-full mb-3">
                                <div className="flex flex-col items-center flex-shrink-0 relative">
                                    <Avatar
                                        src={post.author.avatarUrl || post.author.avatar}
                                        alt={post.author.displayName}
                                        size="md"
                                        className="mb-1"
                                    />
                                </div>
                                <div className="flex-1 min-w-0 pb-1">
                                    <div className="flex items-center gap-1.5 mb-[2px] flex-wrap">
                                        <span className="font-bold text-gray-50 text-[15px] truncate">
                                            {post.author.displayName || post.author.handle}
                                        </span>
                                    </div>
                                    <p className="text-[15px] text-gray-200 leading-[1.3] whitespace-pre-wrap break-words">
                                        {post.content}
                                    </p>
                                </div>
                            </div>

                            {/* Reply input */}
                            <div className="flex gap-3 pt-2 relative z-10 w-full flex-1">
                                <div className="flex-shrink-0 pt-0.5">
                                    <Avatar src={user?.avatar} alt={user?.displayName || 'User'} size="md" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <textarea
                                        ref={textareaRef}
                                        value={content}
                                        onChange={handleContentChange}
                                        placeholder="Write your reply"
                                        className="w-full text-[18px] bg-transparent border-none resize-none focus:outline-none text-white placeholder-gray-500 min-h-[60px]"
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

                                    {/* Image previews */}
                                    {images.length > 0 && (
                                        <div className={cn(
                                            "grid gap-2 rounded-2xl overflow-hidden mt-2 mb-2",
                                            images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                                        )}>
                                            {images.map((img, idx) => (
                                                <div key={idx} className="relative aspect-video group">
                                                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => {
                                                            setImages(prev => prev.filter((_, i) => i !== idx));
                                                            setImageFiles(prev => prev.filter((_, i) => i !== idx));
                                                        }}
                                                        className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full transition-colors hover:bg-black/80"
                                                    >
                                                        <FiX size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingImageIndex(idx); setIsAltModalOpen(true); }}
                                                        className={cn(
                                                            "absolute bottom-2 left-2 px-2 py-1 rounded text-[11px] font-bold transition-colors",
                                                            img.alt ? "bg-primary-500 text-white" : "bg-black/60 text-white hover:bg-black/80"
                                                        )}
                                                    >
                                                        ALT
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {video && (
                                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black mt-2 mb-2">
                                            <video src={video.url} className="w-full h-full object-contain" controls />
                                            <button
                                                onClick={() => setVideo(null)}
                                                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full transition-colors hover:bg-black/80"
                                            >
                                                <FiX size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Language hint banner */}
                        {showLanguageBanner && (
                            <div className="mt-4 mb-2 flex items-center gap-3 px-3 py-3 border border-gray-700/80 rounded-lg max-w-[95%]">
                                <div className="flex items-center justify-center flex-shrink-0 text-primary-500">
                                    <TbWorld size={20} strokeWidth={2} />
                                </div>
                                <p className="flex-1 text-[13px] text-gray-200 leading-[1.4] m-0 pr-1">
                                    The post you're replying to was marked as being written in{' '}
                                    <strong className="text-white font-bold">{postLangName}</strong> by its author. Would you like to reply in{' '}
                                    <strong className="text-white font-bold">{postLangName}</strong>?
                                </p>
                                <button
                                    onClick={handleBannerAccept}
                                    className="px-[14px] py-[6px] rounded-full bg-gray-700/50 hover:bg-gray-700 text-gray-100 text-[13px] font-bold transition-colors flex-shrink-0"
                                >
                                    Yes
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Footer toolbar ─────────────────────────── */}
                    <div className="border-t border-gray-800 min-h-[50px] px-2 flex items-center justify-between flex-shrink-0 relative">
                        {/* Emoji picker popup container */}
                        {showEmojiPicker && (
                            <div className="absolute bottom-[52px] left-2 z-[70] shadow-[0_0_15px_rgba(0,0,0,0.5)] rounded-[8px] overflow-hidden">
                                <EmojiPicker
                                    onEmojiClick={onEmojiClick}
                                    theme={Theme.DARK}
                                    width={320}
                                    height={400}
                                    lazyLoadEmojis={true}
                                />
                            </div>
                        )}

                        {/* Left: media tools */}
                        <div className="flex items-center gap-0">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*,video/*"
                                multiple
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={images.length >= 4 || !!video}
                                className="p-2.5 rounded-full text-primary-500 hover:bg-primary-500/10 transition-colors disabled:opacity-40"
                            >
                                <FiImage size={20} strokeWidth={2.5} />
                            </button>
                            {/* GIF text button */}
                            <button className="px-2.5 py-2.5 rounded-full text-primary-500 hover:bg-primary-500/10 transition-colors font-bold text-[14px] leading-none flex items-center justify-center">
                                GIF
                            </button>
                            <button
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="p-2.5 rounded-full text-primary-500 hover:bg-primary-500/10 transition-colors"
                            >
                                <FiSmile size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Right: language + character count */}
                        <div className="flex items-center gap-[14px] pr-2">
                            {/* Language selector text */}
                            <button className="text-[13px] font-bold text-primary-500 hover:text-primary-400 transition-colors pt-[1px]">
                                {currentLangName}
                            </button>

                            {/* Character count */}
                            <span className={cn(
                                "text-[14px] font-medium tabular-nums pt-[1px]",
                                isOverLimit ? 'text-red-500 font-bold' : remainingChars <= 20 ? 'text-yellow-500' : 'text-gray-400'
                            )}>
                                {remainingChars}
                            </span>

                            {/* Progress ring */}
                            <div className="relative w-[22px] h-[22px] flex-shrink-0">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 22 22">
                                    <circle
                                        cx="11" cy="11" r="9"
                                        fill="none"
                                        strokeWidth="2.5"
                                        className="stroke-gray-700/50"
                                    />
                                    <circle
                                        cx="11" cy="11" r="9"
                                        fill="none"
                                        strokeWidth="2.5"
                                        strokeDasharray={`${circumference}`}
                                        strokeDashoffset={`${circumference * (1 - progress)}`}
                                        strokeLinecap="round"
                                        className={cn(
                                            "transition-all duration-200",
                                            isOverLimit ? "stroke-red-500" : remainingChars <= 20 ? "stroke-yellow-500" : "stroke-primary-500"
                                        )}
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alt Text Modal */}
            <AltTextModal
                isOpen={isAltModalOpen}
                onClose={() => setIsAltModalOpen(false)}
                imageUrl={(editingImageIndex !== null && images[editingImageIndex]) ? images[editingImageIndex].url : ''}
                initialAlt={(editingImageIndex !== null && images[editingImageIndex]) ? (images[editingImageIndex].alt || '') : ''}
                onSave={saveAltText}
            />

            {/* Discard Confirmation */}
            <ConfirmModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={performClose}
                title={t('post.discard_title', 'Discard reply?')}
                message={t('post.discard_message', 'This can’t be undone and you’ll lose your draft.')}
                confirmLabel={t('post.discard_confirm', 'Discard')}
                cancelLabel={t('post.discard_cancel', 'Cancel')}
                variant="danger"
            />
        </>
    );
};

export default ReplyModal;
