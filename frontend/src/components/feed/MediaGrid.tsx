import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Skeleton from '../common/Skeleton';
import { PostImage, PostVideo } from '../../types';
import { useAppSelector } from '../../redux/hooks';
import { RootState } from '../../redux/store';

import { cn } from '../../utils/classNames';
import { API_BASE_URL } from '../../constants';

interface MediaGridProps {
    images?: PostImage[];
    imageUrls?: string[]; // From backend
    media?: { url: string; altText?: string; type?: string; thumbnailUrl?: string }[]; // New backend media
    video?: PostVideo | null;
    videoUrl?: string; // From backend
    onImageClick?: (index: number) => void;
    isDetailView?: boolean;
}

interface MediaItem {
    url: string;
    alt?: string;
    isVideo: boolean;
    thumbnail?: string;
}

interface GridItemProps {
    item: MediaItem;
    index: number;
    className?: string;
    showOverlay?: boolean;
    totalCount: number;
    onImageClick?: (index: number) => void;
    isDetailView?: boolean;
}

const GridItem: React.FC<GridItemProps> = ({ item, index, className, showOverlay, totalCount, onImageClick, isDetailView }) => {
    const { t } = useTranslation();
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [imageError, setImageError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isVideoLoading, setIsVideoLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);

    const settings = useAppSelector((state: RootState) => state.auth.settings);
    const autoplayEnabled = settings?.autoplayVideoGif ?? true;

    useEffect(() => {
        if (!item.isVideo || !videoRef.current || !autoplayEnabled) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    videoRef.current?.play().catch(() => { });
                } else {
                    videoRef.current?.pause();
                    videoRef.current!.currentTime = 0;
                }
            },
            { threshold: 0.5 } // Play when at least 50% visible
        );

        observer.observe(videoRef.current);
        return () => observer.disconnect();
    }, [item.isVideo, autoplayEnabled]);

    const handleMouseEnter = () => {
        // Already handled by observer, but could be used for unmute or something in future
    };

    const handleMouseLeave = () => {
        // Already handled by observer
    };

    // Reset error state when URL changes
    useEffect(() => {
        setImageError(false);
        setIsPlaying(false);
    }, [item.url]);

    if (imageError && !item.isVideo) {
        return (
            <div
                className={cn('flex items-center justify-center bg-gray-100 dark:bg-dark-hover aspect-square', className)}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-gray-400 text-xs font-medium text-center p-4">
                    {t('common.image_not_found', 'Image error')}
                </div>
            </div>
        );
    }

    if (!item.url) {
        return (
            <div
                className={cn('flex items-center justify-center bg-gray-100 dark:bg-dark-hover aspect-square', className)}
            >
                <div className="text-gray-400 text-[10px] text-center p-2 uppercase">
                    {t('common.media_missing', 'Media missing')}
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'relative cursor-pointer overflow-hidden bg-gray-100 dark:bg-dark-surface',
                className
            )}
            onClick={(e) => {
                e.stopPropagation();
                onImageClick?.(index);
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {item.isVideo ? (
                <div className="w-full h-full relative group/video">
                    <video
                        ref={videoRef}
                        src={item.url}
                        poster={item.thumbnail}
                        className={cn(
                            "w-full h-full",
                            isDetailView ? "object-contain bg-black/10 dark:bg-white/5" : "object-cover"
                        )}
                        muted={!isDetailView}
                        playsInline
                        loop
                        onLoadStart={() => setIsVideoLoading(true)}
                        onCanPlay={() => setIsVideoLoading(false)}
                        onWaiting={() => setIsVideoLoading(true)}
                        onPlaying={() => {
                            setIsPlaying(true);
                            setIsVideoLoading(false);
                        }}
                        onPause={() => setIsPlaying(false)}
                        onError={(e) => {
                            // On video error, we'll just show a generic indicator or nothing
                            console.error('Video load error:', item.url);
                            setIsVideoLoading(false);
                        }}
                    />
                    <div className={cn(
                        "absolute inset-0 bg-black/10 transition-colors flex items-center justify-center",
                        isPlaying ? "opacity-0" : "group-hover/video:bg-transparent"
                    )}>
                        {isVideoLoading ? (
                            <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-white">
                                <svg className="animate-spin w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                        ) : (
                            <div className={cn(
                                "w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-white transition-opacity",
                                isPlaying ? "opacity-0" : "opacity-80 group-hover/video:opacity-0"
                            )}>
                                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <img
                    src={item.url}
                    alt={item.alt || ''}
                    className={cn(
                        "w-full h-full hover:opacity-90 transition-opacity",
                        totalCount === 1 ? "object-contain bg-black/10 dark:bg-white/5" : "object-cover",
                        isLoading ? "opacity-0" : "opacity-100"
                    )}
                    loading="lazy"
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setImageError(true);
                        setIsLoading(false);
                    }}
                />
            )}
            {isLoading && !item.isVideo && (
                <div className="absolute inset-0 pointer-events-none">
                    <Skeleton variant="rectangular" width="100%" height="100%" />
                </div>
            )}
            {item.alt && (
                <div className={cn(
                    "absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/60 text-white rounded font-bold",
                    settings?.largerAltBadge ? "text-xs px-2 py-1" : "text-[10px]"
                )}>
                    ALT
                </div>
            )}
            {showOverlay && totalCount > (index + 1) && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-2xl backdrop-blur-[2px]">
                    +{totalCount - (index + 1)}
                </div>
            )}
            {item.isVideo && (
                <div className="absolute top-2 right-2 p-1 bg-black/50 rounded text-white text-[10px] font-bold uppercase">{t('nav.video')}</div>
            )}
        </div>
    );
};

const MediaGrid: React.FC<MediaGridProps> = ({ images = [], imageUrls = [], media = [], video, videoUrl, onImageClick, isDetailView = false }) => {
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');

    const resolveUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('data:')) return url;

        // Clean base URL: remove trailing /api or just trailing slash
        const base = API_BASE_URL.replace(/\/api$/, '').replace(/\/$/, '');
        // Clean relative URL: ensure it starts with a single slash
        const path = url.startsWith('/') ? url : `/${url}`;

        return `${base}${path}`;
    };

    // Route images/videos through resize or use pre-generated thumbnails
    const getOptimizedUrl = (originalRelativePath: string, resolvedUrl: string, isVideo: boolean, thumbnailUrl?: string) => {
        if (isDetailView) return resolvedUrl;
        
        // If we have a pre-generated thumbnail from the backend, use it!
        if (thumbnailUrl) return resolveUrl(thumbnailUrl);

        if (isVideo) return resolvedUrl;
        // Only optimize local uploads
        if (!originalRelativePath.includes('/uploads/')) return resolvedUrl;
        const base = API_BASE_URL.replace(/\/$/, '');
        const path = originalRelativePath.startsWith('/') ? originalRelativePath : `/${originalRelativePath}`;
        return `${base}/media/resize?path=${encodeURIComponent(path)}&w=600&q=80`;
    };

    const isVideoUrl = (url: string) => {
        if (!url) return false;
        const videoExtensions = ['.mp4', '.mov', '.webm', '.ogg', '.m4v'];
        const urlWithoutQuery = url.split('?')[0].toLowerCase();
        return videoExtensions.some(ext => urlWithoutQuery.endsWith(ext));
    };

    // Memoize mediaList to prevent recreation on every render
    const mediaList: MediaItem[] = React.useMemo(() => {
        const list: MediaItem[] = [];
        const addedUrls = new Set<string>();

        // Priority 1: Media array (richest source, includes alt text and potentially video)
        if (media && media.length > 0) {
            media.forEach(m => {
                const url = resolveUrl(m.url);
                if (!addedUrls.has(url)) {
                    const isVideo = m.type === 'video' || isVideoUrl(url);
                    const optimized = getOptimizedUrl(m.url, url, isVideo, m.thumbnailUrl);
                    list.push({ url: optimized, alt: m.altText, isVideo, thumbnail: m.thumbnailUrl ? resolveUrl(m.thumbnailUrl) : undefined });
                    addedUrls.add(url);
                }
            });
            // If we have media, we usually don't want to mix it with fallbacks to avoid duplication
            return list;
        } 

        // Priority 2: Video object (specific video embed)
        if (video) {
            const url = resolveUrl(video.url);
            const thumbUrl = video.thumbnail ? resolveUrl(video.thumbnail) : undefined;
            if (!addedUrls.has(url)) {
                list.push({ url, isVideo: true, thumbnail: thumbUrl, alt: video.alt });
                addedUrls.add(url);
            }
        } else if (videoUrl) {
            const url = resolveUrl(videoUrl);
            if (!addedUrls.has(url)) {
                list.push({ url, isVideo: true });
                addedUrls.add(url);
            }
        }

        // Priority 3: Images array (mapped from AT Protocol embed)
        if (images && images.length > 0) {
            images.forEach(img => {
                const resolved = resolveUrl(img.url);
                if (!addedUrls.has(resolved)) {
                    const isActuallyVideo = isVideoUrl(resolved);
                    const optimized = getOptimizedUrl(img.url, resolved, isActuallyVideo);
                    list.push({ url: optimized, alt: img.alt, isVideo: isActuallyVideo });
                    addedUrls.add(resolved);
                }
            });
        }
        // Priority 4: imageUrls (oldest backend format)
        else if (imageUrls && imageUrls.length > 0) {
            imageUrls.forEach(rawUrl => {
                const resolved = resolveUrl(rawUrl);
                if (!addedUrls.has(resolved)) {
                    const isActuallyVideo = isVideoUrl(resolved);
                    const optimized = getOptimizedUrl(rawUrl, resolved, isActuallyVideo);
                    list.push({ url: optimized, isVideo: isActuallyVideo });
                    addedUrls.add(resolved);
                }
            });
        }

        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [media, video, videoUrl, images, imageUrls, isDetailView]);

    const firstMedia = mediaList[0];
    // Use the URL string as dependency instead of the object to avoid infinite loops
    const firstMediaUrl = firstMedia?.url;
    const firstMediaIsVideo = firstMedia?.isVideo;

    useEffect(() => {
        if (!firstMediaUrl) {
            setOrientation('landscape'); // Default
            return;
        }

        if (firstMediaIsVideo) {
            const vid = document.createElement('video');
            vid.src = firstMediaUrl;
            vid.onloadedmetadata = () => {
                setOrientation(vid.videoWidth >= vid.videoHeight ? 'landscape' : 'portrait');
            };
            vid.onerror = () => {
                setOrientation('landscape');
            };
            return () => {
                vid.onloadedmetadata = null;
                vid.onerror = null;
                vid.src = '';
            };
        } else {
            const img = new Image();
            img.src = firstMediaUrl;
            img.onload = () => {
                setOrientation(img.width >= img.height ? 'landscape' : 'portrait');
            };
            img.onerror = () => {
                setOrientation('landscape');
            };
            return () => {
                img.onload = null;
                img.onerror = null;
                img.src = '';
            };
        }
    }, [firstMediaUrl, firstMediaIsVideo]);

    if (mediaList.length === 0) return null;

    const count = mediaList.length;


    if (count === 1) {
        // Feed view: Zoom to center for portrait videos to avoid tall black bars
        // Detail view: Show entire video with proper sizing
        return (
            <div className={cn(
                "rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border bg-black/[0.03] dark:bg-white/[0.03] flex justify-center w-full",
                orientation === 'portrait'
                    ? (isDetailView ? "max-h-[650px] w-fit mx-auto" : "aspect-[4/5] max-h-[512px] max-w-[450px] mx-auto")
                    : "max-h-[512px]"
            )}>
                <GridItem
                    item={mediaList[0]}
                    index={0}
                    className={cn(
                        "w-full h-full min-h-[150px]",
                        orientation === 'portrait' && !isDetailView ? "h-full w-full" : "aspect-auto"
                    )}
                    totalCount={count}
                    onImageClick={onImageClick}
                    isDetailView={isDetailView}
                />
            </div>
        );
    }

    if (count === 2) {
        return (
            <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border aspect-[2/1]">
                {mediaList.slice(0, 2).map((item, i) => (
                    <GridItem key={i} item={item} index={i} className="h-full" totalCount={count} onImageClick={onImageClick} isDetailView={isDetailView} />
                ))}
            </div>
        );
    }

    if (count === 3) {
        return (
            <div className={cn(
                "grid gap-1 rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border",
                orientation === 'landscape' ? "grid-cols-2" : "grid-cols-2 aspect-square"
            )}>
                {orientation === 'landscape' ? (
                    <>
                        <GridItem item={mediaList[0]} index={0} className="col-span-2 aspect-[3/2]" totalCount={count} onImageClick={onImageClick} isDetailView={isDetailView} />
                        <GridItem item={mediaList[1]} index={1} className="aspect-square" totalCount={count} onImageClick={onImageClick} isDetailView={isDetailView} />
                        <GridItem item={mediaList[2]} index={2} className="aspect-square" totalCount={count} onImageClick={onImageClick} isDetailView={isDetailView} />
                    </>
                ) : (
                    <>
                        <GridItem item={mediaList[0]} index={0} className="row-span-2 h-full" totalCount={count} onImageClick={onImageClick} isDetailView={isDetailView} />
                        <GridItem item={mediaList[1]} index={1} className="aspect-square" totalCount={count} onImageClick={onImageClick} isDetailView={isDetailView} />
                        <GridItem item={mediaList[2]} index={2} className="aspect-square" totalCount={count} onImageClick={onImageClick} isDetailView={isDetailView} />
                    </>
                )}
            </div>
        );
    }

    // 4 or more
    if (count >= 4) {
        return (
            <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border aspect-square">
                {mediaList.slice(0, 4).map((item, i) => (
                    <GridItem 
                        key={i} 
                        item={item} 
                        index={i} 
                        className="h-full" 
                        totalCount={count} 
                        showOverlay={i === 3} // Only 4th item shows +X
                        onImageClick={onImageClick} 
                        isDetailView={isDetailView} 
                    />
                ))}
            </div>
        );
    }

    return null;
};

export default MediaGrid;
