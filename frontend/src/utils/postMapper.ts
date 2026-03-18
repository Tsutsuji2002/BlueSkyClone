import { Post, User } from '../types';

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
    
    // Map author
    const author: Partial<User> & { id: string; username: string; handle: string; displayName: string; avatarUrl?: string } = {
        id: atPost.author?.did || '',
        username: atPost.author?.handle?.split('.')[0] || atPost.author?.handle || '',
        handle: atPost.author?.handle || '',
        displayName: atPost.author?.displayName || atPost.author?.handle || '',
        avatarUrl: atPost.author?.avatar,
        avatar: atPost.author?.avatar,
    };

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
        images: atPost.embed?.images || [],
        imageUrls: atPost.embed?.images?.map((img: any) => img.fullsize) || [],
        // Handle external or other embeds if needed
        linkPreview: atPost.embed?.external ? {
            title: atPost.embed.external.title,
            description: atPost.embed.external.description,
            url: atPost.embed.external.uri,
            image: atPost.embed.external.thumb,
            domain: (() => {
                try {
                    return new URL(atPost.embed.external.uri).hostname;
                } catch {
                    return '';
                }
            })()
        } : undefined,
        viewer: atPost.viewer,
        tid: atPost.uri?.split('/').pop(),
        replyToPostId: record.reply?.parent?.uri?.split('/').pop(),
        rootPostId: record.reply?.root?.uri?.split('/').pop(),
    };

    return post;
};
