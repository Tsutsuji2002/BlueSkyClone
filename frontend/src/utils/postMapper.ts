import { Post, User, PostImage, PostVideo, LinkPreview } from '../types';

const normalizeLabelValues = (labels: any): string[] => {
    if (!Array.isArray(labels)) return [];

    return labels
        .map((label) => {
            if (typeof label === 'string') return label;
            if (label && typeof label === 'object') {
                if (typeof label.val === 'string') return label.val;
                if (typeof label.label === 'string') return label.label;
            }

            return null;
        })
        .filter((label): label is string => typeof label === 'string' && label.trim().length > 0);
};

/**
 * Maps a standard AT Protocol postView object (from getPostThread or similar)
 * to our internal Post interface.
 */
export const mapAtProtoPostToPost = (atPost: any): Post => {
    if (!atPost) return atPost;

    // If it's already mapped (has content and createdAt at top level), return it
    if (atPost.content && atPost.createdAt && atPost.author?.id) {
        return {
            ...atPost,
            author: atPost.author
                ? {
                    ...atPost.author,
                    isFollowedBy: atPost.author.isFollowedBy ?? false,
                    labels: normalizeLabelValues(atPost.author.labels),
                }
                : atPost.author,
            quotePost: atPost.quotePost ? mapAtProtoPostToPost(atPost.quotePost) : atPost.quotePost,
            parentPost: atPost.parentPost ? mapAtProtoPostToPost(atPost.parentPost) : atPost.parentPost,
            labels: normalizeLabelValues(atPost.labels),
        } as Post;
    }

    const record = atPost.record || {};
    const authorFollowingReference = atPost.author?.viewer?.following || atPost.author?.followingReference;
    const repostReason = atPost.reason;
    const repostBy = repostReason?.by;

    // Map author
    const author: Partial<User> & { id: string; username: string; handle: string; displayName: string; avatarUrl?: string } = {
        id: atPost.author?.did || '',
        username: atPost.author?.handle?.split('.')[0] || atPost.author?.handle || '',
        handle: atPost.author?.handle || '',
        displayName: atPost.author?.displayName || atPost.author?.handle || '',
        avatarUrl: atPost.author?.avatar,
        avatar: atPost.author?.avatar,
        isFollowing: Boolean(authorFollowingReference) || atPost.author?.isFollowing === true,
        isFollowedBy: atPost.author?.viewer?.followedBy === true || !!atPost.author?.viewer?.followedBy || atPost.author?.isFollowedBy === true,
        followingReference: authorFollowingReference || undefined,
        isMuted: atPost.author?.viewer?.muted || atPost.author?.isMuted,
        isBlockedBy: atPost.author?.viewer?.blockedBy || atPost.author?.isBlockedBy,
        isBlocking: Boolean(atPost.author?.viewer?.blocking) || atPost.author?.isBlocking,
        labels: normalizeLabelValues(atPost.author?.labels),
        muteInfo: atPost.author?.muteInfo,
    };

    const repostedBy = repostBy
        ? {
            id: repostBy.did || repostBy.handle || '',
            username: repostBy.handle?.split('.')[0] || repostBy.handle || '',
            handle: repostBy.handle || '',
            displayName: repostBy.displayName || repostBy.handle || '',
            avatarUrl: repostBy.avatar,
            avatar: repostBy.avatar,
            did: repostBy.did,
            isFollowing: repostBy.viewer?.following === true || !!repostBy.viewer?.following || repostBy.isFollowing === true,
            isFollowedBy: repostBy.viewer?.followedBy === true || !!repostBy.viewer?.followedBy || repostBy.isFollowedBy === true,
            followingReference: repostBy.viewer?.following || repostBy.followingReference || undefined,
            labels: normalizeLabelValues(repostBy.labels),
        }
        : undefined;

    const embed = atPost.embed || {};
    let images: PostImage[] = [];
    let imageUrls: string[] = [];
    let videoUrl: string | undefined = undefined;
    let video: PostVideo | undefined = undefined;
    let linkPreview: LinkPreview | undefined = undefined;
    let quotePost: Post | undefined = undefined;

    const extractQuotedPost = (value: any): Post | undefined => {
        if (!value) return undefined;

        if (value.$type === 'app.bsky.embed.recordWithMedia#view' && value.record) {
            return extractQuotedPost(value.record);
        }

        if (value.$type === 'app.bsky.embed.record#view' && value.record) {
            return extractQuotedPost(value.record);
        }

        if (value.record && !value.author && !value.uri) {
            return extractQuotedPost(value.record);
        }

        if (value.author && value.uri) {
            return mapAtProtoPostToPost(value);
        }

        return undefined;
    };

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
            quotePost = extractQuotedPost(e.record) || quotePost;
        } else if (type === 'app.bsky.embed.record#view' || e.record) {
            quotePost = extractQuotedPost(e.record) || quotePost;
        }
    };

    extractMedia(embed);
    const quotePostRecord = quotePost as Post | undefined;
    const quotePostId = quotePostRecord ? (quotePostRecord.uri || quotePostRecord.tid || quotePostRecord.id) : undefined;

    // Parse Threadgate/Postgate for restrictions
    let replyRestriction = atPost.replyRestriction;
    if (!replyRestriction && atPost.threadgate?.record) {
        const allow = atPost.threadgate.record.allow || [];
        if (allow.length === 0) {
            replyRestriction = 'nobody';
        } else {
            const rules = allow.map((r: any) => r.$type);
            if (rules.includes('app.bsky.feed.threadgate#followingRule')) {
                replyRestriction = 'following';
            } else if (rules.includes('app.bsky.feed.threadgate#mentionRule')) {
                replyRestriction = 'mentioned';
            } else if (rules.includes('app.bsky.feed.threadgate#listRule')) {
                replyRestriction = 'custom';
            }
        }
    }

    let allowQuotes = atPost.allowQuotes;
    if (allowQuotes === undefined && atPost.postgate?.record) {
        const rules = atPost.postgate.record.embeddingRules || [];
        const isDisabled = rules.some((r: any) => r.$type === 'app.bsky.feed.postgate#disableRule');
        allowQuotes = !isDisabled;
    }

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
        quotePost,
        quotePostId,
        parentPost: atPost.parent ? mapAtProtoPostToPost(atPost.parent) : undefined,
        repostedBy,
        viewer: atPost.viewer,
        tid: atPost.uri?.split('/').pop(),
        replyToPostId: record.reply?.parent?.uri?.split('/').pop(),
        rootPostId: record.reply?.root?.uri?.split('/').pop(),
        muteInfo: atPost.muteInfo,
        labels: normalizeLabelValues(atPost.labels),
        replyRestriction,
        allowQuotes,
    };

    return post;
};
