import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PostImage, PostVideo } from '../../types';

import { cn } from '../../utils/classNames';
import { API_BASE_URL } from '../../constants';

interface MediaGridProps {
    images?: PostImage[];
    imageUrls?: string[]; // From backend
    video?: PostVideo | null;
    onImageClick: (index: number) => void;
}

interface MediaItem {
    url: string;
    alt?: string;
    isVideo: boolean;
}

const MediaGrid: React.FC<MediaGridProps> = ({ images = [], imageUrls = [], video, onImageClick }) => {
    const { t } = useTranslation();
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [isLoaded, setIsLoaded] = useState(false);

    const resolveUrl = (url: string) => {
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        return `${API_BASE_URL.replace('/api', '')}${url}`;
    };

    const mediaList: MediaItem[] = [];
    if (video) mediaList.push({ url: resolveUrl(video.url), isVideo: true });

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
        }
    }, [firstMedia]);

    if (mediaList.length === 0) return null;

    const count = mediaList.length;

    // Helper to render media item
    const renderMedia = (item: any, index: number, className?: string, showOverlay: boolean = false) => (
        <div
            key={index}
            className={cn(
                'relative cursor-pointer overflow-hidden bg-gray-100 dark:bg-dark-surface',
                className
            )}
            onClick={(e) => {
                e.stopPropagation();
                onImageClick(index);
            }}
        >
            {item.isVideo ? (
                <video src={item.url} className="w-full h-full object-cover" muted playsInline />
            ) : (
                <img src={item.url} alt={item.alt || ''} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
            )}
            {item.alt && (
                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/60 text-white rounded text-[10px] font-bold">
                    ALT
                </div>
            )}
            {showOverlay && count > 5 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-2xl backdrop-blur-[2px]">
                    +{count - 5}
                </div>
            )}
            {item.isVideo && (
                <div className="absolute top-2 right-2 p-1 bg-black/50 rounded text-white text-[10px] font-bold uppercase">{t('nav.video')}</div>
            )}
        </div>
    );

    if (count === 1) {
        return <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border">{renderMedia(mediaList[0], 0, 'aspect-auto max-h-[512px]')}</div>;
    }

    if (count === 2) {
        return (
            <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border aspect-[2/1]">
                {mediaList.slice(0, 2).map((item, i) => renderMedia(item, i, 'h-full'))}
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
                        {renderMedia(mediaList[0], 0, "col-span-2 aspect-[3/2]")}
                        {renderMedia(mediaList[1], 1, "aspect-square")}
                        {renderMedia(mediaList[2], 2, "aspect-square")}
                    </>
                ) : (
                    <>
                        {renderMedia(mediaList[0], 0, "row-span-2 h-full")}
                        {renderMedia(mediaList[1], 1, "aspect-square")}
                        {renderMedia(mediaList[2], 2, "aspect-square")}
                    </>
                )}
            </div>
        );
    }

    if (count === 4) {
        return (
            <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border aspect-square">
                {mediaList.slice(0, 4).map((item, i) => renderMedia(item, i, 'h-full'))}
            </div>
        );
    }

    // 5 or more
    if (count >= 5) {
        if (orientation === 'landscape') {
            return (
                <div className="grid grid-cols-6 grid-rows-2 gap-1 rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border aspect-square">
                    {renderMedia(mediaList[0], 0, "col-span-3")}
                    {renderMedia(mediaList[1], 1, "col-span-3")}
                    {renderMedia(mediaList[2], 2, "col-span-2")}
                    {renderMedia(mediaList[3], 3, "col-span-2")}
                    {renderMedia(mediaList[4], 4, "col-span-2", true)}
                </div>
            );
        } else {
            return (
                <div className="grid grid-rows-6 grid-cols-2 gap-1 rounded-xl overflow-hidden border border-gray-100 dark:border-dark-border aspect-[4/5]">
                    {/* Left Column */}
                    {renderMedia(mediaList[0], 0, "row-span-3")}
                    {renderMedia(mediaList[1], 1, "row-span-3")}

                    {/* Right Column */}
                    {renderMedia(mediaList[2], 2, "row-span-2 col-start-2 row-start-1")}
                    {renderMedia(mediaList[3], 3, "row-span-2 col-start-2 row-start-3")}
                    {renderMedia(mediaList[4], 4, "row-span-2 col-start-2 row-start-5", true)}
                </div>
            );
        }
    }

    return null;
};

export default MediaGrid;
