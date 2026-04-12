import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Skeleton from '../common/Skeleton';
import { PostImage, PostVideo } from '../../types';
import { useAppSelector } from '../../redux/hooks';
import { RootState } from '../../redux/store';
import Hls from 'hls.js';

import { cn } from '../../utils/classNames';
import { API_BASE_URL } from '../../constants';

const resolveUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;

    // Clean base URL: remove trailing /api or just trailing slash
    const base = API_BASE_URL.replace(/\/api$/, '').replace(/\/$/, '');
    // Clean relative URL: ensure it starts with a single slash
    const path = url.startsWith('/') ? url : `/${url}`;

    return `${base}${path}`;
};

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

const GridItem: React.FC<GridItemProps> = ({ item, index, className, showOverlay, totalCount, onImageClick, isDetailView: isDetailViewProp }) => {
    const { t } = useTranslation();
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [imageError, setImageError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isVideoLoading, setIsVideoLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isTouched, setIsTouched] = useState(false);
    
    // Fallback for detail view detection if prop is missing but we're on a post page
    const isDetailView = isDetailViewProp || window.location.pathname.includes('/post/');
    
    const [isMuted, setIsMuted] = useState(!isDetailView);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Auto-hide touch controls after 3 seconds
    const touchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const showTouchControls = () => {
        setIsTouched(true);
        if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
        touchTimerRef.current = setTimeout(() => setIsTouched(false), 3000);
    };
    React.useEffect(() => () => { if (touchTimerRef.current) clearTimeout(touchTimerRef.current); }, []);

    const settings = useAppSelector((state: RootState) => state.auth.settings);
    const autoplayEnabled = settings?.autoplayVideoGif ?? true;
    // FIX 2: Keep a ref so HLS callbacks (closures) always see the latest value
    const autoplayEnabledRef = React.useRef(autoplayEnabled);
    React.useEffect(() => { autoplayEnabledRef.current = autoplayEnabled; }, [autoplayEnabled]);


    // Handle HLS playback and standard video source
    useEffect(() => {
        if (!item.isVideo || !videoRef.current) return;
        
        const video = videoRef.current;
        const rawUrl = item.url;
        const url = resolveUrl(rawUrl);
        let hlsInstance: any = null;

        console.log('[MediaGrid] UseEffect running', { isVideo: item.isVideo, url });

        if (url.toLowerCase().includes('.m3u8')) {
            if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS support (Safari, iOS)
                video.src = url;
                // FIX 2: use ref so this isn't stale
                if (autoplayEnabledRef.current && !isDetailView) {
                    video.play().catch(() => {});
                }
            } else if (Hls.isSupported()) {
                // Use imported hls.js package
                console.log('[MediaGrid] Setting up HLS.js for:', url);
                hlsInstance = new Hls({
                    enableWorker: true,
                    lowLatencyMode: false,
                });
                hlsInstance.on(Hls.Events.ERROR, (_event: any, data: any) => {
                    if (data.fatal) {
                        console.error('[MediaGrid] HLS fatal error:', data.type, data.details);
                        hlsInstance.destroy();
                    }
                });
                hlsInstance.attachMedia(video);
                hlsInstance.on(Hls.Events.MEDIA_ATTACHED, () => {
                    hlsInstance.loadSource(url);
                });
                hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                    console.log('[MediaGrid] HLS manifest parsed, ready to play');
                    // FIX 2: use ref so this reads the current setting, not a stale closure
                    if (autoplayEnabledRef.current && !isDetailView) {
                        video.play().catch(err => console.warn('[MediaGrid] Autoplay blocked:', err.name));
                    }
                });
            } else {
                console.warn('[MediaGrid] HLS is not supported, trying native src');
                video.src = url;
            }
        } else {
            video.src = url;
            // FIX 2: use ref so this isn't stale
            if (autoplayEnabledRef.current && !isDetailView) {
                video.play().catch(() => {});
            }
        }

        return () => {
            if (hlsInstance) {
                hlsInstance.destroy();
            }
        };
    }, [item.url, item.isVideo, autoplayEnabled]);

    useEffect(() => {
        if (!item.isVideo || !videoRef.current) return;

        // FIX 2: Always keep the IntersectionObserver active for pause-on-scroll-out.
        // Only call .play() when autoplay is enabled.
        if (!autoplayEnabled) {
            // Pause immediately if setting was just turned off
            videoRef.current.pause();
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    // Only autoplay when the setting is on
                    if (autoplayEnabledRef.current && videoRef.current?.paused) {
                        videoRef.current?.play().catch((err) => {
                            console.warn('Autoplay failed:', err);
                        });
                    }
                } else {
                    // Always pause when scrolled out of view
                    videoRef.current?.pause();
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(videoRef.current);
        return () => observer.disconnect();
    }, [item.isVideo, autoplayEnabled]);

    // Mouse/touch handlers are now managed via CSS group-hover and isTouched state

    const togglePlayPause = (e?: React.MouseEvent | React.TouchEvent) => {
        console.log('[MediaGrid] togglePlayPause called', { isPlaying, isVideoLoading });
        e?.stopPropagation();
        if (videoRef.current) {
            console.log('[MediaGrid] videoRef.current state:', { 
                paused: videoRef.current.paused, 
                readyState: videoRef.current.readyState,
                src: videoRef.current.src ? (videoRef.current.src.substring(0, 50) + '...') : 'empty'
            });
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            } else {
                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log('[MediaGrid] Playback started successfully');
                            setIsPlaying(true);
                            setIsVideoLoading(false);
                        })
                        .catch(error => {
                            console.error("[MediaGrid] Playback failed:", error);
                            // If it failed because it wasn't muted, mute it and try again
                            if (error.name === 'NotAllowedError') {
                                console.log('[MediaGrid] Attempting muted playback recovery...');
                                videoRef.current!.muted = true;
                                setIsMuted(true);
                                videoRef.current!.play().catch(e => console.error("[MediaGrid] Final playback attempt failed:", e));
                            }
                        });
                }
            }
        } else {
            console.error('[MediaGrid] videoRef.current is null!');
        }
    };

    const toggleMute = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
        }
    };

    const toggleFullscreen = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const video = videoRef.current;
        if (!video) return;

        try {
            // iOS Safari/Chrome: fullscreen is only possible via webkitEnterFullscreen.
            // playsInline (set on the <video> element) blocks webkitEnterFullscreen —
            // FIX 3: temporarily remove it, enter fullscreen, then restore on exit.
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

            if (isIOS && (video as any).webkitEnterFullscreen) {
                // Remove playsInline so webkitEnterFullscreen is allowed
                video.removeAttribute('playsinline');
                video.removeAttribute('webkit-playsinline');

                // Restore playsInline when the user exits fullscreen
                const restorePlaysinline = () => {
                    video.setAttribute('playsinline', '');
                    video.setAttribute('webkit-playsinline', '');
                    video.removeEventListener('webkitendfullscreen', restorePlaysinline);
                };
                video.addEventListener('webkitendfullscreen', restorePlaysinline);

                (video as any).webkitEnterFullscreen();
                return;
            }

            // Standard Fullscreen API (Android Chrome, desktop)
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else if (video.requestFullscreen) {
                video.requestFullscreen();
            } else if ((video as any).webkitRequestFullscreen) {
                (video as any).webkitRequestFullscreen();
            } else if ((video as any).msRequestFullscreen) {
                (video as any).msRequestFullscreen();
            }
        } catch (err) {
            console.warn('[MediaGrid] Fullscreen request failed:', err);
        }
    };

    const formatTime = (timeInSeconds: number) => {
        if (isNaN(timeInSeconds)) return "0:00";
        const m = Math.floor(timeInSeconds / 60);
        const s = Math.floor(timeInSeconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
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
                'relative cursor-pointer overflow-hidden bg-gray-100 dark:bg-dark-surface group',
                className
            )}
            onClick={(e) => {
                // FIX 1: Always stop propagation for videos so PostCard navigation never fires
                e.stopPropagation();
                if (!item.isVideo) {
                    onImageClick?.(index);
                }
            }}
            onTouchStart={(e) => {
                if (item.isVideo) {
                    // FIX 1: Show touch controls in BOTH feed and detail view on mobile
                    e.stopPropagation();
                    showTouchControls();
                }
            }}
        >
            {item.isVideo ? (
                <div className="w-full h-full relative group/video">
                    <video
                        ref={videoRef}
                        poster={item.thumbnail}
                        className={cn(
                            "w-full h-full",
                            isDetailView ? "object-contain bg-black" : "object-contain bg-black/5 dark:bg-white/5"
                        )}
                        muted={isMuted}
                        playsInline
                        autoPlay={false} // Managed by effects for reliability
                        loop={!isDetailView}
                        onLoadStart={() => setIsVideoLoading(true)}
                        onLoadedMetadata={() => {
                            if (videoRef.current) {
                                setDuration(videoRef.current.duration);
                                // If autoplay is enabled and it's muted, try to play immediately
                                if (autoplayEnabled && videoRef.current.muted) {
                                    videoRef.current.play().catch(() => {});
                                }
                            }
                        }}
                        onCanPlay={() => setIsVideoLoading(false)}
                        onCanPlayThrough={() => setIsVideoLoading(false)}
                        onTimeUpdate={() => {
                            if (videoRef.current) {
                                setCurrentTime(videoRef.current.currentTime);
                                setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
                                if (isVideoLoading && videoRef.current.currentTime > 0) {
                                    setIsVideoLoading(false);
                                }
                            }
                        }}
                        onLoadedData={() => setIsVideoLoading(false)}
                        onWaiting={() => setIsVideoLoading(true)}
                        onPlaying={() => {
                            setIsPlaying(true);
                            setIsVideoLoading(false);
                        }}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => {
                            setIsPlaying(false);
                            setIsVideoLoading(false);
                        }}
                        onStalled={() => {
                            // Don't show spinner immediately on stall if we have enough buffer
                            if (videoRef.current && videoRef.current.readyState < 3) {
                                setIsVideoLoading(true);
                            }
                        }}
                        onSeeked={() => setIsVideoLoading(false)}
                        onSeeking={() => setIsVideoLoading(true)}
                        onError={(e) => {
                            console.error('Video load error');
                            setIsVideoLoading(false);
                        }}
                    />

                    {/* Central Play/Pause Toggle overlay — always show when paused, appears on hover/touch when playing */}
                    <div 
                        className={cn(
                            "absolute inset-0 flex items-center justify-center transition-opacity duration-200 z-10",
                            // FIX 1: In feed, show overlay when paused OR when touched (so mobile can see play btn)
                            // Hide overlay only when actively playing AND not recently touched
                            (isPlaying && !isTouched && !isVideoLoading) ? "opacity-0 invisible pointer-events-none" : "opacity-100 visible pointer-events-auto"
                        )}
                        onClick={(e) => {
                            // Only toggle if we're not clicking the button itself (which has its own handler)
                            // or if click reached this overlay.
                            e.stopPropagation();
                            togglePlayPause();
                        }}
                    >
                                                {isVideoLoading ? (
                            <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center text-white backdrop-blur-md pointer-events-none">
                                <svg className="animate-spin w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                        ) : (
                            <button 
                                className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center text-white backdrop-blur-md hover:scale-105 transition-transform pointer-events-auto shadow-xl" 
                                onClick={(e) => { 
                                    e.stopPropagation(); // Prevent bubbling to overlay div which would double-fire
                                    togglePlayPause(); 
                                }}
                                aria-label={isPlaying ? 'Pause video' : 'Play video'}
                            >
                                {isPlaying ? (
                                    <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                                        <rect x="6" y="4" width="4" height="16" />
                                        <rect x="14" y="4" width="4" height="16" />
                                    </svg>
                                ) : (
                                    <svg className="w-8 h-8 fill-current ml-1" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Bottom Custom Controls (only in detail view) — always visible for consistent cross-device UX */}
                    {isDetailView && (
                        <div 
                            data-testid="antigravity-video-controls"
                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-30 pointer-events-auto px-2 pb-1.5 pt-8">
                            {/* Controls Bar */}
                            <div className="flex flex-col w-full">
                                {/* Top row: Progress Bar */}
                                <div 
                                    className="w-full h-[3px] mb-2 px-1 relative cursor-pointer group/progress" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!videoRef.current || !duration) return;
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = e.clientX - rect.left;
                                        const percent = x / rect.width;
                                        videoRef.current.currentTime = percent * duration;
                                    }}
                                >
                                    <div className="h-full bg-white/30 rounded-full overflow-hidden">
                                        <div className="h-full bg-white relative transition-all duration-100" style={{ width: `${progress}%` }}>
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover/progress:scale-100 transition-transform z-10" />
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom row: Buttons and Timestamp */}
                                <div className="flex items-center justify-between px-1">
                                    {/* Left: Play/Pause */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); togglePlayPause(); }} 
                                        className="text-white hover:opacity-80 transition-opacity p-1.5" 
                                        title={isPlaying ? 'Pause' : 'Play'}
                                    >
                                        {isPlaying ? (
                                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                                <rect x="6" y="4" width="4" height="16" rx="1" />
                                                <rect x="14" y="4" width="4" height="16" rx="1" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        )}
                                    </button>

                                    {/* Right: Timestamp, Mute, Fullscreen */}
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-white text-[13px] font-medium tabular-nums select-none tracking-tight opacity-95 mr-1">
                                            {formatTime(currentTime)} / {formatTime(duration)}
                                        </span>

                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleMute(e); }} 
                                            className="text-white hover:opacity-80 transition-opacity p-1.5" 
                                            title={isMuted ? 'Unmute' : 'Mute'}
                                        >
                                            {isMuted ? (
                                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                                                </svg>
                                            )}
                                        </button>

                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleFullscreen(e); }} 
                                            className="text-white hover:opacity-80 transition-opacity p-1.5" 
                                            title="Fullscreen"
                                        >
                                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <img
                    src={item.url}
                    alt={item.alt || ''}
                    className={cn(
                        "w-full h-full hover:opacity-90 transition-opacity",
                        totalCount === 1 ? (isDetailView ? "object-contain bg-black" : "object-contain bg-black/10 dark:bg-white/5") : "object-cover",
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
            {item.isVideo && !isDetailView && (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/70 rounded text-white text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm z-10">{t('nav.video', { defaultValue: 'Video' })}</div>
            )}
        </div>
    );
};

const useWindowSize = () => {
    const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    useEffect(() => {
        const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return size;
};

const MediaGrid: React.FC<MediaGridProps> = ({ images = [], imageUrls = [], media = [], video, videoUrl, onImageClick, isDetailView = false }) => {
    const { width: windowWidth, height: windowHeight } = useWindowSize();
    const isLandscape = windowWidth > windowHeight;
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [videoNativeRatio, setVideoNativeRatio] = useState<number | null>(null);


    // Route images/videos through resize or use pre-generated thumbnails
    const getOptimizedUrl = (originalRelativePath: string, resolvedUrl: string, isVideo: boolean, thumbnailUrl?: string) => {
        if (isDetailView) return resolvedUrl;
        
        // [FIX] For videos, always use the resolved stream URL, never the thumbnail for the 'src'
        if (isVideo) return resolvedUrl;

        // If we have a pre-generated thumbnail from the backend, use it for images
        if (thumbnailUrl) return resolveUrl(thumbnailUrl);

        // Only optimize local uploads for images
        if (!originalRelativePath.includes('/uploads/')) return resolvedUrl;
        const base = API_BASE_URL.replace(/\/$/, '');
        const path = originalRelativePath.startsWith('/') ? originalRelativePath : `/${originalRelativePath}`;
        return `${base}/media/resize?path=${encodeURIComponent(path)}&w=600&q=80`;
    };

    const isVideoUrl = (url: string) => {
        if (!url) return false;
        const videoExtensions = ['.mp4', '.mov', '.webm', '.ogg', '.m4v', '.m3u8'];
        const urlWithoutQuery = url.split('?')[0].toLowerCase();
        return videoExtensions.some(ext => urlWithoutQuery.endsWith(ext)) || urlWithoutQuery.includes('/playlist/');
    };

    // Extract CID/Blob Id from Bluesky CDN URLs for robust deduplication
    const extractCid = (url: string) => {
        if (!url) return null;
        // Match standard format: plain/did:plc:.../bafk...
        // Matches the 59-char CID (bafk...)
        const match = url.match(/bafk[a-z0-9]{55,}/i);
        return match ? match[0].toLowerCase() : null;
    };

    // Memoize mediaList to prevent recreation on every render
    const mediaList: MediaItem[] = React.useMemo(() => {
        const list: MediaItem[] = [];
        const addedUrls = new Set<string>();
        const videoThumbnails = new Set<string>();
        const videoCids = new Set<string>();

        // Phase 1: Identify all video thumbnails and CIDs across all props
        const processItemForPhase1 = (item: any, isExplicitVideo: boolean = false) => {
            const resolved = resolveUrl(item.url || item);
            const isVideo = isExplicitVideo || isVideoUrl(resolved);
            const cid = extractCid(resolved);
            
            if (isVideo) {
                if (cid) videoCids.add(cid);
                const thumb = item.thumbnailUrl || (typeof item === 'object' ? item.thumbnail : null);
                if (thumb) {
                    const resolvedThumb = resolveUrl(thumb);
                    videoThumbnails.add(resolvedThumb);
                    const thumbCid = extractCid(resolvedThumb);
                    if (thumbCid) videoCids.add(thumbCid);
                }
            }
        };

        if (media && media.length > 0) {
            media.forEach(m => processItemForPhase1(m, m.type === 'video'));
        }
        if (video) processItemForPhase1(video, true);
        if (videoUrl) processItemForPhase1(videoUrl, true);

        // Phase 2: Build prioritized list
        // Priority 1: Media array
        if (media && media.length > 0) {
            media.forEach(m => {
                const url = resolveUrl(m.url);
                const cid = extractCid(url);
                const isVideo = m.type === 'video' || isVideoUrl(url);

                // Skip if this image is already identified as a video thumbnail or shares CID with a video
                if (m.type === 'image' && (videoThumbnails.has(url) || (cid && videoCids.has(cid)))) return;
                
                if (!addedUrls.has(url)) {
                    const optimized = getOptimizedUrl(m.url, url, isVideo, m.thumbnailUrl);
                    list.push({ 
                        url: optimized, 
                        alt: m.altText, 
                        isVideo, 
                        thumbnail: m.thumbnailUrl ? resolveUrl(m.thumbnailUrl) : undefined 
                    });
                    addedUrls.add(url);
                }
            });
            return list;
        } 

        // Priority 2: Video object or videoUrl
        if (video) {
            const url = resolveUrl(video.url);
            const thumbUrl = video.thumbnail ? resolveUrl(video.thumbnail) : undefined;
            if (!addedUrls.has(url)) {
                list.push({ url, isVideo: true, thumbnail: thumbUrl, alt: video.alt });
                addedUrls.add(url);
                const cid = extractCid(url);
                if (cid) addedUrls.add(cid); // Also prevent CID-duplicates from images prop
            }
        } else if (videoUrl) {
            const url = resolveUrl(videoUrl);
            if (!addedUrls.has(url)) {
                list.push({ url, isVideo: true });
                addedUrls.add(url);
                const cid = extractCid(url);
                if (cid) addedUrls.add(cid);
            }
        }

        // Priority 3: Images array
        if (images && images.length > 0) {
            images.forEach(img => {
                const resolved = resolveUrl(img.url);
                const cid = extractCid(resolved);
                if (videoThumbnails.has(resolved) || (cid && (videoCids.has(cid) || addedUrls.has(cid)))) return;
                
                if (!addedUrls.has(resolved)) {
                    const isActuallyVideo = isVideoUrl(resolved);
                    const optimized = getOptimizedUrl(img.url, resolved, isActuallyVideo);
                    list.push({ url: optimized, alt: img.alt, isVideo: isActuallyVideo });
                    addedUrls.add(resolved);
                }
            });
        }
        // Priority 4: imageUrls 
        else if (imageUrls && imageUrls.length > 0) {
            imageUrls.forEach(rawUrl => {
                const resolved = resolveUrl(rawUrl);
                const cid = extractCid(resolved);
                if (videoThumbnails.has(resolved) || (cid && (videoCids.has(cid) || addedUrls.has(cid)))) return;
                
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
                const w = vid.videoWidth || 16;
                const h = vid.videoHeight || 9;
                setOrientation(w >= h ? 'landscape' : 'portrait');
                setVideoNativeRatio(w / h);
            };
            vid.onerror = () => {
                setOrientation('landscape');
                setVideoNativeRatio(16 / 9);
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
        const isVideo = mediaList[0].isVideo;
        // Use the video's real aspect ratio. Fall back to 16:9 while metadata loads.
        const ratio = isVideo ? (videoNativeRatio ?? 16 / 9) : null;

        // Key: set BOTH maxHeight AND maxWidth = maxHeight * ratio.
        // When height cap activates (portrait video), width shrinks proportionally too —
        // keeping the real aspect ratio without distortion or black bars.
        // Stabilize feedMaxH
        const feedMaxH = isLandscape ? Math.min(windowHeight * 0.75, 600) : Math.min(windowHeight * 0.6, 500);
        const isPortraitVideo = ratio && ratio < 1;

        const videoContainerStyle: React.CSSProperties = isVideo && ratio
            ? isDetailView
                ? {
                    maxHeight: isPortraitVideo ? 'min(75dvh, 650px)' : 'min(85dvh, 800px)',
                    width: '100%',
                    aspectRatio: isPortraitVideo ? '4/3' : '16/9', // Standard container ratios for letterboxing in detail view
                    margin: '0 auto',
                  }
                : {
                    aspectRatio: String(ratio),
                    maxHeight: `${feedMaxH}px`,
                    maxWidth: isPortraitVideo ? 'min(80%, 420px)' : '100%',
                    width: '100%',
                    margin: '0 auto',
                  }
            : {};

        const imageContainerClass = !isVideo
            ? (orientation === 'portrait'
                ? (isDetailView ? "max-h-[min(75dvh,650px)] w-full aspect-[4/3] mx-auto" : "aspect-auto max-h-[550px] max-w-[420px] mx-auto")
                : (isDetailView ? "max-h-[min(85dvh,800px)] w-full aspect-[16/9]" : "max-h-[550px] w-full"))
            : '';

        return (
            <div
                className={cn(
                    "rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border bg-black/5 dark:bg-white/5 mx-auto",
                    !isVideo && imageContainerClass,
                    isVideo && "bg-black"
                )}
                style={isVideo ? videoContainerStyle : undefined}
            >
                <GridItem
                    item={mediaList[0]}
                    index={0}
                    className={cn(
                        "w-full h-full min-h-[150px]",
                        !isVideo && orientation === 'portrait' ? "object-contain" : ""
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
            <div className="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden border border-gray-100 dark:border-dark-border aspect-[2/1]">
                {mediaList.slice(0, 2).map((item, i) => (
                    <GridItem key={i} item={item} index={i} className="h-full" totalCount={count} onImageClick={onImageClick} isDetailView={isDetailView} />
                ))}
            </div>
        );
    }

    if (count === 3) {
        return (
            <div className={cn(
                "grid gap-1 rounded-2xl overflow-hidden border border-gray-100 dark:border-dark-border",
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
