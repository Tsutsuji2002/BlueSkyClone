import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlay } from 'react-icons/fi';
import { Post } from '../../types';
import { API_BASE_URL } from '../../constants';

interface MediaItem {
    url: string;
    type: 'image' | 'video';
    post: Post;
    mediaIndex: number;
    altText?: string;
    duration?: number;
}

interface MediaGridProps {
    posts: Post[];
}

const GridItem: React.FC<{ media: MediaItem; index: number; navigate: any; postDetailPath: string; mediaViewerPath: string }> = ({ media, index, navigate, postDetailPath, mediaViewerPath }) => {
    const [duration, setDuration] = React.useState<number | null>(null);
    const isVideo = media.type === 'video';

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getMediaUrl = (url: string) => {
        if (url.startsWith('http')) return url;
        return `${API_BASE_URL.replace('/api', '')}${url}`;
    };

    const content = (
        <div className="relative w-full h-full aspect-square bg-gray-200 dark:bg-dark-surface overflow-hidden group">
            {isVideo ? (
                <>
                    <video
                        src={getMediaUrl(media.url)}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                    />
                    {/* Video Play Icon Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors">
                        <div className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <FiPlay size={20} className="text-white ml-0.5" fill="white" />
                        </div>
                    </div>
                    {/* Duration Badge */}
                    {duration !== null && (
                        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/70 text-white rounded text-[11px] font-bold backdrop-blur-sm">
                            {formatTime(duration)}
                        </div>
                    )}
                </>
            ) : (
                <img
                    src={getMediaUrl(media.url)}
                    alt={media.altText || ""}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
            )}

            {media.altText && !isVideo && (
                <div className="absolute bottom-1.5 right-1.5 px-1 py-0.5 bg-black/60 text-white rounded text-[10px] font-bold">
                    ALT
                </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
        </div>
    );

    if (isVideo) {
        return (
            <button
                onClick={() => navigate(postDetailPath)}
                className="block w-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
            >
                {content}
            </button>
        );
    }

    return (
        <Link
            to={mediaViewerPath}
            className="block focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
        >
            {content}
        </Link>
    );
};

const MediaGrid: React.FC<MediaGridProps> = ({ posts }) => {
    const navigate = useNavigate();
    // Flatten all media from all posts into a single list, ordered by post date
    const allMedia: MediaItem[] = posts.flatMap(post => {
        const items: MediaItem[] = [];
        const addedUrls = new Set<string>();

        // 1. Handle new media prop
        if (post.media && post.media.length > 0) {
            post.media.forEach((m, idx) => {
                items.push({ url: m.url, type: (m.type === 'video' ? 'video' : 'image'), post, mediaIndex: idx, altText: m.altText });
                addedUrls.add(m.url);
            });
        }

        // 2. Fallback to images
        if (post.imageUrls && post.imageUrls.length > 0) {
            post.imageUrls.forEach((url, idx) => {
                if (!addedUrls.has(url)) {
                    items.push({ url, type: 'image', post, mediaIndex: idx });
                    addedUrls.add(url);
                }
            });
        }

        // 3. Fallback to video
        if (post.videoUrl && !addedUrls.has(post.videoUrl)) {
            const videoIndex = post.imageUrls ? post.imageUrls.length : 0;
            items.push({ url: post.videoUrl, type: 'video', post, mediaIndex: videoIndex });
        }

        return items;
    });

    if (allMedia.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-gray-500 dark:text-dark-text-secondary">No media to display</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-0.5 bg-gray-100 dark:bg-dark-border">
            {allMedia.map((media, index) => {
                const postDetailPath = `/profile/${media.post.author.handle}/post/${media.post.tid || media.post.id}`;
                const mediaViewerPath = `${postDetailPath}/media/${media.mediaIndex}`;

                return (
                    <GridItem 
                        key={`${media.post.id}-${media.mediaIndex}-${index}`}
                        media={media}
                        index={index}
                        navigate={navigate}
                        postDetailPath={postDetailPath}
                        mediaViewerPath={mediaViewerPath}
                    />
                );
            })}
        </div>
    );
};

export default MediaGrid;
