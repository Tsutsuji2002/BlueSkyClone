import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { closeReply } from '../redux/slices/modalsSlice';
import { createPost } from '../redux/slices/postsSlice';
import { showToast } from '../redux/slices/toastSlice';

import Avatar from '../components/common/Avatar';
import { FiX, FiImage, FiSmile, FiGrid } from 'react-icons/fi';
import { MdGif } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { POST_CHARACTER_LIMIT } from '../constants';
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
    const authSettings = useAppSelector((state: RootState) => state.auth.settings);
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
    const [languageAccepted, setLanguageAccepted] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const prevContentRef = useRef('');

    const { results: mentionResults, isLoading: isMentionLoading } = useUserSearch(mentionSearch);

    // Detect when post is in a different language
    const postLanguage = (post as any)?.language || null;
    const uiLanguage = i18n.language || 'en';
    const showLanguageBanner = postLanguage && postLanguage !== uiLanguage && !languageAccepted;

    const langNames: Record<string, string> = {
        en: 'English', vi: 'Vietnamese', ja: 'Japanese', fr: 'French',
        ko: 'Korean', zh: 'Chinese', es: 'Spanish', de: 'German',
    };
    const currentLangName = langNames[uiLanguage] || uiLanguage.toUpperCase();
    const postLangName = postLanguage ? (langNames[postLanguage] || postLanguage.toUpperCase()) : '';

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

        // Auto-grow textarea
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;

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
                className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal — top-aligned panel */}
            <div className="fixed inset-x-0 top-0 z-50 flex justify-center">
                <div
                    className="bg-[#1c1f26] w-full max-w-[600px] flex flex-col shadow-2xl"
                    style={{ maxHeight: '95vh' }}
                    onClick={e => e.stopPropagation()}
                >

                    {/* ── Header ────────────────────────────────── */}
                    <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
                        <button
                            onClick={handleClose}
                            className="text-[15px] font-bold text-primary-400 hover:text-primary-300 transition-colors"
                        >
                            {t('common.cancel')}
                        </button>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitDisabled}
                            className={cn(
                                "px-5 py-1.5 rounded-full text-[15px] font-bold transition-all",
                                isSubmitDisabled
                                    ? "bg-primary-500/50 text-white/50 cursor-not-allowed"
                                    : "bg-primary-500 text-white hover:bg-primary-600 active:scale-95"
                            )}
                        >
                            {isPostLoading ? t('common.posting', 'Posting…') : t('common.reply')}
                        </button>
                    </div>

                    {/* ── Scrollable Body ───────────────────────── */}
                    <div className="flex-1 overflow-y-auto">

                        {/* Original post */}
                        <div className="flex gap-3 px-4 pt-1 pb-4">
                            <div className="flex-shrink-0">
                                <Avatar
                                    src={post.author.avatarUrl || post.author.avatar}
                                    alt={post.author.displayName}
                                    size="md"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    <span className="font-bold text-white text-[15px] truncate">
                                        {post.author.displayName}
                                    </span>
                                    {/* Optional: show image thumbnail on the right */}
                                    {post.media && post.media.length > 0 && (
                                        <span className="ml-auto flex gap-1">
                                            {post.media.slice(0, 2).map((m, i) => (
                                                <img key={i} src={m.url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                            ))}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[15px] text-gray-300 leading-normal whitespace-pre-wrap break-words">
                                    {post.content}
                                </p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-700 mx-4" />

                        {/* Reply input */}
                        <div className="flex gap-3 px-4 pt-4 pb-2">
                            <div className="flex-shrink-0">
                                <Avatar src={user?.avatar} alt={user?.displayName || 'User'} size="md" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <textarea
                                    ref={textareaRef}
                                    value={content}
                                    onChange={handleContentChange}
                                    placeholder={t('common.reply_placeholder', 'Write your reply')}
                                    className="w-full py-2 text-[18px] bg-transparent border-none resize-none focus:outline-none text-white placeholder-gray-500 min-h-[80px]"
                                    autoFocus
                                    rows={3}
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
                                        "grid gap-2 rounded-2xl overflow-hidden mt-2 mb-4",
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
                                                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full"
                                                >
                                                    <FiX size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { setEditingImageIndex(idx); setIsAltModalOpen(true); }}
                                                    className={cn(
                                                        "absolute bottom-2 left-2 px-2 py-1 rounded text-[11px] font-bold",
                                                        img.alt ? "bg-primary-500 text-white" : "bg-black/60 text-white"
                                                    )}
                                                >
                                                    ALT
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {video && (
                                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black mt-2 mb-4">
                                        <video src={video.url} className="w-full h-full object-contain" controls />
                                        <button
                                            onClick={() => setVideo(null)}
                                            className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full"
                                        >
                                            <FiX size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Language hint banner */}
                        {showLanguageBanner && (
                            <div className="mx-4 mb-3 flex items-center gap-3 px-4 py-3 bg-[#161b27] border border-gray-700 rounded-xl">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-primary-500/20 flex-shrink-0">
                                    <FiGrid size={14} className="text-primary-400" />
                                </div>
                                <p className="flex-1 text-[13px] text-gray-300 leading-snug">
                                    The post you're replying to was marked as being written in{' '}
                                    <strong className="text-white">{postLangName}</strong> by its author. Would you like to reply in{' '}
                                    <strong className="text-white">{postLangName}</strong>?
                                </p>
                                <button
                                    onClick={() => setLanguageAccepted(true)}
                                    className="px-4 py-1.5 rounded-full bg-gray-600 hover:bg-gray-500 text-white text-[13px] font-bold transition-colors flex-shrink-0"
                                >
                                    Yes
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Footer toolbar ─────────────────────────── */}
                    <div className="border-t border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0 relative">
                        {/* Left: media tools */}
                        <div className="flex items-center gap-1">
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
                                className="p-2 rounded-full text-primary-400 hover:bg-primary-400/10 transition-colors disabled:opacity-40"
                            >
                                <FiImage size={22} />
                            </button>
                            {/* GIF text button */}
                            <button className="px-2 py-1 rounded-full text-primary-400 hover:bg-primary-400/10 transition-colors font-bold text-[15px]">
                                GIF
                            </button>
                            <button
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="p-2 rounded-full text-primary-400 hover:bg-primary-400/10 transition-colors"
                            >
                                <FiSmile size={22} />
                            </button>

                            {/* Emoji picker popup */}
                            {showEmojiPicker && (
                                <div className="absolute bottom-full left-0 mb-2 z-50">
                                    <EmojiPicker
                                        onEmojiClick={onEmojiClick}
                                        theme={Theme.DARK}
                                        width={320}
                                        height={380}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Right: language + character count */}
                        <div className="flex items-center gap-3">
                            {/* Language selector */}
                            <button className="text-[14px] font-medium text-primary-400 hover:text-primary-300 transition-colors">
                                {currentLangName}
                            </button>

                            {/* Character count */}
                            <span className={cn(
                                "text-[14px] font-medium tabular-nums",
                                isOverLimit ? 'text-red-500' : remainingChars <= 20 ? 'text-yellow-400' : 'text-gray-400'
                            )}>
                                {remainingChars}
                            </span>

                            {/* Progress ring */}
                            <div className="relative w-[26px] h-[26px] flex-shrink-0">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 22 22">
                                    <circle
                                        cx="11" cy="11" r="9"
                                        fill="none"
                                        strokeWidth="2.5"
                                        className="stroke-gray-700"
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
                                            isOverLimit ? "stroke-red-500" : remainingChars <= 20 ? "stroke-yellow-400" : "stroke-primary-500"
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
                title={t('post.discard_title')}
                message={t('post.discard_message')}
                confirmLabel={t('post.discard_confirm')}
                cancelLabel={t('post.discard_cancel')}
                variant="danger"
            />
        </>
    );
};

export default ReplyModal;
