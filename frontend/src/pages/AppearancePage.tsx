import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { setColorMode, setDarkVariant, setFontFamily, setFontSize } from '../redux/slices/themeSlice';
import { updateNotificationSettings } from '../redux/slices/authSlice';
import { setAppLanguage } from '../redux/slices/languageSlice';
import { useTranslation } from 'react-i18next';
import {
    FiArrowLeft, FiTablet, FiMoon, FiType, FiMaximize2, FiGlobe,
    FiPlay, FiTrendingUp, FiVideo, FiMessageSquare, FiInfo, FiChevronRight, FiList,
    FiRepeat, FiActivity
} from 'react-icons/fi';
import { cn } from '../utils/classNames';

const AppearancePage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t, i18n } = useTranslation();
    const { colorMode, darkVariant, fontFamily, fontSize } = useAppSelector((state) => state.theme);
    const { settings } = useAppSelector((state) => state.auth);
    const { appLanguage } = useAppSelector((state) => state.language);

    const handleColorModeChange = (val: string) => {
        dispatch(setColorMode(val as any));
        dispatch(updateNotificationSettings({ themeMode: val as any }));
    };

    const handleFontSizeChange = (val: 'sm' | 'md' | 'lg') => {
        dispatch(setFontSize(val));
        const numericSize = val === 'sm' ? 14 : val === 'md' ? 16 : 18;
        dispatch(updateNotificationSettings({ fontSize: numericSize }));
    };

    const handleLanguageChange = (val: string) => {
        dispatch(setAppLanguage(val));
        dispatch(updateNotificationSettings({ appLanguage: val }));
        i18n.changeLanguage(val);
    };

    const handleSettingToggle = (field: string, currentVal: boolean) => {
        dispatch(updateNotificationSettings({ [field]: !currentVal }));
    };

    const SegmentedControl = ({
        options,
        value,
        onChange
    }: {
        options: { label: string; value: string }[],
        value: string,
        onChange: (val: any) => void
    }) => (
        <div className="flex bg-gray-100 dark:bg-dark-surface p-1 rounded-xl w-full">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={cn(
                        "flex-1 py-2 text-[13px] font-bold rounded-lg transition-all",
                        value === opt.value
                            ? "bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text shadow-sm"
                            : "text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text"
                    )}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );

    const Switch = ({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) => (
        <button
            onClick={() => onChange(!checked)}
            className={cn(
                "w-11 h-6 rounded-full transition-colors relative",
                checked ? "bg-primary-500" : "bg-gray-300 dark:bg-dark-surface"
            )}
        >
            <div className={cn(
                "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm",
                checked ? "translate-x-5" : "translate-x-0"
            )} />
        </button>
    );

    const languages = [
        { code: 'vi', name: t('language.vi', { defaultValue: 'Tiếng Việt' }) },
        { code: 'en', name: t('language.en', { defaultValue: 'English' }) },
        { code: 'ja', name: t('language.ja', { defaultValue: 'Japanese' }) },
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
                        {t('appearance.title')}
                    </h1>
                </div>

                <div className="pb-20">
                    {/* Theme Section */}
                    <div className="px-5 py-4">
                        <h2 className="text-xs font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider mb-4">
                            {t('appearance.theme_title', 'Theme')}
                        </h2>

                        <section className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-gray-900 dark:text-dark-text font-bold text-[15px]">
                                    <FiTablet size={18} className="text-primary-500" />
                                    <span>{t('appearance.color_mode')}</span>
                                </div>
                                <SegmentedControl
                                    options={[
                                        { label: t('appearance.system'), value: 'system' },
                                        { label: t('appearance.light'), value: 'light' },
                                        { label: t('appearance.dark'), value: 'dark' },
                                    ]}
                                    value={colorMode}
                                    onChange={handleColorModeChange}
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-gray-900 dark:text-dark-text font-bold text-[15px]">
                                    <FiMoon size={18} className="text-primary-500" />
                                    <span>{t('appearance.dark_variant')}</span>
                                </div>
                                <SegmentedControl
                                    options={[
                                        { label: t('appearance.dim'), value: 'dim' },
                                        { label: t('appearance.dark'), value: 'dark' },
                                    ]}
                                    value={darkVariant}
                                    onChange={(val) => {
                                        dispatch(setDarkVariant(val));
                                        // In many apps this is purely local/theme based, but can be synced
                                    }}
                                />
                            </div>
                        </section>
                    </div>

                    <div className="h-[1px] bg-gray-100 dark:bg-dark-border mx-5" />

                    {/* Typography Section */}
                    <div className="px-5 py-4">
                        <h2 className="text-xs font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider mb-4">
                            {t('appearance.typography_title', 'Typography')}
                        </h2>

                        <section className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-gray-900 dark:text-dark-text font-bold text-[15px]">
                                    <FiType size={18} className="text-primary-500" />
                                    <span>{t('appearance.font_family')}</span>
                                </div>
                                <SegmentedControl
                                    options={[
                                        { label: t('appearance.system'), value: 'system' },
                                        { label: t('appearance.ui_font'), value: 'ui' },
                                    ]}
                                    value={fontFamily}
                                    onChange={(val) => dispatch(setFontFamily(val))}
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-gray-900 dark:text-dark-text font-bold text-[15px]">
                                    <FiMaximize2 size={18} className="text-primary-500" />
                                    <span>{t('appearance.font_size')}</span>
                                </div>
                                <SegmentedControl
                                    options={[
                                        { label: t('appearance.smaller'), value: 'sm' },
                                        { label: t('appearance.default'), value: 'md' },
                                        { label: t('appearance.larger'), value: 'lg' },
                                    ]}
                                    value={fontSize}
                                    onChange={handleFontSizeChange}
                                />
                            </div>
                        </section>
                    </div>

                    <div className="h-[1px] bg-gray-100 dark:bg-dark-border mx-5" />

                    {/* Localization Section */}
                    <div className="px-5 py-4">
                        <h2 className="text-xs font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider mb-4">
                            {t('language.title')}
                        </h2>

                        <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-3">
                                <FiGlobe size={20} className="text-primary-500" />
                                <div className="flex flex-col">
                                    <span className="text-[15px] font-bold text-gray-900 dark:text-dark-text">{t('language.app_language')}</span>
                                    <span className="text-[13px] text-gray-500 dark:text-dark-text-secondary">{t('language.app_language_desc')}</span>
                                </div>
                            </div>
                            <div className="relative">
                                <select
                                    value={appLanguage}
                                    onChange={(e) => handleLanguageChange(e.target.value)}
                                    className="bg-transparent text-[15px] font-semibold text-primary-500 appearance-none pr-6 outline-none cursor-pointer"
                                >
                                    {languages.map(l => (
                                        <option key={l.code} value={l.code} className="dark:bg-dark-surface dark:text-dark-text">{l.name}</option>
                                    ))}
                                </select>
                                <FiChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-primary-500" size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="h-[1px] bg-gray-100 dark:bg-dark-border mx-5" />

                    {/* Replies & Layout Section */}
                    <div className="px-5 py-4">
                        <h2 className="text-xs font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider mb-4">
                            {t('content.discussion_settings', 'Discussion & Layout')}
                        </h2>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FiMessageSquare size={20} className="text-primary-500" />
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-bold text-gray-900 dark:text-dark-text">{t('content.tree_view')}</span>
                                        <span className="text-[13px] text-gray-500 dark:text-dark-text-secondary">{t('content.tree_view_desc')}</span>
                                    </div>
                                </div>
                                <Switch
                                    checked={!!settings?.treeView}
                                    onChange={() => handleSettingToggle('treeView', !!settings?.treeView)}
                                />
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex items-center gap-3 text-gray-900 dark:text-dark-text font-bold text-[15px]">
                                    <FiList size={20} className="text-primary-500" />
                                    <span>{t('content.sort_replies')}</span>
                                </div>
                                <SegmentedControl
                                    options={[
                                        { label: t('content.top_replies_first'), value: 'top' },
                                        { label: t('content.newest_replies_first'), value: 'newest' },
                                        { label: t('content.oldest_replies_first'), value: 'oldest' },
                                    ]}
                                    value={settings?.sortReplies || 'top'}
                                    onChange={(val) => dispatch(updateNotificationSettings({ sortReplies: val }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-[1px] bg-gray-100 dark:bg-dark-border mx-5" />

                    {/* Content Section */}
                    <div className="px-5 py-4">
                        <h2 className="text-xs font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider mb-4">
                            {t('content.title', 'Content & Media')}
                        </h2>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 pr-4">
                                    <FiPlay size={20} className="text-primary-500" />
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-bold text-gray-900 dark:text-dark-text">{t('content.autoplay_video_gif')}</span>
                                    </div>
                                </div>
                                <Switch
                                    checked={!!settings?.autoplayVideoGif}
                                    onChange={() => handleSettingToggle('autoplayVideoGif', !!settings?.autoplayVideoGif)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 pr-4">
                                    <FiTrendingUp size={20} className="text-primary-500" />
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-bold text-gray-900 dark:text-dark-text">{t('content.open_trending_topics')}</span>
                                    </div>
                                </div>
                                <Switch
                                    checked={!!settings?.openTrendingTopics}
                                    onChange={() => handleSettingToggle('openTrendingTopics', !!settings?.openTrendingTopics)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 pr-4">
                                    <FiVideo size={20} className="text-primary-500" />
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-bold text-gray-900 dark:text-dark-text">{t('content.enable_video_discover')}</span>
                                    </div>
                                </div>
                                <Switch
                                    checked={!!settings?.enableVideoDiscover}
                                    onChange={() => handleSettingToggle('enableVideoDiscover', !!settings?.enableVideoDiscover)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-[1px] bg-gray-100 dark:bg-dark-border mx-5" />

                    {/* Following Feed Section */}
                    <div className="px-5 py-4">
                        <h2 className="text-xs font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider mb-4">
                            {t('content.following_feed_settings', 'Following Feed')}
                        </h2>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FiMessageSquare size={20} className="text-primary-500" />
                                    <span className="text-[15px] font-bold text-gray-900 dark:text-dark-text">{t('content.show_replies')}</span>
                                </div>
                                <Switch
                                    checked={!!settings?.showReplies}
                                    onChange={() => handleSettingToggle('showReplies', !!settings?.showReplies)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FiRepeat size={20} className="text-primary-500" />
                                    <span className="text-[15px] font-bold text-gray-900 dark:text-dark-text">{t('content.show_reposts')}</span>
                                </div>
                                <Switch
                                    checked={!!settings?.showReposts}
                                    onChange={() => handleSettingToggle('showReposts', !!settings?.showReposts)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FiMessageSquare size={20} className="text-primary-500" />
                                    <span className="text-[15px] font-bold text-gray-900 dark:text-dark-text">{t('content.show_quote_posts')}</span>
                                </div>
                                <Switch
                                    checked={!!settings?.showQuotePosts}
                                    onChange={() => handleSettingToggle('showQuotePosts', !!settings?.showQuotePosts)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 pr-4">
                                    <FiActivity size={20} className="text-primary-500" />
                                    <div className="flex flex-col">
                                        <span className="text-[15px] font-bold text-gray-900 dark:text-dark-text">
                                            {t('content.show_sample_saved_feeds')}
                                        </span>
                                        <span className="text-[12px] text-primary-500 font-bold uppercase tracking-tight">
                                            {t('content.experimental')}
                                        </span>
                                    </div>
                                </div>
                                <Switch
                                    checked={!!settings?.showSampleSavedFeeds}
                                    onChange={() => handleSettingToggle('showSampleSavedFeeds', !!settings?.showSampleSavedFeeds)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-[1px] bg-gray-100 dark:bg-dark-border mx-5" />

                    {/* Accessibility Section */}
                    <div className="px-5 py-4">
                        <h2 className="text-xs font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider mb-4">
                            {t('accessibility.title')}
                        </h2>

                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <FiInfo size={20} className="text-primary-500" />
                                <div className="flex flex-col">
                                    <span className="text-[15px] font-bold text-gray-900 dark:text-dark-text">{t('accessibility.require_alt_text')}</span>
                                </div>
                            </div>
                            <Switch
                                checked={!!settings?.requireAltText}
                                onChange={() => handleSettingToggle('requireAltText', !!settings?.requireAltText)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FiInfo size={20} className="text-primary-500" />
                                <div className="flex flex-col">
                                    <span className="text-[15px] font-bold text-gray-900 dark:text-dark-text">{t('accessibility.larger_alt_badge')}</span>
                                </div>
                            </div>
                            <Switch
                                checked={!!settings?.largerAltBadge}
                                onChange={() => handleSettingToggle('largerAltBadge', !!settings?.largerAltBadge)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default AppearancePage;

