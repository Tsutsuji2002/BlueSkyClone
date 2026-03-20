import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useTranslation } from 'react-i18next';
import {
    setAppLanguage,
    setPrimaryLanguage,
    toggleContentLanguage,
    setContentLanguages
} from '../redux/slices/languageSlice';
import { updateNotificationSettings } from '../redux/slices/authSlice';
import {
    FiArrowLeft, FiPlus, FiX, FiCheck, FiChevronRight, FiSearch
} from 'react-icons/fi';
import { cn } from '../utils/classNames';
import { APP_LANGUAGES, ALL_LANGUAGES, LanguageMetadata } from '../constants/languages';
import LanguageSelectionModal from '../components/modals/LanguageSelectionModal';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const LanguagePage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t, i18n } = useTranslation();
    const { appLanguage, primaryLanguage, contentLanguages } = useAppSelector((state) => state.language);

    const [isAppLangOpen, setIsAppLangOpen] = useState(false);
    const [isPrimaryLangOpen, setIsPrimaryLangOpen] = useState(false);
    const [isContentModalOpen, setIsContentModalOpen] = useState(false);

    const handleAppLangChange = (code: string) => {
        dispatch(setAppLanguage(code));
        i18n.changeLanguage(code);
        dispatch(updateNotificationSettings({ appLanguage: code }));
        setIsAppLangOpen(false);
    };

    const handlePrimaryLangChange = (code: string) => {
        dispatch(setPrimaryLanguage(code));
        dispatch(updateNotificationSettings({ primaryLanguage: code }));
        setIsPrimaryLangOpen(false);
    };

    const getCurrentAppLang = () => APP_LANGUAGES.find(l => l.code === appLanguage) || APP_LANGUAGES[0];
    const getCurrentPrimaryLang = () => ALL_LANGUAGES.find(l => l.code === primaryLanguage) || { code: 'vi', nativeName: 'Tiếng Việt', englishName: 'Vietnamese' };

    useDocumentTitle(t('language.title'));

    return (
        <>
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
                    {/* App language */}
                    <section className="space-y-3">
                        <div className="space-y-1">
                            <h2 className="text-[15px] font-bold text-gray-900 dark:text-dark-text">
                                {t('language.app_language')}
                            </h2>
                            <p className="text-[14px] text-gray-500 dark:text-dark-text-secondary">
                                {t('language.app_language_desc')}
                            </p>
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setIsAppLangOpen(!isAppLangOpen)}
                                className="w-full flex items-center justify-between bg-gray-50 dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl px-4 py-3.5 text-[15px] font-medium transition-all hover:bg-gray-100/50 dark:hover:bg-dark-surface-hover"
                            >
                                <span className="dark:text-dark-text">
                                    {getCurrentAppLang().nativeName}
                                </span>
                                <FiChevronRight className={cn("text-gray-400 transition-transform", isAppLangOpen && "rotate-90")} size={18} />
                            </button>

                            {isAppLangOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl shadow-xl max-h-[400px] overflow-y-auto">
                                    {APP_LANGUAGES.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => handleAppLangChange(lang.code)}
                                            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-dark-surface-hover transition-colors border-b last:border-0 border-gray-100 dark:border-dark-border/50"
                                        >
                                            <div className="text-left">
                                                <div className="text-[15px] font-medium dark:text-dark-text">
                                                    {lang.nativeName} {lang.nativeName !== lang.englishName && `– ${lang.englishName}`}
                                                </div>
                                            </div>
                                            {appLanguage === lang.code && <FiCheck className="text-primary-500" size={18} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    <div className="h-px bg-gray-100 dark:bg-dark-border" />

                    {/* Primary language */}
                    <section className="space-y-3">
                        <div className="space-y-1">
                            <h2 className="text-[15px] font-bold text-gray-900 dark:text-dark-text">
                                {t('language.primary_language')}
                            </h2>
                            <p className="text-[14px] text-gray-500 dark:text-dark-text-secondary">
                                {t('language.primary_language_desc')}
                            </p>
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setIsPrimaryLangOpen(!isPrimaryLangOpen)}
                                className="w-full flex items-center justify-between bg-gray-50 dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl px-4 py-3.5 text-[15px] font-medium transition-all hover:bg-gray-100/50 dark:hover:bg-dark-surface-hover"
                            >
                                <span className="dark:text-dark-text">
                                    {getCurrentPrimaryLang().englishName}
                                </span>
                                <FiChevronRight className={cn("text-gray-400 transition-transform", isPrimaryLangOpen && "rotate-90")} size={18} />
                            </button>

                            {isPrimaryLangOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl shadow-xl max-h-[400px] overflow-y-auto">
                                    <div className="sticky top-0 bg-white dark:bg-dark-surface p-3 border-b border-gray-100 dark:border-dark-border/50">
                                        <div className="relative">
                                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Search languages..."
                                                className="w-full bg-gray-50 dark:bg-dark-bg border border-transparent rounded-lg pl-9 pr-4 py-2 text-sm dark:text-dark-text focus:outline-none"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                    {ALL_LANGUAGES.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => handlePrimaryLangChange(lang.code)}
                                            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-dark-surface-hover transition-colors border-b last:border-0 border-gray-100 dark:border-dark-border/50"
                                        >
                                            <span className="text-[15px] dark:text-dark-text">{lang.englishName}</span>
                                            {primaryLanguage === lang.code && <FiCheck className="text-primary-500" size={18} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    <div className="h-px bg-gray-100 dark:bg-dark-border" />

                    {/* Content languages */}
                    <section className="space-y-5">
                        <div className="space-y-1">
                            <h2 className="text-[15px] font-bold text-gray-900 dark:text-dark-text">
                                {t('language.content_languages')}
                            </h2>
                            <p className="text-[14px] text-gray-500 dark:text-dark-text-secondary">
                                {t('language.content_languages_desc')}
                            </p>
                        </div>

                        <div className="space-y-0.5">
                            {contentLanguages.map((code) => {
                                const lang = ALL_LANGUAGES.find(l => l.code === code);
                                if (!lang) return null;
                                return (
                                    <div
                                        key={code}
                                        className="flex items-center justify-between px-4 py-4 bg-primary-500/5 dark:bg-primary-500/10 border-b border-gray-100 dark:border-dark-border/30 first:rounded-t-2xl last:rounded-b-2xl last:border-0"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 bg-primary-500 rounded flex items-center justify-center">
                                                <FiCheck className="text-white" size={12} strokeWidth={4} />
                                            </div>
                                            <span className="text-[15px] font-bold dark:text-dark-text">{lang.englishName}</span>
                                        </div>
                                        <button
                                            onClick={() => dispatch(toggleContentLanguage(code))}
                                            className="p-1 hover:bg-gray-200 dark:hover:bg-dark-surface-hover rounded-full transition-colors"
                                        >
                                            <FiX className="text-gray-400" size={18} />
                                        </button>
                                    </div>
                                );
                            })}

                            <button
                                onClick={() => setIsContentModalOpen(true)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface-hover transition-colors text-primary-500 font-medium text-[15px]",
                                    contentLanguages.length === 0 ? "bg-gray-50 dark:bg-dark-surface rounded-2xl" : "border-t border-gray-100 dark:border-dark-border/30"
                                )}
                            >
                                <FiPlus size={20} />
                                {t('language.add_more', { defaultValue: 'Add more languages...' })}
                            </button>
                        </div>
                    </section>
            </div>
        </div>

        {isContentModalOpen && (
                <LanguageSelectionModal
                    onClose={() => setIsContentModalOpen(false)}
                    selectedCodes={contentLanguages}
                    onToggle={(code) => dispatch(toggleContentLanguage(code))}
                />
            )}
        </>
    );
};

export default LanguagePage;
