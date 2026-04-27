import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../redux/store';
import { updateNotificationSettings } from '../redux/slices/authSlice';
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
    FiInfo,
    FiLock
} from 'react-icons/fi';
import api from '../utils/api';
import { cn } from '../utils/classNames';

const ModerationSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const dispatch = useDispatch<AppDispatch>();
    const settings = useSelector((state: RootState) => state.auth.settings);

    // Derived values from Redux state
    const enableAdultContent = settings?.enableAdultContent ?? false;
    const adultContent = settings?.adultContentFilter ?? 'show';
    const sexuallyExplicit = settings?.sexuallyExplicitFilter ?? 'warn';
    const graphicMedia = settings?.graphicMediaFilter ?? 'warn';
    const nonSexualNudity = settings?.nonSexualNudityFilter ?? 'show';

    const [counts, setCounts] = React.useState({
        mutes: 0,
        blocks: 0,
        lists: 0,
        mutedWords: 0
    });
    const [loadingCounts, setLoadingCounts] = React.useState(true);

    const handleUpdate = (update: any) => {
        dispatch(updateNotificationSettings(update));
    };

    const fetchCounts = async () => {
        try {
            setLoadingCounts(true);
            const [mutesRes, blocksRes, listsRes, wordsRes] = await Promise.all([
                api.get('/xrpc/app.bsky.graph.getMutes?limit=1'),
                api.get('/xrpc/app.bsky.graph.getBlocks?limit=1'),
                api.get('/Lists/my?purpose=app.bsky.graph.defs%23modlist'),
                api.get('/users/muted-words')
            ]);

            setCounts({
                mutes: (mutesRes.data as any).mutes?.length || 0,
                blocks: (blocksRes.data as any).blocks?.length || 0,
                lists: (listsRes.data as any).length || 0,
                mutedWords: (wordsRes.data as any).length || 0
            });
        } catch (error) {
            console.error('Failed to fetch moderation counts:', error);
        } finally {
            setLoadingCounts(false);
        }
    };

    React.useEffect(() => {
        fetchCounts();
    }, []);

    const MenuLinkItem = ({
        icon,
        label,
        count,
        onClick
    }: {
        icon: React.ReactNode;
        label: string;
        count?: number | string;
        onClick?: () => void;
    }) => (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-dark-surface/30 transition-all duration-200 border-b border-gray-50 dark:border-dark-border/30 group"
        >
            <div className="flex items-center gap-4 text-gray-900 dark:text-dark-text">
                <span className="flex items-center justify-center w-6 h-6">{icon}</span>
                <span className="font-semibold text-[16px]">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                {count !== undefined && !loadingCounts && (
                    <span className="text-[15px] font-medium text-gray-500 dark:text-dark-text-secondary mr-1">
                        {count}
                    </span>
                )}
                <FiChevronRight className="text-gray-300 dark:text-dark-border group-hover:text-gray-400 dark:group-hover:text-dark-text-secondary transition-colors" size={20} />
            </div>
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
                    <h2 className="px-4 py-3 text-[13px] font-bold text-gray-500 dark:text-dark-text-secondary mt-2 block uppercase tracking-wider">
                        {t('moderation.title')}
                    </h2>
                    <div className="flex flex-col">
                        <MenuLinkItem
                            icon={<FiEdit size={22} className="text-blue-500" />}
                            label={t('moderation.interaction_settings')}
                            onClick={() => navigate('/settings/moderation/interaction')}
                        />
                        <MenuLinkItem
                            icon={<FiFilter size={22} className="text-blue-500" />}
                            label={t('moderation.muted_words_tags')}
                            count={counts.mutedWords > 0 ? counts.mutedWords : undefined}
                            onClick={() => navigate('/settings/moderation/muted-words')}
                        />
                        <MenuLinkItem
                            icon={<FiUsers size={22} className="text-blue-500" />}
                            label={t('moderation.moderation_lists')}
                            count={counts.lists > 0 ? counts.lists : undefined}
                            onClick={() => navigate('/settings/moderation/lists')}
                        />
                        <MenuLinkItem
                            icon={<FiUserX size={22} className="text-blue-500" />}
                            label={t('moderation.muted_accounts')}
                            count={counts.mutes > 0 ? `${counts.mutes}` : undefined}
                            onClick={() => navigate('/settings/moderation/muted-accounts')}
                        />
                        <MenuLinkItem
                            icon={<FiSlash size={22} className="text-blue-500" />}
                            label={t('moderation.blocked_accounts')}
                            count={counts.blocks > 0 ? `${counts.blocks}` : undefined}
                            onClick={() => navigate('/settings/moderation/blocked-accounts')}
                        />
                        <MenuLinkItem
                            icon={<FiCheckCircle size={22} className="text-blue-500" />}
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
                                onClick={() => handleUpdate({ enableAdultContent: !enableAdultContent })}
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
                    {enableAdultContent && (
                        <div className="flex flex-col">
                            <FilterOption
                                title={t('moderation.adult_content')}
                                description={t('moderation.adult_content_desc')}
                                value={adultContent}
                                onChange={(val) => handleUpdate({ adultContentFilter: val })}
                            />
                            <FilterOption
                                title={t('moderation.sexually_explicit')}
                                description={t('moderation.sexually_explicit_desc')}
                                value={sexuallyExplicit}
                                onChange={(val) => handleUpdate({ sexuallyExplicitFilter: val })}
                            />
                            <FilterOption
                                title={t('moderation.graphic_media')}
                                description={t('moderation.graphic_media_desc')}
                                value={graphicMedia}
                                onChange={(val) => handleUpdate({ graphicMediaFilter: val })}
                            />
                            <FilterOption
                                title={t('moderation.non_sexual_nudity')}
                                description={t('moderation.non_sexual_nudity_desc')}
                                value={nonSexualNudity}
                                onChange={(val) => handleUpdate({ nonSexualNudityFilter: val })}
                            />
                        </div>
                    )}
                </section>

                {/* ADVANCED */}
                {enableAdultContent && (
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
                                    {t('moderation.bsky_moderation_service')}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                    {t('moderation.bsky_moderation_service_desc')}
                                </p>
                                <p className="text-xs text-gray-400 mt-1 truncate">
                                    https://bsky.social/about/support/community-guidelines
                                </p>
                            </div>
                            <FiChevronRight className="text-gray-400" />
                        </a>
                    </section>
                )}
            </div>
        </div>
    );
};

export default ModerationSettingsPage;
