import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { closeReply } from '../redux/slices/modalsSlice';
import { createPost } from '../redux/slices/postsSlice';
import { showToast } from '../redux/slices/toastSlice';

import Button from '../components/common/Button';
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

import { RootState } from '../redux/store';

const ReplyModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const { t, i18n } = useTranslation();
    const { isOpen, post } = useAppSelector((state: RootState) => state.modals.reply);
    const user = useAppSelector((state: RootState) => state.auth.user);
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const prevContentRef = useRef('');

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
        } else if (!stickyLink && matches.length > 0) {
            const firstLink = matches.find(link => !dismissedLinks.has(link));
            if (firstLink && (isPaste || isEnterOrSpace)) {
                const fetchMetadata = async () => {
                    setIsLinkLoading(true);
                    const metadata = await getLinkMetadata(firstLink);
                    if (metadata) {
                        setStickyLink(firstLink);
                        setLinkPreview(metadata);
                    }
                    setIsLinkLoading(false);
                };
                fetchMetadata();
            }
        }

        prevContentRef.current = content;
    }, [content, stickyLink, dismissedLinks, isOpen, linkPreview, setIsLinkLoading]);

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
        setVideo(null);
        setLinkPreview(null);
        setStickyLink(null);
        setDismissedLinks(new Set());
        setShowEmojiPicker(false);
        setIsVideoProcessing(false);
    };

    const handleSubmit = async () => {
        if ((!content.trim() && images.length === 0) || !user || !post) return;

        const formData = new FormData();
        formData.append('Content', content);
        formData.append('ReplyToPostId', post.id);

        // Set RootPostId: if the post we're replying to is already a reply, use its RootPostId
        // Otherwise, use the post's own ID as the root
        const rootId: string = (post as any).rootPostId || post.id;
        formData.append('RootPostId', rootId);


        imageFiles.forEach((file: File) => {
            formData.append('Images', file);
        });

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
            setImages(prev => prev.map((img, i) =>
                i === editingImageIndex ? { ...img, alt } : img
            ));
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

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-dark-border">
                        <button
                            onClick={handleClose}
                            className="text-[17px] text-primary-500 hover:text-primary-600 font-medium px-2 py-1"
                        >
                            {t('common.cancel')}
                        </button>
                        <div className="flex items-center gap-3">
                            {isVideoProcessing && (
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-text-secondary animate-pulse">
                                    <div className="w-4 h-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                                    <span>{t('post.video_processing')}</span>
                                </div>
                            )}
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleSubmit}
                                disabled={(!content.trim() && images.length === 0 && !video) || isOverLimit}
                                className="rounded-full px-6 py-1.5 font-bold"
                            >
                                {t('common.reply')}
                            </Button>
                        </div>
                    </div>

                    <div className="p-4 overflow-y-auto flex-1">
                        {/* Original Post */}
                        <div className="flex gap-3 relative">
                            {/* Vertical Line */}
                            <div className="absolute left-[20px] top-[44px] bottom-[-20px] w-[2px] bg-gray-200 dark:bg-dark-border" />

                            <Avatar
                                src={post.author.avatarUrl || post.author.avatar}
                                alt={post.author.displayName}
                                size="md"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-0.5">
                                    <span className="font-bold text-gray-900 dark:text-dark-text truncate">
                                        {post.author.displayName}
                                    </span>
                                    <span className="text-gray-500 dark:text-dark-text-secondary truncate">
                                        @{post.author.handle}
                                    </span>
                                    <span className="text-gray-500 dark:text-dark-text-secondary">·</span>
                                    <span className="text-gray-500 dark:text-dark-text-secondary whitespace-nowrap">
                                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: false, locale: dateLocale })}
                                    </span>
                                </div>
                                <p className="text-[15px] text-gray-800 dark:text-dark-text leading-normal">
                                    {post.content}
                                </p>
                            </div>
                        </div>

                        {/* Reply Area */}
                        <div className="flex gap-3 mt-6 pb-4">
                            <Avatar
                                src={user?.avatar}
                                alt={user?.displayName || 'User'}
                                size="md"
                            />
                            <div className="flex-1">
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder={t('common.reply_placeholder')}
                                    className="w-full min-h-[120px] py-2 text-[18px] bg-transparent border-none resize-none focus:outline-none text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary"
                                    autoFocus
                                />

                                {/* Link Preview (Only if no images/video) */}
                                {isLinkLoading && !video && images.length === 0 && (
                                    <div className="mb-4 h-[90px] rounded-xl border border-gray-100 dark:border-dark-border animate-pulse flex items-center p-3 gap-3">
                                        <div className="w-12 h-12 bg-gray-200 dark:bg-dark-border rounded-lg" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-gray-200 dark:bg-dark-border rounded w-3/4" />
                                            <div className="h-2 bg-gray-200 dark:bg-dark-border rounded w-1/2" />
                                        </div>
                                    </div>
                                )}

                                {linkPreview && images.length === 0 && !video && !isLinkLoading && (
                                    <div className="mb-4 rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden relative bg-white dark:bg-dark-surface group shadow-sm hover:shadow-md transition-shadow">
                                        <button
                                            onClick={handleDismissLink}
                                            className="absolute top-2 right-2 z-20 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                                        >
                                            <FiX size={16} />
                                        </button>
                                        <a
                                            href={linkPreview.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block h-full transition-opacity"
                                        >
                                            {linkPreview.image ? (
                                                <div className="flex flex-col h-[300px]">
                                                    <div className="h-[200px] w-full bg-gray-100 dark:bg-dark-border relative overflow-hidden">
                                                        <img
                                                            src={linkPreview.image}
                                                            alt=""
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                        />
                                                    </div>
                                                    <div className="p-3 flex-1 flex flex-col justify-center border-t border-gray-100 dark:border-dark-border">
                                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-tight mb-0.5">
                                                            <span className="truncate">{linkPreview.domain}</span>
                                                        </div>
                                                        <h3 className="font-bold text-[14px] leading-snug text-gray-900 dark:text-dark-text mb-0.5 line-clamp-1">{linkPreview.title}</h3>
                                                        <p className="text-[12.5px] leading-tight text-gray-500 dark:text-dark-text-secondary line-clamp-2">{linkPreview.description}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col h-[90px] p-3 justify-center">
                                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-tight mb-0.5">
                                                        <span className="truncate">{linkPreview.domain}</span>
                                                    </div>
                                                    <h3 className="font-bold text-[14px] leading-snug text-gray-900 dark:text-dark-text mb-0.5 line-clamp-1">{linkPreview.title}</h3>
                                                    <p className="text-[12.5px] leading-tight text-gray-500 dark:text-dark-text-secondary line-clamp-1">{linkPreview.description}</p>
                                                </div>
                                            )}
                                        </a>
                                    </div>
                                )}

                                {/* Media Previews (Consolidated) */}
                                {(images.length > 0 || video) && (
                                    <div className="mb-4">
                                        {video ? (
                                            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black group">
                                                <video src={video.url} className="w-full h-full object-contain" controls />
                                                <button
                                                    onClick={() => setVideo(null)}
                                                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors z-10"
                                                >
                                                    <FiX size={18} />
                                                </button>
                                                <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full text-white text-sm backdrop-blur-sm shadow-lg">
                                                    <FiSmile size={14} />
                                                    <span>{t('post.captions_alt_text')}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className={cn(
                                                    "grid gap-2 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto",
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
                                                {images.length > 4 && (
                                                    <div className="mt-2 py-2 px-3 bg-gray-50 dark:bg-dark-bg/50 text-[12px] text-gray-500 dark:text-dark-text-secondary rounded-xl flex items-center gap-2 border border-gray-100 dark:border-dark-border">
                                                        <FiImage size={14} />
                                                        <span>{t('post.images_selected', { count: images.length })}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Toolbar */}
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-border flex items-center justify-between relative">
                        <div className="flex items-center gap-2">
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
                                disabled={images.length >= 20 || !!video}
                                className="p-2 hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-full text-primary-500 transition-colors disabled:opacity-50"
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
                                    <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.AUTO} />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <span className={`text-[13px] font-medium ${isOverLimit ? 'text-red-500' : 'text-gray-500 dark:text-dark-text-secondary'}`}>
                                    {POST_CHARACTER_LIMIT - content.length}
                                </span>
                                <div className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-dark-border relative">
                                    <div
                                        className={`absolute inset-0 rounded-full border-2 border-primary-500 transition-all duration-300`}
                                        style={{
                                            clipPath: `inset(0 ${100 - (content.length / POST_CHARACTER_LIMIT) * 100}% 0 0)`,
                                            opacity: content.length > 0 ? 1 : 0
                                        }}
                                    />
                                </div>
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
