import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { closeCreatePost } from '../redux/slices/modalsSlice';
import { createPost } from '../redux/slices/postsSlice';
import { showToast } from '../redux/slices/toastSlice';

import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import { FiX, FiImage, FiSmile } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { POST_CHARACTER_LIMIT } from '../constants';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { PostImage, PostVideo, LinkPreview } from '../types';
import AltTextModal from '../modals/AltTextModal';
import { cn } from '../utils/classNames';
import { getLinkMetadata } from '../utils/linkMetadata';
import ConfirmModal from '../components/common/ConfirmModal';
import { useUserSearch } from '../hooks/useUserSearch';
import MentionSuggester from '../components/common/MentionSuggester';
import RichText from '../components/common/RichText';
import { User } from '../types';

const CreatePostModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const isOpen = useAppSelector((state) => state.modals.createPost);
    const user = useAppSelector((state) => state.auth.user);
    const isPostLoading = useAppSelector((state) => state.posts.isLoading);

    const [content, setContent] = useState('');
    const [images, setImages] = useState<PostImage[]>([]);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [video, setVideo] = useState<PostVideo | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
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

    const { results: mentionResults, isLoading: isMentionLoading } = useUserSearch(mentionSearch);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
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

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart;
        setContent(newValue);

        // Mention detection
        const textBeforeCursor = newValue.slice(0, cursorPos);
        const atMatch = textBeforeCursor.match(/@(\w*)$/);

        console.log('Mention Debug:', {
            textBeforeCursor,
            atMatch,
            matched: atMatch ? atMatch[1] : 'none'
        });

        if (atMatch) {
            console.log('Setting mention search to:', atMatch[1]);
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

            const newCursorPos = mentionRange.start + handle.length + 2; // +1 for @, +1 for space

            // Focus back to textarea after selection and set cursor position
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
        dispatch(closeCreatePost());
        setContent('');
        setImages([]);
        setImageFiles([]);
        setVideo(null);
        setVideoFile(null);
        setLinkPreview(null);
        setStickyLink(null);
        setDismissedLinks(new Set());
        setShowEmojiPicker(false);
        setIsVideoProcessing(false);
    };

    const handleSubmit = async () => {
        if (isPostLoading || (!content.trim() && images.length === 0 && !video) || !user) return;

        const formData = new FormData();
        formData.append('Content', content);
        imageFiles.forEach(file => {
            formData.append('Images', file);
        });
        if (videoFile) {
            formData.append('Video', videoFile);
        }

        try {
            await dispatch(createPost(formData)).unwrap();
            performClose();
            dispatch(showToast({ message: t('post.created_success'), type: 'success' }));
        } catch (error: any) {
            dispatch(showToast({ message: error || t('common.failed_to_create'), type: 'error' }));
        }
    };

    const handleDismissLink = () => {
        if (stickyLink) {
            setDismissedLinks(prev => new Set(prev).add(stickyLink));
            setStickyLink(null);
            setLinkPreview(null);
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
                    if (images.length > 0 || video) return; // Only one video or images
                    setVideoFile(file);
                    const url = URL.createObjectURL(file);
                    setVideo({ url });
                    return;
                }

                if (images.length >= 4) return; // Limit to 4 images

                setImageFiles(prev => [...prev, file]);

                const reader = new FileReader();
                reader.onloadend = () => {
                    setImages((prev) => [...prev, { url: reader.result as string }].slice(0, 4));
                };
                reader.readAsDataURL(file);
            });
            event.target.value = '';
        }
    };


    const handleRemoveImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
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

    if (!isOpen) return null;

    const remainingChars = POST_CHARACTER_LIMIT - content.length;
    const isOverLimit = remainingChars < 0;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white dark:bg-dark-surface rounded-t-2xl lg:rounded-2xl w-full lg:max-w-2xl max-h-[90vh] lg:max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-dark-border">
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full transition-colors"
                        >
                            <FiX size={24} className="text-gray-600 dark:text-dark-text-secondary" />
                        </button>
                        <div className="flex items-center gap-3">
                            {isVideoProcessing && (
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-text-secondary animate-pulse">
                                    <div className="w-4 h-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                                    <span>{t('post.video_processing')}</span>
                                </div>
                            )}
                            <span className={`text-[13px] font-medium ${isOverLimit ? 'text-red-500' : 'text-gray-500 dark:text-dark-text-secondary'}`}>
                                {remainingChars}
                            </span>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleSubmit}
                                disabled={(!content.trim() && images.length === 0 && !video) || isOverLimit || isPostLoading}
                                className="rounded-full px-6 py-1.5 font-bold"
                            >
                                {isPostLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>{t('common.posting', 'Posting...')}</span>
                                    </div>
                                ) : t('common.post_verb')}
                            </Button>
                        </div>
                    </div>

                    <div className="p-4 overflow-y-auto flex-1">
                        <div className="flex gap-4">
                            <Avatar
                                src={user?.avatar}
                                alt={user?.displayName || 'User'}
                                size="md"
                            />

                            <div className="flex-1 min-w-0">

                                <textarea
                                    ref={textareaRef}
                                    value={content}
                                    onChange={handleContentChange}
                                    placeholder={t('common.whats_new')}
                                    className="w-full min-h-[150px] py-2 text-[20px] bg-transparent border-none resize-none focus:outline-none text-gray-900 dark:text-dark-text placeholder-gray-500 dark:placeholder-dark-text-secondary"
                                    autoFocus
                                />

                                {content.trim().length > 0 && (content.includes('@') || content.includes('http')) && (
                                    <div className="mt-2 mb-4 p-3 bg-blue-50/30 dark:bg-primary-900/5 rounded-xl border border-blue-100/50 dark:border-primary-800/20">
                                        <div className="text-[11px] font-bold text-primary-500 uppercase tracking-wider mb-2 opacity-70">
                                            {t('post.preview')}
                                        </div>
                                        <RichText
                                            content={content}
                                            className="text-[16px] text-gray-800 dark:text-dark-text leading-normal break-words whitespace-pre-wrap"
                                        />
                                    </div>
                                )}

                                {mentionRange && (
                                    <MentionSuggester
                                        users={mentionResults}
                                        isLoading={isMentionLoading}
                                        onSelect={handleMentionSelect}
                                    />
                                )}


                                {/* Link Preview (Only if no images/video) */}
                                {isLinkLoading && !video && images.length === 0 && (
                                    <div className="mb-4 h-[100px] rounded-xl border border-gray-100 dark:border-dark-border animate-pulse flex items-center p-4 gap-4">
                                        <div className="w-16 h-16 bg-gray-200 dark:bg-dark-border rounded-lg" />
                                        <div className="flex-1 space-y-3">
                                            <div className="h-4 bg-gray-200 dark:bg-dark-border rounded w-3/4" />
                                            <div className="h-3 bg-gray-200 dark:bg-dark-border rounded w-1/2" />
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
                                                <div className="flex flex-col h-[360px]">
                                                    <div className="h-[240px] w-full bg-gray-100 dark:bg-dark-border relative overflow-hidden">
                                                        <img
                                                            src={linkPreview.image}
                                                            alt=""
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                        />
                                                    </div>
                                                    <div className="p-4 flex-1 flex flex-col justify-center border-t border-gray-100 dark:border-dark-border">
                                                        <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-tight mb-1">
                                                            <span className="truncate">{linkPreview.domain}</span>
                                                        </div>
                                                        <h3 className="font-bold text-[16px] leading-snug text-gray-900 dark:text-dark-text mb-1 line-clamp-1">{linkPreview.title}</h3>
                                                        <p className="text-[14px] leading-normal text-gray-500 dark:text-dark-text-secondary line-clamp-2">{linkPreview.description}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col h-[100px] p-4 justify-center">
                                                    <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-tight mb-1">
                                                        <span className="truncate">{linkPreview.domain}</span>
                                                    </div>
                                                    <h3 className="font-bold text-[16px] leading-snug text-gray-900 dark:text-dark-text mb-1 line-clamp-1">{linkPreview.title}</h3>
                                                    <p className="text-[14px] leading-normal text-gray-500 dark:text-dark-text-secondary line-clamp-1">{linkPreview.description}</p>
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
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-border flex items-center gap-2 relative">
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

export default CreatePostModal;
