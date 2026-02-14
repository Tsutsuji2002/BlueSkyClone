import React from 'react';
import { FiPlay } from 'react-icons/fi';
import { Post } from '../../types';
import { API_BASE_URL } from '../../constants';

interface MediaItem {
    url: string;
    type: 'image' | 'video';
    post: Post;
    mediaIndex: number;
}

interface MediaGridProps {
    posts: Post[];
    onMediaClick: (post: Post, mediaIndex: number) => void;
}

const MediaGrid: React.FC<MediaGridProps> = ({ posts, onMediaClick }) => {
    // Flatten all media from all posts into a single list, ordered by post date
    const allMedia: MediaItem[] = posts.flatMap(post => {
        const items: MediaItem[] = [];

        // Add images
        if (post.imageUrls && post.imageUrls.length > 0) {
            post.imageUrls.forEach((url, idx) => {
                items.push({ url, type: 'image', post, mediaIndex: idx });
            });
        }

        // Add video
        if (post.videoUrl) {
            const videoIndex = post.imageUrls ? post.imageUrls.length : 0;
            items.push({ url: post.videoUrl, type: 'video', post, mediaIndex: videoIndex });
        }

        return items;
    });

    const getMediaUrl = (url: string) => {
        if (url.startsWith('http')) return url;
        return `${API_BASE_URL.replace('/api', '')}${url}`;
    };

    if (allMedia.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-gray-500 dark:text-dark-text-secondary">No media to display</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-0.5 bg-gray-100 dark:bg-dark-border">
            {allMedia.map((media, index) => (
                <button
                    key={`${media.post.id}-${media.mediaIndex}-${index}`}
                    onClick={() => onMediaClick(media.post, media.mediaIndex)}
                    className="relative aspect-square overflow-hidden bg-gray-200 dark:bg-dark-surface group focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                >
                    {media.type === 'video' ? (
                        <>
                            <video
                                src={getMediaUrl(media.url)}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                            />
                            {/* Video Play Icon Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
                                    <FiPlay size={24} className="text-white ml-1" fill="white" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <img
                            src={getMediaUrl(media.url)}
                            alt=""
                            className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                            loading="lazy"
                        />
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                </button>
            ))}
        </div>
    );
};

export default MediaGrid;
