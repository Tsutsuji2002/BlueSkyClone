import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { closeCreatePost, closeEditPost, closeQuote } from '../redux/slices/modalsSlice';
import { createPost, updatePost } from '../redux/slices/postsSlice';
import { showToast } from '../redux/slices/toastSlice';

import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import { FiX, FiImage, FiSmile, FiChevronRight, FiCheck } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { POST_CHARACTER_LIMIT, ALL_LANGUAGES } from '../constants';
import { detectLanguage } from '../utils/languageDetector';
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
import QuotedPost from '../components/feed/QuotedPost';
import PostInteractionSettingsModal from './PostInteractionSettingsModal';
import LanguagePickerModal from '../components/modals/LanguagePickerModal';
import GifPicker from '../components/common/GifPicker';

const CreatePostModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const isOpen = useAppSelector((state) => state.modals.createPost);
    const editPostState = useAppSelector((state) => state.modals.editPost);
    const quoteState = useAppSelector((state) => state.modals.quote);
    const isEditing = editPostState.isOpen && !!editPostState.post;
    const isQuoting = quoteState.isOpen && !!quoteState.post;
    const postToEdit = editPostState.post;
    const postToQuote = quoteState.post;
    const user = useAppSelector((state) => state.auth.user);
    const isPostLoading = useAppSelector((state) => state.posts.isLoading);

    const [content, setContent] = useState('');
    const [images, setImages] = useState<(PostImage & { file?: File })[]>([]);
    const [imageFiles, setImageFiles] = useState<File[]>([]); // Keep for now but we'll use images[].file
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

    // Interaction & Language Settings
    const authSettings = useAppSelector((state) => state.auth.settings);
    const [replyRestriction, setReplyRestriction] = useState<string>(authSettings?.defaultReplyRestriction || 'anyone');
    const [allowQuotes, setAllowQuotes] = useState<boolean>(authSettings?.defaultAllowQuotes ?? true);
    const [postLanguage, setPostLanguage] = useState<string>('');
    const [isLanguageManual, setIsLanguageManual] = useState(false);
    const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
    const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [selectedGifUrl, setSelectedGifUrl] = useState<string | null>(null);

    const { results: mentionResults, isLoading: isMentionLoading } = useUserSearch(mentionSearch);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const prevContentRef = useRef('');

    // Pre-fill for editing
    useEffect(() => {
        if (isEditing && postToEdit) {
            setContent(postToEdit.content);
            if (postToEdit.media && postToEdit.media.length > 0) {
                const loadedImages = postToEdit.media
                    .filter(m => m.type === 'image' || !m.type)
                    .map(m => ({
                        url: m.url,
                        alt: m.altText || ''
                    }));
                setImages(loadedImages);
            } else if (postToEdit.imageUrls && postToEdit.imageUrls.length > 0) {
                const loadedImages = postToEdit.imageUrls.map(url => ({
                    url: url,
                    alt: ''
                }));
                setImages(loadedImages);
            }

            if (postToEdit.video) {
                setVideo(postToEdit.video);
            } else if (postToEdit.videoUrl) {
                setVideo({ url: postToEdit.videoUrl });
            }

            // Handle GIF
            if (postToEdit.media) {
                const gifMedium = postToEdit.media.find(m => m.type === 'gif');
                if (gifMedium) {
                    setSelectedGifUrl(gifMedium.url);
                }
            }

            if (postToEdit.linkPreview) {
                setLinkPreview(postToEdit.linkPreview);
                setStickyLink(postToEdit.linkPreview.url);
            }

            // Language & Interaction Settings
            setReplyRestriction(postToEdit.replyRestriction || authSettings?.defaultReplyRestriction || 'anyone');
            setAllowQuotes(postToEdit.allowQuotes ?? authSettings?.defaultAllowQuotes ?? true);

            if (postToEdit.language) {
                setPostLanguage(postToEdit.language);
                setIsLanguageManual(true);
            } else {
                const detected = detectLanguage(postToEdit.content);
                setPostLanguage(detected || '');
                setIsLanguageManual(false);
            }
        }
    }, [isEditing, postToEdit, authSettings]);

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
            if (linkPreview) {
                // Do not replace existing link card based on user request
                return;
            }

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

    // Language Detection for current post
    useEffect(() => {
        if (!isOpen || isLanguageManual || content.trim().length < 5) return;

        const detected = detectLanguage(content);
        if (detected && detected !== postLanguage) {
            setPostLanguage(detected);
        }
    }, [content, isOpen, isLanguageManual, postLanguage]);

    // Update defaults if they change in settings
    useEffect(() => {
        if (!isEditing && authSettings) {
            setReplyRestriction(authSettings.defaultReplyRestriction || 'anyone');
            setAllowQuotes(authSettings.defaultAllowQuotes ?? true);
        }
    }, [authSettings, isEditing]);

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
        if (isEditing) {
            dispatch(closeEditPost());
        } else if (isQuoting) {
            dispatch(closeQuote());
        } else {
            dispatch(closeCreatePost());
        }
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
        setSelectedGifUrl(null);
        setShowGifPicker(false);
        setReplyRestriction(authSettings?.defaultReplyRestriction || 'anyone');
        setAllowQuotes(authSettings?.defaultAllowQuotes ?? true);
        setPostLanguage('');
        setIsLanguageManual(false);
    };

    const settings = useAppSelector((state) => state.auth.settings);

    const handleSubmit = async () => {
        if (isPostLoading || (!content.trim() && images.length === 0 && !video) || !user) return;

        // Enforce Alt Text
        if (settings?.requireAltText && images.length > 0) {
            const missingAlt = images.some(img => !img.alt?.trim());
            if (missingAlt) {
                dispatch(showToast({ message: t('post.alt_text_required', 'Alt text is required for all images'), type: 'error' }));
                return;
            }
        }

        const formData = new FormData();
        formData.append('Content', content);
        formData.append('ReplyRestriction', replyRestriction);
        formData.append('AllowQuotes', allowQuotes.toString());
        if (postLanguage) formData.append('Language', postLanguage);
        if (selectedGifUrl) formData.append('GifUrl', selectedGifUrl);

        if (isQuoting && postToQuote) {
            formData.append('QuotePostId', postToQuote.id);
        }

        // Handle Images
        // If editing, we might need to handle existing images separately if we want to support deleting them.
        // But for now, we only support ADDING new images via file input.
        // Existing images (urls) are not sent back in CreatePostRequest for "Images" or "Video" fields as they expect IFormFile.
        // The backend UpdatePost only updates Content and LinkPreview currently. 
        // Media update is not fully implemented in backend yet as noted in PostService.cs.
        // But we should still send what we can.

        images.forEach(img => {
            if (img.file) {
                formData.append('Images', img.file);
            }
            formData.append('AltTexts', img.alt || '');
        });

        if (videoFile) {
            formData.append('Video', videoFile);
        }

        if (linkPreview) {
            formData.append('LinkPreviewUrl', linkPreview.url);
            if (linkPreview.title) formData.append('LinkPreviewTitle', linkPreview.title);
            if (linkPreview.description) formData.append('LinkPreviewDescription', linkPreview.description);
            if (linkPreview.image) formData.append('LinkPreviewImage', linkPreview.image);
            if (linkPreview.domain) formData.append('LinkPreviewDomain', linkPreview.domain);
        }

        try {
            if (isEditing && postToEdit) {
                await dispatch(updatePost({ postId: postToEdit.id, formData })).unwrap();
                dispatch(showToast({ message: t('post.updated_success', 'Post updated successfully'), type: 'success' }));
            } else {
                await dispatch(createPost(formData)).unwrap();
                dispatch(showToast({ message: t('post.created_success'), type: 'success' }));
            }
            performClose();
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

                    // Check file size (500MB Limit)
                    const MAX_SIZE = 500 * 1024 * 1024; // 500MB
                    if (file.size > MAX_SIZE) {
                        dispatch(showToast({ message: t('post.video_too_large', 'Video too large (Max 500MB)'), type: 'error' }));
                        return;
                    }

                    setVideoFile(file);
                    const url = URL.createObjectURL(file);
                    setVideo({ url });
                    return;
                }

                if (images.length >= 4) return; // Limit to 4 images

                const reader = new FileReader();
                reader.onloadend = () => {
                    setImages((prev) => [...prev, { url: reader.result as string, file, alt: '' }].slice(0, 4));
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
            {/* Main Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={handleClose}>
                <div
                    className="bg-dark-surface rounded-[14px] border border-dark-border w-full max-w-[600px] shadow-2xl flex flex-col"
                    style={{ maxHeight: 'min(90vh, 720px)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header: Cancel | Drafts | Post */}
                    <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
                        <button
                            onClick={handleClose}
                            className="text-[15px] font-bold text-[#1d9bf0] hover:text-[#60b8f5] transition-colors"
                        >
                            {t('common.cancel', 'Cancel')}
                        </button>
                        <span className="text-[15px] font-bold text-gray-400">{t('common.drafts', 'Drafts')}</span>
                        <div className="flex items-center gap-3">
                            {isVideoProcessing && (
                                <div className="flex items-center gap-2 text-sm text-gray-500 animate-pulse">
                                    <div className="w-4 h-4 rounded-full border-2 border-[#1d9bf0] border-t-transparent animate-spin" />
                                    <span>{t('post.video_processing')}</span>
                                </div>
                            )}
                            <button
                                onClick={handleSubmit}
                                disabled={(!content.trim() && images.length === 0 && !video && !selectedGifUrl) || isOverLimit || isPostLoading}
                                className="px-[18px] py-[6px] rounded-full text-[14px] font-bold transition-all bg-[#1d9bf0] text-white hover:bg-[#1a8cd8] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isPostLoading
                                    ? (isEditing ? t('common.saving', 'Saving…') : t('common.posting', 'Posting…'))
                                    : (isEditing ? t('common.save', 'Save') : t('common.post_verb', 'Post'))}
                            </button>
                        </div>
                    </div>

                    <div className="px-4 pt-3 pb-2 overflow-y-auto flex-1">
                        <div className="flex gap-3">
                            <Avatar src={user?.avatar} alt={user?.displayName || 'User'} size="md" />

                            <div className="flex-1 min-w-0">

                                <textarea
                                    ref={textareaRef}
                                    value={content}
                                    onChange={handleContentChange}
                                    placeholder={t('common.whats_new', "What's up?")}
                                    className="w-full min-h-[120px] py-2 text-[20px] bg-transparent border-none resize-none focus:outline-none text-white placeholder-gray-500"
                                    autoFocus
                                />

                                {/* Interaction Settings */}
                                <div className="mt-2 mb-4">
                                    <button
                                        onClick={() => setIsInteractionModalOpen(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
                                    >
                                        <FiSmile size={13} className="text-gray-400" />
                                        <span>{replyRestriction === 'anyone' && allowQuotes ? t('post.anyone_can_interact', 'Anyone can interact') : t('post.interaction_limited', 'Interaction limited')}</span>
                                        <FiChevronRight size={12} className="ml-0.5 rotate-90 opacity-40" />
                                    </button>
                                </div>

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

                                {content.match(/#(\w+)/g) && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {(content.match(/#(\w+)/g) || []).map((tag, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-bold rounded-md">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {mentionRange && (
                                    <MentionSuggester
                                        users={mentionResults}
                                        isLoading={isMentionLoading}
                                        onSelect={handleMentionSelect}
                                    />
                                )}

                                {isQuoting && postToQuote && (
                                    <div className="mt-4 mb-2">
                                        <QuotedPost post={postToQuote} isCard={false} />
                                    </div>
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

                                {selectedGifUrl && (
                                    <div className="mb-4 relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-dark-surface aspect-video">
                                        <img src={selectedGifUrl} alt="Selected GIF" className="w-full h-full object-contain" />
                                        <button
                                            onClick={() => setSelectedGifUrl(null)}
                                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors z-10"
                                        >
                                            <FiX size={18} />
                                        </button>
                                        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/60 text-white rounded font-bold text-[10px]">
                                            GIF
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Toolbar */}
                    <div className="px-2 py-2 border-t border-gray-800 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" multiple />
                            <button
                                onClick={() => { handleImageClick(); setShowEmojiPicker(false); setShowGifPicker(false); }}
                                disabled={images.length >= 20 || !!video || !!selectedGifUrl}
                                className="p-2.5 rounded-full text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors disabled:opacity-40"
                            ><FiImage size={20} strokeWidth={2.5} /></button>
                            <button
                                onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
                                disabled={images.length > 0 || !!video || !!selectedGifUrl}
                                className="px-2.5 py-2.5 rounded-full text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors font-bold text-[14px] leading-none disabled:opacity-40"
                            >GIF</button>
                            <button
                                onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
                                className="p-2.5 rounded-full text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors"
                            ><FiSmile size={20} strokeWidth={2.5} /></button>
                        </div>

                        <div className="flex items-center gap-3 pr-2">
                            {/* Language */}
                            <div className="relative">
                                <button onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                                    className="text-[13px] font-bold text-[#1d9bf0] hover:text-[#60b8f5] transition-colors"
                                >{ALL_LANGUAGES.find(l => l.code === postLanguage)?.englishName || 'English'}</button>
                                {isLanguageDropdownOpen && (
                                    <div className="absolute bottom-full right-0 mb-2 w-52 bg-[#1e2028] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-[65]">
                                        <div className="max-h-[260px] overflow-y-auto p-1 space-y-0.5">
                                            {['en', 'vi', 'ja', 'fr', 'ko', 'zh'].map(code => {
                                                const lang = ALL_LANGUAGES.find(l => l.code === code);
                                                if (!lang) return null;
                                                return (
                                                    <button key={code} onClick={() => { setPostLanguage(code); setIsLanguageManual(true); setIsLanguageDropdownOpen(false); }}
                                                        className={cn('w-full text-left px-4 py-2.5 rounded-xl text-[14px] transition-colors', postLanguage === code ? 'bg-[#1d9bf0] text-white font-bold' : 'text-gray-200 hover:bg-gray-700/50')}
                                                    >{lang.englishName}</button>
                                                );
                                            })}
                                            <div className="h-px bg-gray-700 my-1" />
                                            <button onClick={() => { setIsLanguageDropdownOpen(false); setIsLanguageModalOpen(true); }}
                                                className="w-full flex items-center justify-between px-4 py-2 text-[13px] text-gray-400 hover:bg-gray-700/50 rounded-xl transition-colors"
                                            >More languages… <FiChevronRight size={13} /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <span className={cn('text-[14px] font-medium tabular-nums', isOverLimit ? 'text-red-500 font-bold' : remainingChars <= 20 ? 'text-yellow-500' : 'text-gray-400')}>{remainingChars}</span>
                            <div className="w-[22px] h-[22px] flex-shrink-0">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 22 22">
                                    <circle cx="11" cy="11" r="9" fill="none" strokeWidth="2.5" className="stroke-gray-700/50" />
                                    <circle cx="11" cy="11" r="9" fill="none" strokeWidth="2.5"
                                        strokeDasharray={`${2 * Math.PI * 9}`}
                                        strokeDashoffset={`${2 * Math.PI * 9 * (1 - Math.min(content.length / POST_CHARACTER_LIMIT, 1))}`}
                                        strokeLinecap="round"
                                        className={cn('transition-all duration-150', isOverLimit ? 'stroke-red-500' : remainingChars <= 20 ? 'stroke-yellow-500' : 'stroke-[#1d9bf0]')}
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Emoji Picker Overlay */}
            {showEmojiPicker && (
                <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-4 bg-black/20" onClick={() => setShowEmojiPicker(false)}>
                    <div className="rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <EmojiPicker onEmojiClick={(d) => { setContent(p => p + d.emoji); }} theme={Theme.DARK} width={320} height={420} lazyLoadEmojis />
                    </div>
                </div>
            )}

            {/* Alt Text Modal */}
            <AltTextModal
                isOpen={isAltModalOpen}
                onClose={() => setIsAltModalOpen(false)}
                imageUrl={(editingImageIndex !== null && images[editingImageIndex]) ? images[editingImageIndex].url : ''}
                initialAlt={(editingImageIndex !== null && images[editingImageIndex]) ? (images[editingImageIndex].alt || '') : ''}
                onSave={saveAltText}
            />

            <PostInteractionSettingsModal
                isOpen={isInteractionModalOpen}
                onClose={() => setIsInteractionModalOpen(false)}
                replyRestriction={replyRestriction}
                setReplyRestriction={setReplyRestriction}
                allowQuotes={allowQuotes}
                setAllowQuotes={setAllowQuotes}
            />

            <LanguagePickerModal
                isOpen={isLanguageModalOpen}
                onClose={() => setIsLanguageModalOpen(false)}
                selectedCode={postLanguage}
                onSelect={(code) => {
                    setPostLanguage(code);
                    setIsLanguageManual(true);
                }}
            />

            {/* GIF Picker Overlay */}
            {showGifPicker && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm lg:p-12">
                    <div className="bg-white dark:bg-dark-surface w-full max-w-lg h-[500px] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        <GifPicker
                            onSelect={(url) => {
                                setSelectedGifUrl(url);
                                setImages([]);
                                setVideo(null);
                                setVideoFile(null);
                                setShowGifPicker(false);
                            }}
                            onClose={() => setShowGifPicker(false)}
                        />
                    </div>
                </div>
            )}

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
