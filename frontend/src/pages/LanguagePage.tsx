import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useTranslation } from 'react-i18next';
import {
    setAppLanguage,
    setPrimaryLanguage,
    toggleContentLanguage
} from '../redux/slices/languageSlice';
import {
    FiArrowLeft, FiGlobe, FiType, FiCheck
} from 'react-icons/fi';
import { cn } from '../utils/classNames';

const LanguagePage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { appLanguage, primaryLanguage, contentLanguages } = useAppSelector((state) => state.language);

    const languages = [
        { code: 'vi', name: t('language.vi', { defaultValue: 'Tiếng Việt – Vietnamese' }) },
        { code: 'en', name: t('language.en', { defaultValue: 'English' }) },
        { code: 'ja', name: t('language.ja', { defaultValue: '日本語 – Japanese' }) },
        { code: 'zh', name: t('language.zh', { defaultValue: '简体中文 – Chinese (Simplified)' }) },
        { code: 'es', name: t('language.es', { defaultValue: 'Español – Spanish' }) },
        { code: 'fr', name: t('language.fr', { defaultValue: 'Français – French' }) },
        { code: 'de', name: t('language.de', { defaultValue: 'Deutsch – German' }) },
        { code: 'ko', name: t('language.ko', { defaultValue: '한국어 – Korean' }) },
    ];

    const contentLanguageOptions = [
        { code: 'vi', name: t('language.vi', { defaultValue: 'Tiếng Việt' }) },
        { code: 'en', name: t('language.en', { defaultValue: 'English' }) },
        { code: 'ja', name: t('language.ja', { defaultValue: '日本語' }) },
        { code: 'zh', name: t('language.zh', { defaultValue: '简体中文' }) },
        { code: 'es', name: t('language.es', { defaultValue: 'Español' }) },
        { code: 'fr', name: t('language.fr', { defaultValue: 'Français' }) },
        { code: 'de', name: t('language.de', { defaultValue: 'Deutsch' }) },
        { code: 'ko', name: t('language.ko', { defaultValue: '한국어' }) },
    ];

    return (
        <MainLayout>
            <div className="min-h-screen border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border p-4 flex items-center gap-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                    >
                        <FiArrowLeft size={20} className="dark:text-dark-text" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {t('language.title')}
                    </h1>
                </div>

                <div className="p-4 space-y-8">
                    {/* Ngôn ngữ ứng dụng */}
                    <section className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-[15px] font-bold text-gray-900 dark:text-dark-text">
                                {t('language.app_language')}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary leading-snug">
                                {t('language.app_language_desc')}
                            </p>
                        </div>
                        <div className="relative">
                            <select
                                value={appLanguage}
                                onChange={(e) => dispatch(setAppLanguage(e.target.value))}
                                className="w-full bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 text-[15px] font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all dark:text-dark-text"
                            >
                                {languages.map(lang => (
                                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <FiGlobe size={18} />
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-gray-100 dark:bg-dark-border" />

                    {/* Ngôn ngữ chính */}
                    <section className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-[15px] font-bold text-gray-900 dark:text-dark-text">
                                {t('language.primary_language')}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary leading-snug">
                                {t('language.primary_language_desc')}
                            </p>
                        </div>
                        <div className="relative">
                            <select
                                value={primaryLanguage}
                                onChange={(e) => dispatch(setPrimaryLanguage(e.target.value))}
                                className="w-full bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 text-[15px] font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all dark:text-dark-text"
                            >
                                {languages.map(lang => (
                                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <FiType size={18} />
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-gray-100 dark:bg-dark-border" />

                    {/* Ngôn ngữ nội dung */}
                    <section className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-[15px] font-bold text-gray-900 dark:text-dark-text">
                                {t('language.content_languages')}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary leading-snug">
                                {t('language.content_languages_desc')}
                            </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-dark-surface rounded-2xl overflow-hidden border border-gray-100 dark:border-dark-border">
                            {contentLanguageOptions.map((lang, index) => {
                                const isSelected = contentLanguages.includes(lang.code);
                                return (
                                    <button
                                        key={lang.code}
                                        onClick={() => dispatch(toggleContentLanguage(lang.code))}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-4 transition-colors",
                                            index !== contentLanguageOptions.length - 1 && "border-b border-gray-100 dark:border-dark-border/50",
                                            "hover:bg-gray-100/50 dark:hover:bg-dark-surface-hover"
                                        )}
                                    >
                                        <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">
                                            {lang.name}
                                        </span>
                                        {isSelected && (
                                            <FiCheck className="text-primary-500" size={20} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="px-4 py-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl flex items-center gap-3">
                            <FiCheck className="text-blue-500 flex-shrink-0" size={18} />
                            <span className="text-[14px] font-medium text-gray-700 dark:text-dark-text-secondary">
                                {contentLanguages.map(code => contentLanguageOptions.find(o => o.code === code)?.name).join(', ')}
                            </span>
                        </div>
                    </section>
                </div>
            </div>
        </MainLayout>
    );
};

export default LanguagePage;
