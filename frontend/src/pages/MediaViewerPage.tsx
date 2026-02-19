import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { useTranslation } from 'react-i18next';
import { FiX, FiChevronLeft, FiChevronRight, FiHeart, FiRepeat, FiMessageCircle, FiBookmark, FiMoreHorizontal, FiShare2 } from 'react-icons/fi';
import { toggleLike, repostPost, bookmarkPost, fetchPostById } from '../redux/slices/postsSlice';
import { openReply } from '../redux/slices/modalsSlice';
import { Post } from '../types';
import Avatar from '../components/common/Avatar';
import RichText from '../components/common/RichText';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { API_BASE_URL } from '../constants';
import { cn } from '../utils/classNames';
import { RootState } from '../redux/store';
import LoadingIndicator from '../components/common/LoadingIndicator';
import { usePostActions } from '../hooks/usePostActions';

/**
 * MediaViewerPage - Standalone immersive page for viewing post media.
 */
const MediaViewerPage: React.FC = () => {
    const { postId, index: indexParam } = useParams<{ handle: string, postId: string, index: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t, i18n } = useTranslation();
    const { openShareModal } = usePostActions();

    const [currentIndex, setCurrentIndex] = useState(parseInt(indexParam || '0', 10));
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);

    // Swipe state
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const minSwipeDistance = 50;

    const allPosts = useAppSelector((state: RootState) => state.posts.posts);
    const actionLoading = useAppSelector((state: RootState) => state.posts.actionLoading);
    const currentPost = useMemo(() => allPosts.find((p: Post) => p.id === postId), [allPosts, postId]);

    // Media posts for swiping across feed
    const mediaPosts = useMemo(() => allPosts.filter((p: Post) => (p.media && p.media.length > 0) || (p.imageUrls && p.imageUrls.length > 0) || p.videoUrl), [allPosts]);
    const currentPostIdx = useMemo(() => mediaPosts.findIndex((p: Post) => p.id === postId), [mediaPosts, postId]);

    useEffect(() => {
        if (indexParam) {
            setCurrentIndex(parseInt(indexParam, 10));
        }
    }, [indexParam]);

    useEffect(() => {
        if (postId && !currentPost) {
            dispatch(fetchPostById(postId));
        }
    }, [postId, currentPost, dispatch]);

    const getMediaUrl = useCallback((url: string) => {
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        const base = API_BASE_URL.replace(/\/api$/, '').replace(/\/$/, '');
        const path = url.startsWith('/') ? url : `/${url}`;
        return `${base}${path}`;
    }, []);

    const allMedia = useMemo(() => {
        if (!currentPost) return [];
        if (currentPost.media && currentPost.media.length > 0) {
            return currentPost.media;
        }
        return [
            ...(currentPost.imageUrls || []).map(url => ({ url, type: 'image' as const })),
            ...(currentPost.videoUrl ? [{ url: currentPost.videoUrl, type: 'video' as const }] : [])
        ];
    }, [currentPost]);

    const currentMedia = allMedia[currentIndex];

    if (!currentPost) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <LoadingIndicator />
            </div>
        );
    }

    // Navigation
    const handlePrevMedia = () => {
        if (currentIndex > 0) {
            navigate(`/profile/${currentPost.author.handle}/post/${currentPost.id}/media/${currentIndex - 1}`, { replace: true });
        } else if (currentPostIdx > 0) {
            const prevPost = mediaPosts[currentPostIdx - 1];
            const prevMediaCount = (prevPost.media?.length || prevPost.imageUrls?.length || 0) + (prevPost.videoUrl ? 1 : 0);
            navigate(`/profile/${prevPost.author.handle}/post/${prevPost.id}/media/${prevMediaCount - 1}`, { replace: true });
        }
    };

    const handleNextMedia = () => {
        if (currentIndex < allMedia.length - 1) {
            navigate(`/profile/${currentPost.author.handle}/post/${currentPost.id}/media/${currentIndex + 1}`, { replace: true });
        } else if (currentPostIdx < mediaPosts.length - 1) {
            const nextPost = mediaPosts[currentPostIdx + 1];
            navigate(`/profile/${nextPost.author.handle}/post/${nextPost.id}/media/0`, { replace: true });
        }
    };

    // Swipe handlers
    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };
    const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        if (Math.abs(distance) > minSwipeDistance) {
            if (distance > 0) handleNextMedia();
            else handlePrevMedia();
        }
    };

    // Features
    const handleLike = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        console.log('MediaViewerPage handleLike clicked for:', currentPost.id);
        dispatch(toggleLike(currentPost.id));
    };

    const handleRepost = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        console.log('MediaViewerPage handleRepost clicked for:', currentPost.id);
        dispatch(repostPost(currentPost.id));
    };

    const handleBookmark = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        console.log('MediaViewerPage handleBookmark clicked for:', currentPost.id);
        dispatch(bookmarkPost(currentPost.id));
    };

    const handleComment = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/profile/${currentPost.author.handle}/post/${currentPost.id}`, { replace: true });
        setTimeout(() => dispatch(openReply(currentPost)), 150);
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        openShareModal(currentPost);
    };

    const formatCount = (count: number) => {
        if (count >= 1000) {
            const unit = t('common.user').startsWith('N') ? 'N' : 'K';
            return `${(count / 1000).toFixed(1)}${unit}`;
        }
        return count > 0 ? count : '';
    };

    const dateLocale = i18n.language === 'vi' ? vi : enUS;

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col lg:flex-row overflow-hidden">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-[160] flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent lg:from-transparent">
                <button
                    onClick={() => navigate(-1)}
                    className="p-3 bg-black/20 hover:bg-white/10 rounded-full text-white transition-all active:scale-90"
                >
                    <FiX size={28} />
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); setShowOptionsMenu(true); }}
                    className="p-3 bg-black/20 hover:bg-white/10 rounded-full text-white transition-all active:scale-90"
                >
                    <FiMoreHorizontal size={28} />
                </button>
            </div>

            {/* Media/Swipe Area */}
            <div
                className="relative flex-1 flex flex-col items-center justify-center bg-black overflow-hidden"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <div className="w-full h-full flex items-center justify-center relative bg-black">
                    {/* PC Subtle Background Blur */}
                    <div className="hidden lg:block absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
                        {currentMedia?.type !== 'video' && (
                            <img src={getMediaUrl(currentMedia?.url || '')} alt="" className="w-full h-full object-cover blur-3xl scale-125" />
                        )}
                    </div>

                    <div className="relative z-10 w-full h-full flex items-center justify-center lg:p-12">
                        {currentMedia?.type === 'video' ? (
                            <video src={getMediaUrl(currentMedia.url)} className="max-w-full max-h-full object-contain" controls onClick={e => e.stopPropagation()} />
                        ) : (
                            <img src={getMediaUrl(currentMedia?.url || '')} alt={('altText' in currentMedia! ? currentMedia.altText : '') || ''} className="max-w-full max-h-full object-contain shadow-2xl transition-all duration-300" />
                        )}
                    </div>
                </div>

                {/* PC Arrows */}
                <button onClick={(e) => { e.stopPropagation(); handlePrevMedia(); }} className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-black/40 hover:bg-black/60 rounded-full text-white z-[110] transition-all hover:scale-110 active:scale-95">
                    <FiChevronLeft size={32} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleNextMedia(); }} className="hidden lg:flex absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-black/40 hover:bg-black/60 rounded-full text-white z-[110] transition-all hover:scale-110 active:scale-95">
                    <FiChevronRight size={32} />
                </button>

                {/* MOBILE Bar - Unified Icons, NO Views count as requested */}
                <div className="lg:hidden absolute bottom-0 left-0 right-0 z-[180] bg-gradient-to-t from-black to-transparent p-4 pb-12 flex items-center justify-around border-t border-white/5 backdrop-blur-sm pointer-events-auto shadow-2xl">
                    <button
                        onClick={handleComment}
                        className="flex flex-col items-center gap-1.5 text-white/95 active:scale-75 transition-all p-2 min-w-[60px]"
                    >
                        <FiMessageCircle size={26} />
                        <span className="text-[13px] font-bold">{formatCount(currentPost.repliesCount || 0)}</span>
                    </button>
                    <button
                        onClick={handleRepost}
                        disabled={actionLoading[currentPost.id]}
                        className={cn("flex flex-col items-center gap-1.5 transition-all active:scale-75 p-2 min-w-[60px]", currentPost.isReposted ? "text-green-500 scale-110" : "text-white/95")}
                    >
                        <FiRepeat size={26} className={currentPost.isReposted ? "stroke-[2.5px]" : ""} />
                        <span className="text-[13px] font-bold">{formatCount(currentPost.repostsCount)}</span>
                    </button>
                    <button
                        onClick={handleLike}
                        disabled={actionLoading[currentPost.id]}
                        className={cn("flex flex-col items-center gap-1.5 transition-all active:scale-75 p-2 min-w-[60px]", currentPost.isLiked ? "text-red-500 scale-110" : "text-white/95")}
                    >
                        <FiHeart size={26} className={currentPost.isLiked ? "fill-current" : ""} />
                        <span className="text-[13px] font-bold">{formatCount(currentPost.likesCount)}</span>
                    </button>
                    <button
                        onClick={handleBookmark}
                        disabled={actionLoading[currentPost.id]}
                        className={cn("flex flex-col items-center gap-1.5 transition-all active:scale-75 p-2 min-w-[60px]", currentPost.isBookmarked ? "text-blue-500 scale-110" : "text-white/95")}
                    >
                        <FiBookmark size={26} className={currentPost.isBookmarked ? "fill-current" : ""} />
                        <span className="text-[13px] font-bold">{formatCount(currentPost.bookmarksCount || 0)}</span>
                    </button>
                    <button
                        onClick={handleShare}
                        className="flex flex-col items-center gap-1.5 text-white/95 active:scale-75 transition-all p-2 min-w-[60px]"
                    >
                        <FiShare2 size={26} />
                    </button>
                </div>
            </div>

            {/* DESKTOP Info Panel */}
            <div className="hidden lg:flex w-[420px] flex-shrink-0 bg-white dark:bg-dark-bg flex-col h-full border-l border-gray-200 dark:border-dark-border shadow-2xl relative z-[130]">
                <div className="p-4 border-b border-gray-100 dark:border-dark-border flex items-center gap-3">
                    <Avatar src={currentPost.author.avatarUrl || currentPost.author.avatar} alt={currentPost.author.displayName} size="md" />
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-dark-text truncate hover:underline cursor-pointer">{currentPost.author.displayName}</h3>
                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">@{currentPost.author.handle}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-white dark:bg-dark-bg">
                    <RichText content={currentPost.content || ''} className="text-[18px] text-gray-900 dark:text-dark-text leading-relaxed whitespace-pre-wrap mb-4" />
                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-4">{formatDistanceToNow(new Date(currentPost.createdAt), { addSuffix: true, locale: dateLocale })}</p>

                    {/* Alt Text for Current Media */}
                    {'altText' in currentMedia && currentMedia.altText && (
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-dark-surface/30 rounded-xl border border-gray-100 dark:border-dark-border">
                            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">{t('post.alt_text')}</h4>
                            <p className="text-[15px] text-gray-700 dark:text-dark-text leading-snug italic">
                                "{currentMedia.altText}"
                            </p>
                        </div>
                    )}

                    {/* Unified Actions */}
                    <div className="py-6 border-y border-gray-100 dark:border-dark-border flex justify-around items-center">
                        <button onClick={handleComment} className="flex flex-col items-center gap-1.5 text-gray-500 hover:text-primary-500 transition-all group"><FiMessageCircle size={24} className="group-hover:scale-110" /><span className="text-xs font-bold">{currentPost.repliesCount}</span></button>
                        <button onClick={handleRepost} disabled={actionLoading[currentPost.id]} className={cn("flex flex-col items-center gap-1.5 transition-all group", currentPost.isReposted ? "text-green-500" : "text-gray-500 hover:text-green-500")}><FiRepeat size={24} className={cn("group-hover:scale-110", currentPost.isReposted ? "stroke-[2.5px]" : "")} /><span className="text-xs font-bold">{currentPost.repostsCount}</span></button>
                        <button onClick={handleLike} disabled={actionLoading[currentPost.id]} className={cn("flex flex-col items-center gap-1.5 transition-all group", currentPost.isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500")}><FiHeart size={24} className={cn("group-hover:scale-110", currentPost.isLiked ? "fill-current" : "")} /><span className="text-xs font-bold">{currentPost.likesCount}</span></button>
                        <button onClick={handleBookmark} disabled={actionLoading[currentPost.id]} className={cn("flex flex-col items-center gap-1.5 transition-all group", currentPost.isBookmarked ? "text-blue-500" : "text-gray-500 hover:text-blue-500")}><FiBookmark size={24} className={cn("group-hover:scale-110", currentPost.isBookmarked ? "fill-current" : "")} /><span className="text-xs font-bold">{currentPost.bookmarksCount || 0}</span></button>
                        <button onClick={handleShare} className="flex flex-col items-center gap-1.5 text-gray-500 hover:text-primary-500 transition-all group"><FiShare2 size={24} className="group-hover:scale-110" /></button>
                    </div>


                </div>

                <div className="p-4 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-surface/10">
                    <button onClick={() => navigate(`/profile/${currentPost.author.handle}/post/${currentPost.id}`)} className="w-full py-3.5 text-center text-primary-500 font-bold hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-full border border-primary-200 dark:border-primary-800 text-[16px]">
                        {t('post.view_full_post')}
                    </button>
                </div>
            </div>

            {/* Mobile Options */}
            {showOptionsMenu && (
                <div className="fixed inset-0 z-[200] bg-black/70 flex items-end animate-in fade-in duration-200" onClick={() => setShowOptionsMenu(false)}>
                    <div className="w-full bg-white dark:bg-dark-bg rounded-t-[32px] p-6 pb-12 animate-in slide-in-from-bottom duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-1.5 bg-gray-200 dark:bg-dark-border rounded-full mx-auto mb-10" />
                        <button onClick={() => { navigate(`/profile/${currentPost.author.handle}/post/${currentPost.id}`); setShowOptionsMenu(false); }} className="w-full text-left py-5 px-6 text-[19px] font-bold text-gray-900 dark:text-dark-text border-b border-gray-50 dark:border-dark-border">
                            {i18n.language === 'vi' ? 'Xem bài đăng' : 'View post'}
                        </button>
                        <button onClick={() => setShowOptionsMenu(false)} className="w-full py-5 mt-6 text-[19px] font-bold text-gray-700 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-surface rounded-full">
                            {i18n.language === 'vi' ? 'Hủy' : 'Cancel'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaViewerPage;
