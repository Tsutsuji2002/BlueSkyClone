import React from 'react';
import { useTranslation } from 'react-i18next';
import Skeleton from './Skeleton';
import { LinkPreview } from '../../types';
import { FiExternalLink, FiLink } from 'react-icons/fi';
import { cn } from '../../utils/classNames';
import { useAppSelector } from '../../hooks/useAppSelector';

interface LinkPreviewCardProps {
    preview?: LinkPreview;
    isSmall?: boolean;
    isLoading?: boolean;
}

const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null;
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
    if (!url) return null;
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

const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({ preview, isSmall = false, isLoading: isPending = false }) => {
    const { t } = useTranslation();
    const [imageError, setImageError] = React.useState(false);
    const [isImageLoading, setIsImageLoading] = React.useState(true);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const settings = useAppSelector(state => state.auth.settings);
    const enabledProviders = settings?.enabledMediaProviders || [];

    const embedUrl = preview ? getEmbedUrl(preview.url, enabledProviders) : null;

    if (isPending || !preview) {
        return (
            <div className={cn(
                "block border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden bg-white dark:bg-dark-bg mt-3 w-full",
                isSmall && "mt-1"
            )}>
                <div className={cn("w-full bg-gray-100 dark:bg-dark-surface relative", isSmall ? "aspect-[3/1]" : "aspect-[1.91/1]")}>
                    <Skeleton variant="rectangular" width="100%" height="100%" />
                </div>
                <div className={isSmall ? "p-2" : "p-3"}>
                    <Skeleton variant="text" width="40%" height={12} className="mb-2" />
                    <Skeleton variant="text" width="90%" height={16} className="mb-1" />
                    {!isSmall && <Skeleton variant="text" width="70%" height={14} />}
                </div>
            </div>
        );
    }

    if (embedUrl) {
        if (!isPlaying) {
            return (
                <div
                    className="relative block border border-[#dce2ea] dark:border-dark-border rounded-[12px] overflow-hidden hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors bg-white dark:bg-dark-bg group max-w-full cursor-pointer mt-2 w-full"
                    onClick={(e) => { e.stopPropagation(); setIsPlaying(true); }}
                >
                    <div className="w-full relative aspect-[1.77778/1] overflow-hidden bg-gray-100 dark:bg-dark-surface">
                        {preview.image && !imageError ? (
                            <img
                                src={preview.image}
                                alt={preview.title || t('nav.link_preview')}
                                className={cn(
                                    "w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500",
                                    isImageLoading ? "opacity-0" : "opacity-100"
                                )}
                                onLoad={() => setIsImageLoading(false)}
                                onError={() => {
                                    setImageError(true);
                                    setIsImageLoading(false);
                                }}
                            />
                        ) : (
                            <div className="w-full h-full bg-[#111822]" />
                        )}
                        <div className="absolute inset-0 bg-[#111822]/30 pointer-events-none" />
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <button
                                type="button"
                                className="relative flex items-center justify-center cursor-pointer outline-none group/play"
                            >
                                <div className="w-[53.33px] h-[53.33px] rounded-full bg-[#F9FAFB] opacity-70 shadow-[0_0_32px_rgba(0,0,0,0.5)] group-hover/play:opacity-90 transition-opacity" />
                                <svg fill="none" width="32" height="32" viewBox="0 0 24 24" className="absolute">
                                    <path fill="#111822" stroke="none" strokeWidth="0" fillRule="evenodd" clipRule="evenodd" d="M6.514 2.143A1 1 0 0 0 5 3v18a1 1 0 0 0 1.514.858l15-9a1 1 0 0 0 0-1.716l-15-9Z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 pt-2 bg-white dark:bg-dark-bg border-t border-[#dce2ea] dark:border-dark-border">
                        <div className="px-3 pb-1 flex flex-col gap-[3px]">
                            <div className="font-semibold text-[15px] text-gray-900 dark:text-white leading-[20px] tracking-[0.25px] line-clamp-3">
                                {preview.title || preview.url}
                            </div>
                            <div className="text-[13.1px] text-gray-900 dark:text-gray-200 leading-[17px] tracking-[0.25px] line-clamp-4">
                                {preview.description || (preview.domain?.includes('youtube') || preview.url?.includes('youtube') ? `YouTube video by ${preview.title ? preview.title.split(' - ')[0] : 'creator'}` : '')}
                            </div>
                        </div>
                        <div className="px-3">
                            <div className="w-full border-t border-[#dce2ea] dark:border-dark-border" />
                            <div className="flex items-center gap-[2px] pt-[6px] pb-[8px]">
                                <svg fill="none" viewBox="0 0 24 24" width="12" height="12" className="text-[#8798B0] flex-shrink-0">
                                    <path fill="#8798B0" stroke="none" fillRule="evenodd" clipRule="evenodd" d="M4.4 9.493C4.14 10.28 4 11.124 4 12a8 8 0 1 0 10.899-7.459l-.953 3.81a1 1 0 0 1-.726.727l-3.444.866-.772 1.533a1 1 0 0 1-1.493.35L4.4 9.493Zm.883-1.84L7.756 9.51l.44-.874a1 1 0 0 1 .649-.52l3.306-.832.807-3.227a7.993 7.993 0 0 0-7.676 3.597ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm8.43.162a1 1 0 0 1 .77-.29l1.89.121a1 1 0 0 1 .494.168l2.869 1.928a1 1 0 0 1 .336 1.277l-.973 1.946a1 1 0 0 1-.894.553h-2.92a1 1 0 0 1-.831-.445L9.225 14.5a1 1 0 0 1 .126-1.262l1.08-1.076Zm.915 1.913.177-.177 1.171.074 1.914 1.286-.303.607h-1.766l-1.194-1.79Z" />
                                </svg>
                                <div className="text-[11.3px] text-[#405168] dark:text-[#8798B0] leading-[15px] tracking-[0.25px]">
                                    {preview.domain || new URL(preview.url).hostname}
                                </div>
                            </div>
                        </div>
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
            {/* Image area: always reserve space (aspect-ratio box) when image is provided */}
            {preview.image && !imageError ? (
                <div className={cn(
                    "w-full overflow-hidden bg-gray-100 dark:bg-dark-surface relative border-b border-gray-100 dark:border-dark-border",
                    isSmall ? "aspect-[3/1]" : "aspect-[1.91/1]"
                )}>
                    {/* Skeleton always present underneath until image is loaded */}
                    <div className={cn("absolute inset-0 transition-opacity duration-300", isImageLoading ? "opacity-100" : "opacity-0")}>
                        <Skeleton variant="rectangular" width="100%" height="100%" />
                    </div>
                    <img
                        src={preview.image}
                        alt={preview.title || t('nav.link_preview')}
                        className={cn(
                            "absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-all duration-500",
                            isImageLoading ? "opacity-0" : "opacity-100"
                        )}
                        onLoad={() => setIsImageLoading(false)}
                        onError={() => {
                            setImageError(true);
                            setIsImageLoading(false);
                        }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                </div>
            ) : (
                <div className={cn(
                    "w-full bg-gray-50 dark:bg-dark-surface/30 flex items-center justify-center border-b border-gray-100 dark:border-dark-border",
                    isSmall ? "h-12" : "h-24"
                )}>
                    <FiLink className="text-gray-300 dark:text-dark-border" size={isSmall ? 20 : 32} />
                </div>
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
