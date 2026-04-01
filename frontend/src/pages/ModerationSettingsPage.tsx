import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    FiArrowLeft,
    FiEdit,
    FiFilter,
    FiUsers,
    FiUserX,
    FiSlash,
    FiCheckCircle,
    FiChevronRight,
    FiShield,
    FiInfo
} from 'react-icons/fi';
import { cn } from '../utils/classNames';

const ModerationSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    // State for content filtering
    const [enableAdultContent, setEnableAdultContent] = useState(true);
    const [adultContent, setAdultContent] = useState('hide');
    const [sexuallyExplicit, setSexuallyExplicit] = useState('warn');
    const [graphicMedia, setGraphicMedia] = useState('warn');
    const [nonSexualNudity, setNonSexualNudity] = useState('show');

    const MenuLinkItem = ({
        icon,
        label,
        onClick
    }: {
        icon: React.ReactNode;
        label: string;
        onClick?: () => void;
    }) => (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-50 dark:border-dark-border/50"
        >
            <div className="flex items-center gap-4 text-gray-900 dark:text-dark-text">
                <span className="text-gray-500 dark:text-dark-text-secondary">{icon}</span>
                <span className="font-medium text-[15px]">{label}</span>
            </div>
            <FiChevronRight className="text-gray-400 dark:text-dark-text-secondary" />
        </button>
    );

    const FilterOption = ({
        title,
        description,
        value,
        onChange
    }: {
        title: string;
        description: string;
        value: string;
        onChange: (val: string) => void;
    }) => (
        <div className="p-4 border-b border-gray-50 dark:border-dark-border/50">
            <h3 className="font-bold text-gray-900 dark:text-dark-text text-[15px]">{title}</h3>
            <p className="text-gray-500 dark:text-dark-text-secondary text-sm mb-3">{description}</p>
            <div className="flex border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden">
                {[
                    { label: t('moderation.show'), val: 'show' },
                    { label: t('moderation.warn'), val: 'warn' },
                    { label: t('moderation.hide'), val: 'hide' }
                ].map((opt) => (
                    <button
                        key={opt.val}
                        onClick={() => onChange(opt.val)}
                        className={cn(
                            "flex-1 py-2 text-sm font-medium transition-colors border-r last:border-r-0 border-gray-200 dark:border-dark-border",
                            value === opt.val
                                ? "bg-gray-800 text-white dark:bg-white dark:text-black"
                                : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-dark-bg dark:text-dark-text-secondary dark:hover:bg-dark-surface"
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border p-4 flex items-center gap-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                >
                    <FiArrowLeft size={20} className="dark:text-dark-text" />
                </button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">{t('moderation.title')}</h1>
            </div>

            <div className="pb-20">
                {/* MODERATION TOOLS */}
                <section>
                    <h2 className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-dark-text mt-2 block">
                        {t('moderation.title')}
                    </h2>
                    <div className="flex flex-col">
                        <MenuLinkItem
                            icon={<FiEdit size={20} />}
                            label={t('moderation.interaction_settings')}
                            onClick={() => navigate('/settings/moderation/interaction')}
                        />
                        <MenuLinkItem
                            icon={<FiFilter size={20} />}
                            label={t('moderation.muted_words_tags')}
                            onClick={() => navigate('/settings/moderation/muted-words')}
                        />
                        <MenuLinkItem
                            icon={<FiUsers size={20} />}
                            label={t('moderation.moderation_lists')}
                            onClick={() => navigate('/settings/moderation/lists')}
                        />
                        <MenuLinkItem
                            icon={<FiUserX size={20} />}
                            label={t('moderation.muted_accounts')}
                            onClick={() => navigate('/settings/moderation/muted-accounts')}
                        />
                        <MenuLinkItem
                            icon={<FiSlash size={20} />}
                            label={t('moderation.blocked_accounts')}
                            onClick={() => navigate('/settings/moderation/blocked-accounts')}
                        />
                        <MenuLinkItem
                            icon={<FiCheckCircle size={20} />}
                            label={t('moderation.verification_settings')}
                            onClick={() => navigate('/settings/moderation/verification')}
                        />
                    </div>
                </section>

                {/* CONTENT FILTERING */}
                <section className="mt-6">
                    <h2 className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-dark-text block">
                        {t('moderation.content_filtering')}
                    </h2>

                    {/* 18+ Toggle */}
                    <div className="px-4 py-4 flex items-center justify-between border-b border-gray-50 dark:border-dark-border/50 bg-gray-50/50 dark:bg-dark-surface/10 mx-4 rounded-lg mb-2">
                        <span className="font-bold text-gray-900 dark:text-dark-text text-[15px]">{t('moderation.enable_18_plus')}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 font-medium">{enableAdultContent ? t('moderation.on') : ''}</span>
                            <button
                                onClick={() => setEnableAdultContent(!enableAdultContent)}
                                className={cn(
                                    "w-11 h-6 rounded-full relative transition-colors duration-200 ease-in-out dark:border dark:border-gray-500",
                                    enableAdultContent ? "bg-blue-500 border-blue-500" : "bg-gray-300 dark:bg-transparent"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 bg-white rounded-full absolute top-[1px] transition-transform duration-200 ease-in-out shadow-sm",
                                    enableAdultContent ? "left-[21px]" : "left-[1px]"
                                )} />
                            </button>
                        </div>
                    </div>

                    {/* Filter Options */}
                    <div className="flex flex-col">
                        <FilterOption
                            title={t('moderation.adult_content')}
                            description={t('moderation.adult_content_desc')}
                            value={adultContent}
                            onChange={setAdultContent}
                        />
                        <FilterOption
                            title={t('moderation.sexually_explicit')}
                            description={t('moderation.sexually_explicit_desc')}
                            value={sexuallyExplicit}
                            onChange={setSexuallyExplicit}
                        />
                        <FilterOption
                            title={t('moderation.graphic_media')}
                            description={t('moderation.graphic_media_desc')}
                            value={graphicMedia}
                            onChange={setGraphicMedia}
                        />
                        <FilterOption
                            title={t('moderation.non_sexual_nudity')}
                            description={t('moderation.non_sexual_nudity_desc')}
                            value={nonSexualNudity}
                            onChange={setNonSexualNudity}
                        />
                    </div>
                </section>

                {/* ADVANCED */}
                <section className="mt-6 px-4">
                    <h2 className="py-3 text-sm font-bold text-gray-900 dark:text-dark-text block">
                        {t('moderation.advanced')}
                    </h2>
                    <a
                        href="https://bsky.social/about/support/community-guidelines"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-dark-surface/30 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-surface/50 transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                            <FiShield size={20} fill="currentColor" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-900 dark:text-dark-text text-[15px]">
                                Bluesky Moderation Service
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                Official Bluesky moderation service.
                            </p>
                            <p className="text-xs text-gray-400 mt-1 truncate">
                                https://bsky.social/about/support/community-guidelines
                            </p>
                        </div>
                        <FiChevronRight className="text-gray-400" />
                    </a>
                </section>
            </div>
        </div>
    );
};

export default ModerationSettingsPage;
