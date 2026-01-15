import { LinkPreview } from '../types';

/**
 * Extract YouTube video ID from various URL formats
 */
const getYouTubeVideoId = (url: string): string | null => {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
};

/**
 * Enhanced metadata fetcher with multi-stage fallback.
 * 1. Special: YouTube oEmbed API (for YouTube videos)
 * 2. Primary: Microlink API (handles JS/Anti-bot)
 * 3. Fallback: CORS Proxy + Manual Scraping (handles API limits/timeouts)
 */
export const getLinkMetadata = async (url: string): Promise<LinkPreview | null> => {
    try {
        const targetUrl = new URL(url);
        const domain = targetUrl.hostname.replace('www.', '');

        // --- STAGE 0: YOUTUBE OEMBED (FOR YOUTUBE VIDEOS) ---
        if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
            const videoId = getYouTubeVideoId(url);
            if (videoId) {
                try {
                    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
                    const response = await fetch(oembedUrl);
                    if (response.ok) {
                        const data = await response.json();
                        return {
                            url: url,
                            title: data.title || 'YouTube Video',
                            description: `YouTube video by ${data.author_name || 'Unknown'}` || 'Watch on YouTube',
                            domain: 'youtube.com',
                            image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` || data.thumbnail_url
                        };
                    }
                } catch (e) {
                    console.warn('YouTube oEmbed failed, trying other methods...', e);
                }
            }
        }

        // --- STAGE 1: MICROLINK API ---
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout for primary

            const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}&palette=true`;
            const response = await fetch(apiUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
                const { data } = await response.json();
                if (data && (data.title || data.image)) {
                    return {
                        url: data.url || url,
                        title: data.title || domain,
                        description: data.description || `Visit ${domain} for more information.`,
                        domain: domain,
                        image: data.image?.url || data.logo?.url
                    };
                }
            }
        } catch (e) {
            console.warn('Microlink primary failed, trying fallback...', e);
        }

        // --- STAGE 2: CORS PROXY SCRAPING (FALLBACK) ---
        try {
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            if (response.ok) {
                const data = await response.json();
                if (data.contents) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(data.contents, 'text/html');

                    const getMeta = (prop: string) =>
                        doc.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') ||
                        doc.querySelector(`meta[name="${prop}"]`)?.getAttribute('content');

                    const title = getMeta('og:title') || getMeta('twitter:title') || doc.title || domain;
                    const description = getMeta('og:description') || getMeta('twitter:description') || getMeta('description');
                    let image = getMeta('og:image') || getMeta('twitter:image');

                    if (!image) {
                        const firstImg = doc.querySelector('img[src^="http"]');
                        if (firstImg) image = firstImg.getAttribute('src') || undefined;
                    }

                    if (image && !image.startsWith('http')) {
                        image = new URL(image, url).href;
                    }

                    return {
                        url,
                        title: title.trim(),
                        description: (description || `Visit ${domain} for more information.`).trim(),
                        domain,
                        image: image || undefined
                    };
                }
            }
        } catch (e) {
            console.warn('Scraping fallback failed:', e);
        }

        // --- FINAL FALLBACK: BARE BONES ---
        return {
            url,
            title: domain,
            description: `Visit ${domain} for more information.`,
            domain: domain,
            image: undefined
        };
    } catch (error) {
        console.error('Terminal link preview error:', error);
        return null;
    }
};
