import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PostImage, PostVideo } from '../../types';

import { cn } from '../../utils/classNames';
import { API_BASE_URL } from '../../constants';

interface MediaGridProps {
    images?: PostImage[];
    imageUrls?: string[]; // From backend
    video?: PostVideo | null;
    videoUrl?: string; // From backend
    onImageClick: (index: number) => void;
}

interface MediaItem {
    url: string;
    alt?: string;
    isVideo: boolean;
}

interface GridItemProps {
    item: MediaItem;
    index: number;
    className?: string;
    showOverlay?: boolean;
    totalCount: number;
    onImageClick: (index: number) => void;
}

const GridItem: React.FC<GridItemProps> = ({ item, index, className, showOverlay, totalCount, onImageClick }) => {
    const { t } = useTranslation();
    const videoRef = React.useRef<HTMLVideoElement>(null);

    const handleMouseEnter = () => {
        if (item.isVideo && videoRef.current) {
            videoRef.current.play().catch(() => { });
        }
    };

    const handleMouseLeave = () => {
        if (item.isVideo && videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    };

    return (
        <div
            className={cn(
                'relative cursor-pointer overflow-hidden bg-gray-100 dark:bg-dark-surface',
                className
            )}
            onClick={(e) => {
                e.stopPropagation();
                onImageClick(index);
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {item.isVideo ? (
                <div className="w-full h-full relative group/video">
                    <video
                        ref={videoRef}
                        src={item.url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        loop
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover/video:bg-transparent transition-colors flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-white opacity-80 group-hover/video:opacity-0 transition-opacity">
                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>
                </div>
            ) : (
                <img
                    src={item.url}
                    alt={item.alt || ''}
                    className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                    loading="lazy"
                    onError={(e) => {
                        e.currentTarget.src = '/placeholders/image-error.png';
                        e.currentTarget.classList.add('p-8', 'opacity-50');
                    }}
                />
            )}
            {item.alt && (
                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/60 text-white rounded text-[10px] font-bold">
                    ALT
                </div>
            )}
            {showOverlay && totalCount > 5 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-2xl backdrop-blur-[2px]">
                    +{totalCount - 5}
                </div>
            )}
            {item.isVideo && (
                <div className="absolute top-2 right-2 p-1 bg-black/50 rounded text-white text-[10px] font-bold uppercase">{t('nav.video')}</div>
            )}
        </div>
    );
};

const MediaGrid: React.FC<MediaGridProps> = ({ images = [], imageUrls = [], video, videoUrl, onImageClick }) => {
    const { t } = useTranslation();
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    const resolveUrl = (url: string) => {
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        return `${API_BASE_URL.replace('/api', '')}${url}`;
    };

    const mediaList: MediaItem[] = [];
    if (video) mediaList.push({ url: resolveUrl(video.url), isVideo: true });
    if (videoUrl) mediaList.push({ url: resolveUrl(videoUrl), isVideo: true });

    images.forEach(img => mediaList.push({ url: resolveUrl(img.url), alt: img.alt, isVideo: false }));
    imageUrls.forEach(url => mediaList.push({ url: resolveUrl(url), isVideo: false }));

    const firstMedia = mediaList[0];


    useEffect(() => {
        if (!firstMedia) return;

        if (firstMedia.isVideo) {
            const vid = document.createElement('video');
            vid.src = firstMedia.url;
            vid.onloadedmetadata = () => {
                setOrientation(vid.videoWidth >= vid.videoHeight ? 'landscape' : 'portrait');
                setIsLoaded(true);
            };
        } else {
            const img = new Image();
            img.src = firstMedia.url;
            img.onload = () => {
                setOrientation(img.width >= img.height ? 'landscape' : 'portrait');
                setIsLoaded(true);
            };
            img.onerror = () => {
                // If can't load, default to landscape but mark error
                setHasError(true);
                setIsLoaded(true);
            };
        }
    }, [firstMedia]);

    if (mediaList.length === 0) return null;

    const count = mediaList.length;


    if (count === 1) {
        return (
            <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border">
                <GridItem item={mediaList[0]} index={0} className="aspect-auto max-h-[512px]" totalCount={count} onImageClick={onImageClick} />
            </div>
        );
    }

    if (count === 2) {
        return (
            <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border aspect-[2/1]">
                {mediaList.slice(0, 2).map((item, i) => (
                    <GridItem key={i} item={item} index={i} className="h-full" totalCount={count} onImageClick={onImageClick} />
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
                        <GridItem item={mediaList[0]} index={0} className="col-span-2 aspect-[3/2]" totalCount={count} onImageClick={onImageClick} />
                        <GridItem item={mediaList[1]} index={1} className="aspect-square" totalCount={count} onImageClick={onImageClick} />
                        <GridItem item={mediaList[2]} index={2} className="aspect-square" totalCount={count} onImageClick={onImageClick} />
                    </>
                ) : (
                    <>
                        <GridItem item={mediaList[0]} index={0} className="row-span-2 h-full" totalCount={count} onImageClick={onImageClick} />
                        <GridItem item={mediaList[1]} index={1} className="aspect-square" totalCount={count} onImageClick={onImageClick} />
                        <GridItem item={mediaList[2]} index={2} className="aspect-square" totalCount={count} onImageClick={onImageClick} />
                    </>
                )}
            </div>
        );
    }

    if (count === 4) {
        return (
            <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border aspect-square">
                {mediaList.slice(0, 4).map((item, i) => (
                    <GridItem key={i} item={item} index={i} className="h-full" totalCount={count} onImageClick={onImageClick} />
                ))}
            </div>
        );
    }

    // 5 or more
    if (count >= 5) {
        if (orientation === 'landscape') {
            return (
                <div className="grid grid-cols-6 grid-rows-2 gap-1 rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border aspect-square">
                    <GridItem item={mediaList[0]} index={0} className="col-span-3" totalCount={count} onImageClick={onImageClick} />
                    <GridItem item={mediaList[1]} index={1} className="col-span-3" totalCount={count} onImageClick={onImageClick} />
                    <GridItem item={mediaList[2]} index={2} className="col-span-2" totalCount={count} onImageClick={onImageClick} />
                    <GridItem item={mediaList[3]} index={3} className="col-span-2" totalCount={count} onImageClick={onImageClick} />
                    <GridItem item={mediaList[4]} index={4} className="col-span-2" showOverlay={true} totalCount={count} onImageClick={onImageClick} />
                </div>
            );
        } else {
            return (
                <div className="grid grid-rows-6 grid-cols-2 gap-1 rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border aspect-[4/5]">
                    <GridItem item={mediaList[0]} index={0} className="row-span-3" totalCount={count} onImageClick={onImageClick} />
                    <GridItem item={mediaList[1]} index={1} className="row-span-3" totalCount={count} onImageClick={onImageClick} />
                    <GridItem item={mediaList[2]} index={2} className="row-span-2 col-start-2 row-start-1" totalCount={count} onImageClick={onImageClick} />
                    <GridItem item={mediaList[3]} index={3} className="row-span-2 col-start-2 row-start-3" totalCount={count} onImageClick={onImageClick} />
                    <GridItem item={mediaList[4]} index={4} className="row-span-2 col-start-2 row-start-5" showOverlay={true} totalCount={count} onImageClick={onImageClick} />
                </div>
            );
        }
    }

    return null;
};

export default MediaGrid;
