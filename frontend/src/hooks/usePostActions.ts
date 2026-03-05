import { useTranslation } from 'react-i18next';
import { useAppDispatch } from './useAppDispatch';
import { showToast } from '../redux/slices/toastSlice';
import { openSharePost } from '../redux/slices/modalsSlice';
import { Post } from '../types';
import { useAppSelector } from './useAppSelector';
import { RootState } from '../redux/store';
import { ALL_LANGUAGES } from '../constants/languages';

/**
 * Map our internal language codes to Google Translate's `tl` parameter codes.
 * Most codes match, but a few regional variants need mapping.
 */
const toGoogleTranslateLang = (code: string): string => {
    const mapping: Record<string, string> = {
        'zh-CN': 'zh-CN',
        'zh-TW': 'zh-TW',
        'zh-HK': 'zh-TW', // Cantonese – closest supported variant
        'pt-BR': 'pt',
        'pt-PT': 'pt',
        'en-GB': 'en',
    };
    return mapping[code] ?? code.split('-')[0];
};

export const usePostActions = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const primaryLanguage = useAppSelector((state: RootState) => state.language.primaryLanguage);

    // Friendly display name for the primary language
    const primaryLangMeta = ALL_LANGUAGES.find(l => l.code === primaryLanguage);
    const primaryLangName = primaryLangMeta?.nativeName || primaryLangMeta?.englishName || primaryLanguage;

    const handleTranslate = (content: string) => {
        if (!content) return;
        const targetLang = toGoogleTranslateLang(primaryLanguage || 'en');
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
        primaryLanguage,
        primaryLangName,
    };
};
