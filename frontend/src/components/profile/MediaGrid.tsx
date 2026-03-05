import React from 'react';
import { Link } from 'react-router-dom';
import { FiPlay } from 'react-icons/fi';
import { Post } from '../../types';
import { API_BASE_URL } from '../../constants';

interface MediaItem {
    url: string;
    type: 'image' | 'video';
    post: Post;
    mediaIndex: number;
    altText?: string;
}

interface MediaGridProps {
    posts: Post[];
}

const MediaGrid: React.FC<MediaGridProps> = ({ posts }) => {
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
                <Link
                    key={`${media.post.id}-${media.mediaIndex}-${index}`}
                    to={`/profile/${media.post.author.handle}/post/${media.post.id}/media/${media.mediaIndex}`}
                    className="relative aspect-square overflow-hidden bg-gray-200 dark:bg-dark-surface group focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset block"
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

                    {media.altText && (
                        <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/60 text-white rounded text-[10px] font-bold">
                            ALT
                        </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                </Link>
            ))}
        </div>
    );
};

export default MediaGrid;
