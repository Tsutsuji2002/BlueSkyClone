import { useTranslation } from 'react-i18next';
import { useAppDispatch } from './useAppDispatch';
import { showToast } from '../redux/slices/toastSlice';
import { openSharePost } from '../redux/slices/modalsSlice';
import { Post } from '../types';

export const usePostActions = () => {
    const { t, i18n } = useTranslation();
    const dispatch = useAppDispatch();

    const handleTranslate = (content: string) => {
        if (!content) return;
        const targetLang = i18n.language || 'en';
        const url = `https://translate.google.com/?sl=auto&tl=${targetLang}&text=${encodeURIComponent(content)}&op=translate`;
        window.open(url, '_blank');
    };

    const handleCopyText = (content: string) => {
        if (!content) return;
        navigator.clipboard.writeText(content);
        dispatch(showToast({ message: t('common.copied_to_clipboard') }));
    };

    const handleCopyLink = (handle: string, postId: string) => {
        const postUrl = `${window.location.origin}/profile/${handle}/post/${postId}`;
        navigator.clipboard.writeText(postUrl);
        dispatch(showToast({ message: t('common.copied_to_clipboard') }));
    };

    const handleEmbedPost = (handle: string, postId: string, content: string) => {
        const postUrl = `${window.location.origin}/profile/${handle}/post/${postId}`;
        const embedText = content || "";
        const embedCode = `<blockquote class="bluesky-embed"><a href="${postUrl}">@${handle}</a><p>${embedText}</p></blockquote>`;
        navigator.clipboard.writeText(embedCode);
        dispatch(showToast({ message: t('post.embed_copied') }));
    };

    const openShareModal = (post: Post) => {
        console.log('EXECUTING openShareModal for post:', post.id);
        dispatch(openSharePost(post));
    };

    return {
        handleTranslate,
        handleCopyText,
        handleCopyLink,
        handleEmbedPost,
        openShareModal,
    };
};
