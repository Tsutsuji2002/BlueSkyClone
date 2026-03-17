import React from 'react';
import { useTranslation } from 'react-i18next';
import Skeleton from './Skeleton';
import { LinkPreview } from '../../types';
import { FiExternalLink, FiLink } from 'react-icons/fi';
import { cn } from '../../utils/classNames';
import { useAppSelector } from '../../hooks/useAppSelector';

interface LinkPreviewCardProps {
    preview: LinkPreview;
    isSmall?: boolean;
}

const getYouTubeVideoId = (url: string): string | null => {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
    }
    return null;
};

const getEmbedUrl = (url: string, enabledProviders: string[]): string | null => {
    try {
        const u = new URL(url);
        const host = u.hostname.replace('www.', '');

        if (enabledProviders.includes('YouTube') && (host.includes('youtube.com') || host.includes('youtu.be')) && !url.includes('/shorts/')) {
            const v = getYouTubeVideoId(url);
            if (v) return `https://www.youtube.com/embed/${v}`;
        }

        if (enabledProviders.includes('YouTube Shorts') && host.includes('youtube.com') && url.includes('/shorts/')) {
            const v = getYouTubeVideoId(url);
            if (v) return `https://www.youtube.com/embed/${v}`;
        }

        if (enabledProviders.includes('Vimeo') && host.includes('vimeo.com')) {
            const match = url.match(/vimeo\.com[a-zA-Z0-9_\/]*\/([0-9]+)/);
            if (match && match[1]) return `https://player.vimeo.com/video/${match[1]}`;
        }

        if (enabledProviders.includes('Twitch') && host.includes('twitch.tv')) {
            const videoMatch = url.match(/twitch\.tv\/videos\/([0-9]+)/);
            if (videoMatch && videoMatch[1]) return `https://player.twitch.tv/?video=${videoMatch[1]}&parent=${window.location.hostname}`;
            const match = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
            if (match && match[1]) return `https://player.twitch.tv/?channel=${match[1]}&parent=${window.location.hostname}`;
        }

        if (enabledProviders.includes('GIPHY') && host.includes('giphy.com')) {
            const match = url.match(/giphy\.com\/gifs\/[a-zA-Z0-9\-]*?-([a-zA-Z0-9]+)$/);
            if (match && match[1]) return `https://giphy.com/embed/${match[1]}`;
        }

        if (enabledProviders.includes('Spotify') && host.includes('spotify.com')) {
            const match = url.match(/open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/);
            if (match && match[1] && match[2]) return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
        }

        if (enabledProviders.includes('Apple Music') && host.includes('music.apple.com')) {
            return url.replace('music.apple.com', 'embed.music.apple.com');
        }

        if (enabledProviders.includes('SoundCloud') && host.includes('soundcloud.com')) {
            return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`;
        }

        if (enabledProviders.includes('Flickr') && (host.includes('flickr.com') || host.includes('flic.kr'))) {
            const match = url.match(/flickr\.com\/photos\/[^\/]+\/([0-9]+)/);
            if (match && match[1]) {
                return `https://www.flickr.com/photos/tags/${match[1]}/player/`;
            }
        }

    } catch (e) {
        return null;
    }
    return null;
};

const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({ preview, isSmall = false }) => {
    const { t } = useTranslation();
    const [imageError, setImageError] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const settings = useAppSelector(state => state.auth.settings);
    const enabledProviders = settings?.enabledMediaProviders || [];

    const embedUrl = getEmbedUrl(preview.url, enabledProviders);

    if (embedUrl) {
        if (!isPlaying) {
            return (
                <div className={cn(
                    "relative block border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors bg-white dark:bg-dark-bg group max-w-full cursor-pointer mt-3 w-full"
                )} onClick={(e) => { e.stopPropagation(); setIsPlaying(true); }}>
                    {preview.image && !imageError ? (
                        <div className="w-full relative aspect-video bg-gray-100 dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border">
                            <img
                                src={preview.image}
                                alt={preview.title || t('nav.link_preview')}
                                className={cn(
                                    "w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500",
                                    isLoading ? "opacity-0" : "opacity-100"
                                )}
                                onLoad={() => setIsLoading(false)}
                                onError={() => {
                                    setImageError(true);
                                    setIsLoading(false);
                                }}
                            />
                            {isLoading && (
                                <div className="absolute inset-0">
                                    <Skeleton variant="rectangular" width="100%" height="100%" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                                <div className="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:bg-black/80 transition-colors">
                                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full aspect-video bg-gray-900 flex items-center justify-center relative">
                            <div className="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:bg-black/80 transition-colors">
                                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                        </div>
                    )}
                    <div className="p-3 bg-white dark:bg-dark-bg">
                        <h4 className="font-bold text-gray-900 dark:text-dark-text leading-snug line-clamp-1 transition-colors text-[15px]">
                            {preview.title || preview.url}
                        </h4>
                        <span className="font-medium text-gray-500 dark:text-dark-text-secondary line-clamp-1 text-[12px] mt-0.5">
                            {preview.domain || new URL(preview.url).hostname.replace('www.', '')}
                        </span>
                    </div>
                </div>
            );
        }

        return (
            <div className="mt-3 w-full aspect-video rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-dark-border" onClick={e => e.stopPropagation()}>
                <iframe
                    src={embedUrl}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        );
    }

    return (
        <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={cn(
                "block border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors bg-white dark:bg-dark-bg group max-w-full",
                isSmall ? "mt-1" : "mt-3"
            )}
        >
            {preview.image && !imageError ? (
                <div className={cn(
                    "w-full overflow-hidden bg-gray-100 dark:bg-dark-surface relative border-b border-gray-100 dark:border-dark-border",
                    isSmall ? "aspect-[3/1]" : "aspect-[1.91/1]"
                )}>
                    <img
                        src={preview.image}
                        alt={preview.title || t('nav.link_preview')}
                        className={cn(
                            "w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500",
                            isLoading ? "opacity-0" : "opacity-100"
                        )}
                        onLoad={() => setIsLoading(false)}
                        onError={() => {
                            setImageError(true);
                            setIsLoading(false);
                        }}
                    />
                    {isLoading && (
                        <div className="absolute inset-0">
                            <Skeleton variant="rectangular" width="100%" height="100%" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                </div>
            ) : (
                <div className={cn("w-full bg-primary-500/10", isSmall ? "h-0.5" : "h-1")} />
            )}
            <div className={isSmall ? "p-2" : "p-3"}>
                <div className="flex items-center gap-1 mb-0.5">
                    <span className={cn(
                        "font-medium text-gray-500 dark:text-dark-text-secondary line-clamp-1",
                        isSmall ? "text-[10px]" : "text-[12px]"
                    )}>
                        {preview.domain || new URL(preview.url).hostname.replace('www.', '')}
                    </span>
                    <FiExternalLink size={isSmall ? 10 : 12} className="text-gray-400" />
                </div>
                <h4 className={cn(
                    "font-bold text-gray-900 dark:text-dark-text leading-snug line-clamp-2 transition-colors",
                    isSmall ? "text-[13px] mb-0" : "text-[15px] mb-1 group-hover:text-primary-600"
                )}>
                    {preview.title || preview.url}
                </h4>
                {preview.description && !isSmall && (
                    <p className="text-[14px] text-gray-500 dark:text-dark-text-secondary line-clamp-2 leading-relaxed opacity-90 mt-1">
                        {preview.description}
                    </p>
                )}
            </div>
        </a>
    );
};

export default LinkPreviewCard;
