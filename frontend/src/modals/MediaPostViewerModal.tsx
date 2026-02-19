import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { useTranslation } from 'react-i18next';
import { FiX, FiChevronLeft, FiChevronRight, FiHeart, FiRepeat, FiMessageCircle, FiBookmark, FiMoreHorizontal, FiActivity } from 'react-icons/fi';
import { toggleLike, repostPost, bookmarkPost, fetchPostReplies } from '../redux/slices/postsSlice';
import { openReply } from '../redux/slices/modalsSlice';
import { Post } from '../types';
import Avatar from '../components/common/Avatar';
import RichText from '../components/common/RichText';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { API_BASE_URL } from '../constants';
import { cn } from '../utils/classNames';
import { RootState } from '../redux/store';

interface MediaPostViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: Post | null;
    initialMediaIndex?: number;
}

const MediaPostViewerModal: React.FC<MediaPostViewerModalProps> = ({
    isOpen,
    onClose,
    post: initialPost,
    initialMediaIndex = 0
}) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    // Internal state to allow "browsing" through posts within the modal
    const [currentPost, setCurrentPost] = useState<Post | null>(initialPost);
    const [history, setHistory] = useState<Post[]>([]);
    const [currentIndex, setCurrentIndex] = useState(initialMediaIndex);
    const [isContentExpanded, setIsContentExpanded] = useState(false);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);

    // Swipe state
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const minSwipeDistance = 50;

    const allPosts = useAppSelector((state: RootState) => state.posts.posts);
    const actionLoading = useAppSelector((state: RootState) => state.posts.actionLoading);
    const mediaPosts = allPosts.filter(p => (p.imageUrls && p.imageUrls.length > 0) || p.videoUrl);
    const currentPostIdx = mediaPosts.findIndex(p => p.id === currentPost?.id);

    const replies = allPosts.filter(p => p.replyToPostId === currentPost?.id);

    // Synchronize internal post with prop when it changes
    useEffect(() => {
        if (isOpen && initialPost) {
            setCurrentPost(initialPost);
            setHistory([]);
            setCurrentIndex(initialMediaIndex);
            setIsContentExpanded(false);
            setShowOptionsMenu(false);
        }
    }, [isOpen, initialPost, initialMediaIndex]);

    // Fetch replies for the current post in the modal
    useEffect(() => {
        if (isOpen && currentPost?.id) {
            dispatch(fetchPostReplies(currentPost.id));
        }
    }, [isOpen, currentPost?.id, dispatch]);

    if (!isOpen || !currentPost) return null;

    const handleNavigateToPost = (post: Post) => {
        setHistory(prev => [...prev, currentPost!]);
        setCurrentPost(post);
        setCurrentIndex(0);
        setIsContentExpanded(false);
    };

    const handleGoBack = () => {
        if (history.length > 0) {
            const prevPost = history[history.length - 1];
            setHistory(prev => prev.slice(0, -1));
            setCurrentPost(prevPost);
            setCurrentIndex(0);
            setIsContentExpanded(false);
        }
    };

    const allMedia = useMemo(() => {
        if (currentPost.media && currentPost.media.length > 0) {
            return currentPost.media;
        }
        return [
            ...(currentPost.imageUrls || []).map(url => ({ url, type: 'image' as const })),
            ...(currentPost.videoUrl ? [{ url: currentPost.videoUrl, type: 'video' as const }] : [])
        ];
    }, [currentPost]);

    const currentMedia = allMedia[currentIndex];

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        } else if (currentPostIdx > 0) {
            const prevPost = mediaPosts[currentPostIdx - 1];
            setCurrentPost(prevPost);
            const prevPostMediaCount = (prevPost.imageUrls?.length || 0) + (prevPost.videoUrl ? 1 : 0);
            setCurrentIndex(prevPostMediaCount - 1);
        }
    };

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex < allMedia.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else if (currentPostIdx < mediaPosts.length - 1) {
            const nextPost = mediaPosts[currentPostIdx + 1];
            setCurrentPost(nextPost);
            setCurrentIndex(0);
        }
    };

    // Swipe handlers
    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            handleNext();
        } else if (isRightSwipe) {
            handlePrev();
        }
    };

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(toggleLike(currentPost.id));
    };

    const handleRepost = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(repostPost(currentPost.id));
    };

    const handleBookmark = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(bookmarkPost(currentPost.id));
    };

    const handleReply = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(openReply(currentPost));
    };

    const handleViewPost = () => {
        onClose();
        navigate(`/profile/${currentPost.author.handle}/post/${currentPost.id}`);
    };

    const getMediaUrl = (url: string) => {
        if (url.startsWith('http')) return url;
        return `${API_BASE_URL.replace('/api', '')}${url}`;
    };

    const dateLocale = i18n.language === 'vi' ? vi : enUS;

    const CONTENT_CHAR_LIMIT = 280;
    const isContentLong = (currentPost.content?.length || 0) > CONTENT_CHAR_LIMIT;
    const displayContent = (isContentLong && !isContentExpanded)
        ? currentPost.content?.substring(0, CONTENT_CHAR_LIMIT) + '...'
        : currentPost.content;

    return (
        <div
            className="fixed inset-0 z-[100] bg-black lg:bg-black/95 flex flex-col lg:flex-row overflow-hidden"
            onClick={onClose}
        >
            {/* Header Controls */}
            <div className="absolute top-0 left-0 right-0 z-[110] flex items-center justify-between p-4 lg:bg-transparent bg-gradient-to-b from-black/60 to-transparent lg:from-transparent">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-white transition-all active:scale-95"
                        aria-label="Close"
                    >
                        <FiX size={26} />
                    </button>
                    {history.length > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleGoBack();
                            }}
                            className="p-2 hover:bg-white/10 rounded-full text-white transition-all active:scale-95 flex items-center gap-2 pr-4"
                        >
                            <FiChevronLeft size={24} />
                            <span className="text-sm font-bold hidden lg:inline">{t('common.go_back')}</span>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowOptionsMenu(true); }}
                        className="p-2 hover:bg-white/10 rounded-full text-white transition-all active:scale-95"
                    >
                        <FiMoreHorizontal size={24} />
                    </button>
                </div>
            </div>

            {/* Main Section - Media Viewer */}
            <div
                className="relative flex-1 flex flex-col items-center justify-center bg-black overflow-hidden"
                onClick={e => e.stopPropagation()}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Media Container */}
                <div className="w-full h-full flex items-center justify-center relative touch-none">
                    {/* Background Blur (Desktop only) */}
                    <div className="hidden lg:block absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                        {currentMedia?.type !== 'video' && (
                            <img
                                src={getMediaUrl(currentMedia?.url || '')}
                                alt=""
                                className="w-full h-full object-cover blur-3xl scale-125"
                            />
                        )}
                    </div>

                    <div className="relative z-10 w-full h-full flex items-center justify-center lg:p-12">
                        {currentMedia?.type === 'video' ? (
                            <video
                                src={getMediaUrl(currentMedia.url)}
                                className="max-w-full max-h-full object-contain"
                                controls
                                autoPlay={false}
                            />
                        ) : (
                            <img
                                src={getMediaUrl(currentMedia?.url || '')}
                                alt=""
                                className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-300 ease-out"
                                style={{ transform: 'translate3d(0,0,0)' }}
                            />
                        )}
                    </div>
                </div>

                {/* Navigation Arrows (Visible on Desktop) */}
                {(allMedia.length > 1 || currentPostIdx > 0 || currentPostIdx < mediaPosts.length - 1) && (
                    <>
                        <button
                            onClick={(e) => handlePrev(e)}
                            className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 rounded-full text-white transition-all z-[105] hover:scale-110 active:scale-95"
                        >
                            <FiChevronLeft size={28} />
                        </button>
                        <button
                            onClick={(e) => handleNext(e)}
                            className="hidden lg:flex absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 rounded-full text-white transition-all z-[105] hover:scale-110 active:scale-95"
                        >
                            <FiChevronRight size={28} />
                        </button>
                    </>
                )}

                {/* Mobile Bottom Engagement Bar - Enhanced with app style features */}
                <div className="lg:hidden absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-8 flex items-center justify-around border-t border-white/10">
                    <button
                        onClick={handleReply}
                        className="flex flex-col items-center gap-1 text-white/90 group"
                    >
                        <FiMessageCircle size={22} className="group-hover:text-primary-400" />
                        <span className="text-[11px] group-hover:text-primary-400">{currentPost.repliesCount || ''}</span>
                    </button>
                    <button
                        onClick={handleRepost}
                        disabled={actionLoading[currentPost.id]}
                        className={cn("flex flex-col items-center gap-1 transition-colors", currentPost.isReposted ? "text-green-500" : "text-white/90 hover:text-green-400")}
                    >
                        <FiRepeat size={22} className={currentPost.isReposted ? "fill-current" : ""} />
                        <span className="text-[11px]">{currentPost.repostsCount || ''}</span>
                    </button>
                    <button
                        onClick={handleLike}
                        disabled={actionLoading[currentPost.id]}
                        className={cn("flex flex-col items-center gap-1 transition-colors", currentPost.isLiked ? "text-red-500" : "text-white/90 hover:text-red-400")}
                    >
                        <FiHeart size={22} className={currentPost.isLiked ? "fill-current" : ""} />
                        <span className="text-[11px]">{currentPost.likesCount || ''}</span>
                    </button>
                    <div className="flex flex-col items-center gap-1 text-white/90">
                        <FiActivity size={22} />
                        <span className="text-[11px]">{currentPost.likesCount > 0 ? (currentPost.likesCount * 12).toLocaleString() : '89'}</span>
                    </div>
                    <button
                        onClick={handleBookmark}
                        disabled={actionLoading[currentPost.id]}
                        className={cn("flex flex-col items-center gap-1 transition-colors", currentPost.isBookmarked ? "text-primary-500" : "text-white/90 hover:text-primary-400")}
                    >
                        <FiBookmark size={22} className={currentPost.isBookmarked ? "fill-current" : ""} />
                    </button>
                </div>
            </div>

            {/* Right Section - Desktop Detail Panel */}
            <div
                className="hidden lg:flex w-[400px] flex-shrink-0 bg-white dark:bg-dark-bg flex-col h-full border-l border-gray-200 dark:border-dark-border"
                onClick={e => e.stopPropagation()}
            >
                {/* Scrollable Content Area */}
                <div className="flex-1 lg:overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {/* Author Info */}
                    <div className="p-4 border-b border-gray-100 dark:border-dark-border flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    onClose();
                                    navigate(`/profile/${currentPost!.author.handle}`);
                                }}
                                className="flex-shrink-0 cursor-pointer"
                            >
                                <Avatar
                                    src={currentPost.author.avatarUrl || currentPost.author.avatar}
                                    alt={currentPost.author.displayName}
                                    size="md"
                                />
                            </button>
                            <div className="flex-1 min-w-0">
                                <h3
                                    className="font-bold text-gray-900 dark:text-dark-text truncate cursor-pointer hover:underline"
                                    onClick={() => {
                                        onClose();
                                        navigate(`/profile/${currentPost!.author.handle}`);
                                    }}
                                >
                                    {currentPost.author.displayName}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                                    @{currentPost.author.handle}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 pb-2">
                        <RichText
                            content={displayContent || ''}
                            className="text-[17px] text-gray-900 dark:text-dark-text leading-relaxed whitespace-pre-wrap"
                        />
                        {isContentLong && (
                            <button
                                onClick={() => setIsContentExpanded(!isContentExpanded)}
                                className="text-primary-500 text-sm font-bold mt-2 hover:underline block"
                            >
                                {isContentExpanded ? t('common.show_less') : t('common.show_more')}
                            </button>
                        )}
                        <div className="mt-3 text-[14px] text-gray-500 dark:text-dark-text-secondary">
                            {formatDistanceToNow(new Date(currentPost.createdAt), { addSuffix: true, locale: dateLocale })}
                        </div>

                        {/* Alt Text for Current Media */}
                        {'altText' in currentMedia && currentMedia.altText && (
                            <div className="mt-4 p-3 bg-gray-50 dark:bg-dark-surface/30 rounded-xl border border-gray-100 dark:border-dark-border">
                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{t('post.alt_text')}</h4>
                                <p className="text-[14px] text-gray-700 dark:text-dark-text leading-snug italic">
                                    "{currentMedia.altText}"
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Engagement */}
                    <div className="mt-2 border-t border-gray-100 dark:border-dark-border">
                        <div className="px-4 py-3 flex gap-5 border-b border-gray-50 dark:border-dark-border/50">
                            <div className="text-[14px]">
                                <span className="font-bold text-gray-900 dark:text-dark-text">{currentPost.likesCount}</span>
                                <span className="ml-1 text-gray-500 dark:text-dark-text-secondary">{t('post.likes')}</span>
                            </div>
                            <div className="text-[14px]">
                                <span className="font-bold text-gray-900 dark:text-dark-text">{currentPost.repostsCount}</span>
                                <span className="ml-1 text-gray-500 dark:text-dark-text-secondary">{t('post.reposts')}</span>
                            </div>
                        </div>

                        <div className="px-2 py-1 flex items-center justify-around border-b border-gray-100 dark:border-dark-border">
                            <button onClick={handleReply} className="p-2.5 rounded-full text-gray-500 dark:text-dark-text-secondary hover:bg-primary-50 hover:text-primary-500 transition-colors">
                                <FiMessageCircle size={22} />
                            </button>
                            <button onClick={handleRepost} className={cn("p-2.5 rounded-full transition-colors", currentPost.isReposted ? "text-green-500" : "text-gray-500 hover:text-green-500")}>
                                <FiRepeat size={22} />
                            </button>
                            <button onClick={handleLike} className={cn("p-2.5 rounded-full transition-colors", currentPost.isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500")}>
                                <FiHeart size={22} className={currentPost.isLiked ? "fill-current" : ""} />
                            </button>
                            <button onClick={handleBookmark} className={cn("p-2.5 rounded-full transition-colors", currentPost.isBookmarked ? "text-primary-500" : "text-gray-500")}>
                                <FiBookmark size={22} className={currentPost.isBookmarked ? "fill-current" : ""} />
                            </button>
                        </div>
                    </div>

                    {/* Replies */}
                    <div className="bg-gray-50/50 dark:bg-dark-surface/10 pb-32">
                        {replies.length > 0 ? (
                            <div className="divide-y divide-gray-100 dark:divide-dark-border">
                                {replies.map(reply => (
                                    <div
                                        key={reply.id}
                                        className="p-4 hover:bg-white dark:hover:bg-dark-bg cursor-pointer transition-colors"
                                        onClick={() => handleNavigateToPost(reply)}
                                    >
                                        <div className="flex gap-3">
                                            <Avatar
                                                src={reply.author.avatarUrl || reply.author.avatar}
                                                alt={reply.author.displayName || 'User'}
                                                size="sm"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-1 text-[13px]">
                                                    <span className="font-bold text-gray-900 dark:text-dark-text truncate">
                                                        {reply.author.displayName}
                                                    </span>
                                                    <span className="text-gray-500 dark:text-dark-text-secondary truncate">
                                                        @{reply.author.handle}
                                                    </span>
                                                </div>
                                                <p className="text-[14px] text-gray-800 dark:text-gray-200 line-clamp-3 leading-relaxed">
                                                    {reply.content}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 px-4 text-center">
                                <p className="text-[14px] text-gray-500 dark:text-dark-text-secondary">{t('post.no_replies')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-bg mt-auto sticky bottom-0 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                    <button
                        onClick={handleViewPost}
                        className="w-full py-2.5 text-center text-primary-500 font-bold hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-full transition-all border border-primary-100 dark:border-primary-900/30 text-[15px]"
                    >
                        {t('post.view_full_post')}
                    </button>
                </div>
            </div>

            {/* Options Menu Bottom Sheet (Mobile) */}
            {showOptionsMenu && (
                <div
                    className="lg:hidden fixed inset-0 z-[120] bg-black/60 flex items-end animate-in fade-in duration-200"
                    onClick={() => setShowOptionsMenu(false)}
                >
                    <div
                        className="w-full bg-white dark:bg-dark-bg rounded-t-2xl p-4 animate-in slide-in-from-bottom duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-12 h-1.5 bg-gray-300 dark:bg-dark-border rounded-full mx-auto mb-6" />

                        <button
                            onClick={handleViewPost}
                            className="w-full text-left py-4 px-2 text-[17px] font-medium text-gray-900 dark:text-dark-text border-b border-gray-100 dark:border-dark-border"
                        >
                            {i18n.language === 'vi' ? 'Xem bài đăng' : 'View post'}
                        </button>

                        <button
                            onClick={() => setShowOptionsMenu(false)}
                            className="w-full py-4 mt-2 text-[17px] font-bold text-gray-900 dark:text-dark-text bg-gray-100 dark:bg-dark-surface rounded-full text-center"
                        >
                            {i18n.language === 'vi' ? 'Hủy' : 'Cancel'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaPostViewerModal;
