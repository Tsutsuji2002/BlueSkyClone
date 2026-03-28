import { Post, User, PostImage, PostVideo, LinkPreview } from '../types';

/**
 * Maps a standard AT Protocol postView object (from getPostThread or similar)
 * to our internal Post interface.
 */
export const mapAtProtoPostToPost = (atPost: any): Post => {
    if (!atPost) return atPost;

    // If it's already mapped (has content and createdAt at top level), return it
    if (atPost.content && atPost.createdAt && atPost.author?.id) {
        return atPost as Post;
    }

    const record = atPost.record || {};
    const authorFollowingReference = atPost.author?.viewer?.following || atPost.author?.followingReference;
    
    // Map author
    const author: Partial<User> & { id: string; username: string; handle: string; displayName: string; avatarUrl?: string } = {
        id: atPost.author?.did || '',
        username: atPost.author?.handle?.split('.')[0] || atPost.author?.handle || '',
        handle: atPost.author?.handle || '',
        displayName: atPost.author?.displayName || atPost.author?.handle || '',
        avatarUrl: atPost.author?.avatar,
        avatar: atPost.author?.avatar,
        isFollowing: Boolean(authorFollowingReference) || atPost.author?.isFollowing === true,
        followingReference: authorFollowingReference || undefined,
        isMuted: atPost.author?.viewer?.muted || atPost.author?.isMuted,
        isBlockedBy: atPost.author?.viewer?.blockedBy || atPost.author?.isBlockedBy,
        isBlocking: Boolean(atPost.author?.viewer?.blocking) || atPost.author?.isBlocking,
    };

    const embed = atPost.embed || {};
    let images: PostImage[] = [];
    let imageUrls: string[] = [];
    let videoUrl: string | undefined = undefined;
    let video: PostVideo | undefined = undefined;
    let linkPreview: LinkPreview | undefined = undefined;

    // Helper to extract media from an embed object
    const extractMedia = (e: any) => {
        if (!e) return;
        const type = e.$type;

        if (type === 'app.bsky.embed.images#view' || e.images) {
            const imgs = e.images || [];
            imgs.forEach((img: any) => {
                const url = img.thumb || img.fullsize || '';
                images.push({
                    url,
                    alt: img.alt
                });
                imageUrls.push(img.fullsize || img.thumb || '');
            });
        } else if (type === 'app.bsky.embed.video#view' || e.playlist) {
            videoUrl = e.playlist || e.thumbnail;
            video = {
                url: e.playlist || '',
                thumbnail: e.thumbnail,
                alt: e.alt
            };
        } else if (type === 'app.bsky.embed.external#view' || e.external) {
            const ext = e.external;
            if (ext) {
                linkPreview = {
                    title: ext.title,
                    description: ext.description,
                    url: ext.uri,
                    image: ext.thumb,
                    domain: (() => {
                        try {
                            return new URL(ext.uri).hostname;
                        } catch {
                            return '';
                        }
                    })()
                };
            }
        } else if (type === 'app.bsky.embed.recordWithMedia#view' || e.media) {
            extractMedia(e.media);
        }
    };

    extractMedia(embed);

    // Map the post
    const post: Post = {
        id: atPost.cid || atPost.uri?.split('/').pop() || '',
        uri: atPost.uri,
        cid: atPost.cid,
        author,
        content: record.text || atPost.content || '',
        createdAt: record.createdAt || atPost.indexedAt || atPost.createdAt || new Date().toISOString(),
        likesCount: atPost.likeCount ?? atPost.likesCount ?? 0,
        repostsCount: atPost.repostCount ?? atPost.repostsCount ?? 0,
        repliesCount: atPost.replyCount ?? atPost.repliesCount ?? 0,
        quotesCount: atPost.quoteCount ?? atPost.quotesCount ?? 0,
        bookmarksCount: atPost.bookmarksCount ?? 0,
        isLiked: !!atPost.viewer?.like,
        isReposted: !!atPost.viewer?.repost,
        isBookmarked: atPost.isBookmarked ?? false,
        facets: record.facets,
        images,
        imageUrls,
        videoUrl,
        video,
        linkPreview,
        viewer: atPost.viewer,
        tid: atPost.uri?.split('/').pop(),
        replyToPostId: record.reply?.parent?.uri?.split('/').pop(),
        rootPostId: record.reply?.root?.uri?.split('/').pop(),
    };

    return post;
};
