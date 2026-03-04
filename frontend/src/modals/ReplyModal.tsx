import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { closeReply } from '../redux/slices/modalsSlice';
import { createPost } from '../redux/slices/postsSlice';
import { showToast } from '../redux/slices/toastSlice';

import Avatar from '../components/common/Avatar';
import { FiX, FiImage, FiSmile } from 'react-icons/fi';
import { MdGif } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { POST_CHARACTER_LIMIT } from '../constants';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { PostImage, PostVideo, LinkPreview } from '../types';
import AltTextModal from '../modals/AltTextModal';
import { cn } from '../utils/classNames';
import { getLinkMetadata } from '../utils/linkMetadata';
import ConfirmModal from '../components/common/ConfirmModal';
import { useUserSearch } from '../hooks/useUserSearch';
import MentionSuggester from '../components/common/MentionSuggester';
import { User } from '../types';
import { RootState } from '../redux/store';
import MediaGrid from '../components/feed/MediaGrid';

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
    const [isVideoProcessing, setIsVideoProcessing] = useState(false);
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
    const [languageDismissed, setLanguageDismissed] = useState(false);

    const { results: mentionResults, isLoading: isMentionLoading } = useUserSearch(mentionSearch);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const prevContentRef = useRef('');

    // Detect when post has a different language than the reply
    const postLanguage = post?.language || null;
    const userLanguage = i18n.language || 'en';
    const showLanguageHint = postLanguage && postLanguage !== userLanguage && !languageDismissed;

    // Link Detection logic
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
            const isDifferentLink = !stickyLink || (addedLink !== stickyLink && !stickyLink.startsWith(addedLink) && !addedLink.startsWith(stickyLink));
            const isRePaste = stickyLink === addedLink && isPaste;
            const isFallback = linkPreview && !linkPreview.image;

            if (isDifferentLink || isRePaste || (isEnterOrSpace && (addedLink === stickyLink || isFallback))) {
                const fetchMetadata = async () => {
                    setIsLinkLoading(true);
                    const metadata = await getLinkMetadata(addedLink);
                    if (metadata) {
                        if (dismissedLinks.has(addedLink)) {
                            setDismissedLinks(prev => {
                                const next = new Set(prev);
                                next.delete(addedLink);
                                return next;
                            });
                        }
                        setStickyLink(addedLink);
                        setLinkPreview(metadata);
                    }
                    setIsLinkLoading(false);
                };
                fetchMetadata();
            }
        }

        prevContentRef.current = content;
    }, [content, stickyLink, dismissedLinks, isOpen, linkPreview]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart;
        setContent(newValue);

        // Auto-resize
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;

        // Mention detection
        const textBeforeCursor = newValue.slice(0, cursorPos);
        const atMatch = textBeforeCursor.match(/@(\w*)$/);

        if (atMatch) {
            setMentionSearch(atMatch[1]);
            setMentionRange({
                start: cursorPos - atMatch[0].length,
                end: cursorPos
            });
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
            const newContent = `${before}@${handle} ${after}`;
            setContent(newContent);
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
        const hasContent = content.trim().length > 0 || images.length > 0 || !!video;
        if (hasContent) {
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
        setIsVideoProcessing(false);
        setLanguageDismissed(false);
    };

    const handleSubmit = async () => {
        if ((!content.trim() && images.length === 0) || !user || !post) return;

        const formData = new FormData();
        formData.append('Content', content);
        formData.append('ReplyToPostId', post.id);

        const rootId: string = (post as any).rootPostId || post.id;
        formData.append('RootPostId', rootId);

        imageFiles.forEach((file: File) => {
            formData.append('Images', file);
        });

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

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            Array.from(files).forEach((file) => {
                if (file.type.startsWith('video/')) {
                    if (images.length > 0 || video) return;
                    setIsVideoProcessing(true);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setVideo({ url: reader.result as string });
                        setTimeout(() => setIsVideoProcessing(false), 2500);
                    };
                    reader.readAsDataURL(file);
                    return;
                }
                if (video) return;
                if (images.length >= 4) return;
                setImageFiles((prev: File[]) => [...prev, file]);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImages((prev: PostImage[]) => [...prev, { url: reader.result as string }].slice(0, 4));
                };
                reader.readAsDataURL(file);
            });
            event.target.value = '';
        }
    };

    const handleRemoveImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
        setImageFiles(imageFiles.filter((_, i) => i !== index));
    };

    const handleDismissLink = () => {
        if (stickyLink) {
            setDismissedLinks(prev => new Set(prev).add(stickyLink));
            setStickyLink(null);
            setLinkPreview(null);
        }
    };

    const openAltModal = (index: number) => {
        setEditingImageIndex(index);
        setIsAltModalOpen(true);
    };

    const saveAltText = (alt: string) => {
        if (editingImageIndex !== null) {
            setImages(prev => prev.map((img, i) => i === editingImageIndex ? { ...img, alt } : img));
        }
        setIsAltModalOpen(false);
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setContent((prev) => prev + emojiData.emoji);
        setShowEmojiPicker(false);
    };

    if (!isOpen || !post) return null;

    const remainingChars = POST_CHARACTER_LIMIT - content.length;
    const isOverLimit = remainingChars < 0;

    const dateLocale = (() => {
        switch (i18n.language) {
            case 'vi': return vi;
            default: return enUS;
        }
    })();

    // Get a language name for the hint banner
    const getLanguageName = (code: string) => {
        const names: Record<string, string> = { en: 'English', vi: 'Vietnamese', ja: 'Japanese', fr: 'French', ko: 'Korean', zh: 'Chinese', es: 'Spanish', de: 'German' };
        return names[code] || code.toUpperCase();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
                onClick={handleClose}
            />

            {/* Modal Panel */}
            <div className="fixed inset-x-0 top-0 z-50 flex justify-center items-start mt-0 lg:mt-12 lg:px-4 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-white dark:bg-[#16181c] w-full lg:max-w-[600px] lg:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-screen lg:max-h-[90vh] min-h-[400px]">

                    {/* Header Row */}
                    <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
                        <button
                            onClick={handleClose}
                            className="text-[15px] font-bold text-primary-500 hover:opacity-80 transition-opacity"
                        >
                            {t('common.cancel')}
                        </button>

                        <button
                            onClick={handleSubmit}
                            disabled={(!content.trim() && images.length === 0 && !video) || isOverLimit || isPostLoading}
                            className={cn(
                                "px-5 py-1.5 rounded-full text-[15px] font-bold transition-all",
                                (!content.trim() && images.length === 0 && !video) || isOverLimit || isPostLoading
                                    ? "bg-primary-500/50 text-white/70 cursor-not-allowed"
                                    : "bg-primary-500 text-white hover:bg-primary-600 active:scale-95"
                            )}
                        >
                            {isPostLoading ? t('common.posting', 'Posting...') : t('common.reply')}
                        </button>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {/* Original Post */}
                        <div className="px-4 pt-2 pb-0 flex gap-3 relative">
                            {/* Avatar + line connector */}
                            <div className="flex flex-col items-center flex-shrink-0">
                                <Avatar
                                    src={post.author.avatarUrl || post.author.avatar}
                                    alt={post.author.displayName}
                                    size="md"
                                />
                                <div className="w-[2px] bg-gray-300 dark:bg-gray-700 flex-1 mt-2 min-h-[20px]" />
                            </div>

                            <div className="flex-1 min-w-0 pb-3">
                                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                    <span className="font-bold text-gray-900 dark:text-white truncate text-[15px]">
                                        {post.author.displayName}
                                    </span>
                                    {post.media && post.media.length > 0 && (
                                        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                                            {post.media.slice(0, 3).map((m, i) => (
                                                <img key={i} src={m.url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-normal whitespace-pre-wrap break-words">
                                    {post.content}
                                </p>
                            </div>
                        </div>

                        {/* Separator line + Replying to label */}
                        <div className="px-4 mb-3 flex items-center gap-3">
                            <div className="flex flex-col items-center w-10 flex-shrink-0">
                                <Avatar src={user?.avatar} alt={user?.displayName || 'User'} size="sm" />
                            </div>
                            <span className="text-[13px] text-gray-500 dark:text-gray-400">
                                {t('post.replying_to', 'Replying to')} <span className="text-primary-500">@{post.author.handle}</span>
                            </span>
                        </div>

                        {/* Reply Input Area */}
                        <div className="px-4 flex gap-3">
                            <div className="flex flex-col items-center flex-shrink-0">
                                <Avatar src={user?.avatar} alt={user?.displayName || 'User'} size="md" />
                            </div>
                            <div className="flex-1 min-w-0 pb-4">
                                <textarea
                                    ref={textareaRef}
                                    value={content}
                                    onChange={handleContentChange}
                                    placeholder={t('common.reply_placeholder')}
                                    className="w-full py-2 text-[18px] bg-transparent border-none resize-none focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 min-h-[100px]"
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

                                {/* Media Previews */}
                                {(images.length > 0 || video) && (
                                    <div className="mb-4 mt-2">
                                        {video ? (
                                            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black group">
                                                <video src={video.url} className="w-full h-full object-contain" controls />
                                                <button
                                                    onClick={() => setVideo(null)}
                                                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors z-10"
                                                >
                                                    <FiX size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className={cn(
                                                "grid gap-2 rounded-2xl overflow-hidden",
                                                images.length === 1 && "grid-cols-1",
                                                images.length >= 2 && "grid-cols-2"
                                            )}>
                                                {images.map((img, idx) => (
                                                    <div key={idx} className="relative aspect-video group">
                                                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                                                        <button
                                                            onClick={() => handleRemoveImage(idx)}
                                                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                                                        >
                                                            <FiX size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => openAltModal(idx)}
                                                            className={cn(
                                                                "absolute bottom-2 left-2 px-2 py-1 rounded font-bold text-[11px] transition-colors",
                                                                img.alt ? "bg-primary-500 text-white" : "bg-black/60 text-white hover:bg-black/80"
                                                            )}
                                                        >
                                                            ALT
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Language Hint Banner */}
                    {showLanguageHint && postLanguage && (
                        <div className="px-4 py-3 bg-[#1a1f2e] border-t border-gray-800 flex items-center justify-between gap-3 flex-shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                                    <span className="text-primary-400 text-[11px] font-bold">A</span>
                                </div>
                                <p className="text-[13px] text-gray-300 leading-snug">
                                    {t('post.language_hint', 'The post you\'re replying to was marked as being written in')} <strong className="text-white">{getLanguageName(postLanguage)}</strong> {t('post.language_hint_2', 'by its author. Would you like to reply in')} <strong className="text-white">{getLanguageName(postLanguage)}</strong>?
                                </p>
                            </div>
                            <button
                                onClick={() => setLanguageDismissed(true)}
                                className="px-4 py-1.5 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-[13px] font-bold transition-colors flex-shrink-0"
                            >
                                {t('common.yes', 'Yes')}
                            </button>
                        </div>
                    )}

                    {/* Footer Toolbar */}
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between relative flex-shrink-0">
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
                                onClick={handleImageClick}
                                disabled={images.length >= 4 || !!video}
                                className="p-2 hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-full text-primary-500 transition-colors disabled:opacity-40"
                            >
                                <FiImage size={22} />
                            </button>
                            <button className="p-2 hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-full text-primary-500 transition-colors">
                                <MdGif size={24} />
                            </button>
                            <button
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="p-2 hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-full text-primary-500 transition-colors"
                            >
                                <FiSmile size={22} />
                            </button>
                            {showEmojiPicker && (
                                <div className="absolute bottom-full left-0 z-50 mb-2">
                                    <EmojiPicker
                                        onEmojiClick={onEmojiClick}
                                        theme={Theme.AUTO}
                                        width={320}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <span className={cn(
                                "text-[13px] font-medium",
                                isOverLimit ? 'text-red-500' : remainingChars <= 20 ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-500'
                            )}>
                                {remainingChars}
                            </span>
                            <div className="relative w-[22px] h-[22px]">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 22 22">
                                    <circle
                                        cx="11" cy="11" r="9.5"
                                        fill="none"
                                        strokeWidth="2.5"
                                        className="stroke-gray-200 dark:stroke-gray-700"
                                    />
                                    <circle
                                        cx="11" cy="11" r="9.5"
                                        fill="none"
                                        strokeWidth="2.5"
                                        strokeDasharray={`${2 * Math.PI * 9.5}`}
                                        strokeDashoffset={`${2 * Math.PI * 9.5 * (1 - Math.min(content.length / POST_CHARACTER_LIMIT, 1))}`}
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

            {/* Discard Confirmation Modal */}
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
