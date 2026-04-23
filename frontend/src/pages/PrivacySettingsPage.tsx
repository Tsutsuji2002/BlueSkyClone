import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiChevronRight, FiShield, FiKey, FiBell, FiEyeOff, FiX } from 'react-icons/fi';
import Button from '../components/common/Button';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { updateNotificationSettings } from '../redux/slices/authSlice';
import { RootState } from '../redux/store';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const Enable2FAModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold dark:text-dark-text">{t('privacy.2fa_modal_title')}</h2>
                    <button onClick={onClose}><FiX size={24} className="text-gray-500" /></button>
                </div>
                <p className="text-gray-600 dark:text-dark-text-secondary mb-8 text-[15px] leading-relaxed">
                    {t('privacy.2fa_modal_desc')}
                </p>
                <div className="flex gap-3">
                    <Button variant="ghost" fullWidth onClick={onClose} className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {t('settings.cancel')}
                    </Button>
                    <Button variant="primary" fullWidth onClick={onClose}>
                        {t('privacy.enable')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const PrivacySettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);

    const dispatch = useAppDispatch();
    const settings = useAppSelector((state: RootState) => state.auth.settings);

    const handleToggle = (key: string, value: boolean) => {
        dispatch(updateNotificationSettings({ [key]: value }));
    };

    useDocumentTitle(t('privacy.title'));

    return (
        <>
            <div className="min-h-screen bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border px-4 py-3 flex items-center gap-4">
                    <button
                        onClick={() => navigate('/settings')}
                        className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                    >
                        <FiArrowLeft size={20} className="dark:text-dark-text" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {t('privacy.title')}
                    </h1>
                </div>

                {/* Content */}
                <div className="flex flex-col">
                    {/* Security Group */}
                    <div className="py-2">
                        <button
                            disabled
                            className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-dark-border/50 opacity-50 cursor-not-allowed"
                        >
                            <div className="flex items-center gap-4">
                                <FiShield size={22} className="text-gray-900 dark:text-dark-text opacity-80" />
                                <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('privacy.2fa_title', 'Two-factor authentication (2FA)')}</span>
                            </div>
                            <span className="text-blue-500 font-medium text-sm">{t('privacy.enable', 'Enable')}</span>
                        </button>

                        <button
                            disabled
                            className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-dark-border/50 opacity-50 cursor-not-allowed"
                        >
                            <div className="flex items-center gap-4">
                                <FiKey size={22} className="text-gray-900 dark:text-dark-text opacity-80" />
                                <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('privacy.app_passwords', 'App passwords')}</span>
                            </div>
                            <FiChevronRight className="text-gray-300 dark:text-dark-text-secondary" />
                        </button>

                        <button
                            onClick={() => navigate('/settings/privacy/post-notifications')}
                            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-100 dark:border-dark-border/50"
                        >
                            <div className="flex items-center gap-4">
                                <FiBell size={22} className="text-gray-900 dark:text-dark-text opacity-80" />
                                <div className="flex flex-col items-start text-left">
                                    <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('privacy.notify_posts', 'Allow others to be notified of your posts')}</span>
                                    <span className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                        {settings?.defaultReplyRestriction === 'followers' 
                                            ? t('privacy.followers_i_follow', 'Only followers who I follow')
                                            : settings?.defaultReplyRestriction === 'none'
                                                ? t('privacy.no_one', 'No one')
                                                : t('privacy.anyone_follows', 'Anyone who follows me')}
                                    </span>
                                </div>
                            </div>
                            <FiChevronRight className="text-gray-300 dark:text-dark-text-secondary" />
                        </button>
                    </div>

                    {/* Visibility Group */}
                    <div className="mt-4 px-4 pb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <FiEyeOff size={22} className="text-gray-900 dark:text-dark-text opacity-80" />
                            <h3 className="text-[17px] font-bold text-gray-900 dark:text-dark-text">
                                {t('privacy.logout_visibility', 'Logged-out visibility')}
                            </h3>
                        </div>
                        
                        <div className="flex items-start justify-between gap-4 mb-2">
                            <h4 className="text-[15px] font-bold text-gray-900 dark:text-dark-text">
                                {t('privacy.logout_visibility_label', 'Discourage apps from showing my account to logged-out users')}
                            </h4>
                            <label className="relative inline-flex items-center cursor-pointer ml-auto shrink-0 mt-0.5">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings?.logoutVisibility ?? false}
                                    onChange={() => handleToggle('logoutVisibility', !settings?.logoutVisibility)}
                                />
                                <div className="w-5 h-5 bg-white border-2 border-gray-300 rounded peer-focus:ring-2 peer-focus:ring-blue-500 dark:bg-dark-bg dark:border-gray-500 peer-checked:bg-blue-500 peer-checked:border-blue-500 after:content-['\\2713'] after:absolute after:text-white after:text-xs after:font-bold after:left-[4px] after:top-[1px] after:opacity-0 peer-checked:after:opacity-100 transition-all"></div>
                            </label>
                        </div>

                        <p className="text-[14px] text-gray-500 dark:text-dark-text-secondary mb-4 leading-relaxed">
                            {t('privacy.logout_visibility_desc', 'Bluesky will not show your profile and posts to logged-out users. Other apps may not honor this request. This does not make your account private.')}
                        </p>

                        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl">
                            <div className="flex gap-3">
                                <span className="text-blue-500 mt-0.5 text-lg">ⓘ</span>
                                <div className="flex flex-col gap-1">
                                    <p className="text-[14px] text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                        <span className="font-bold">{t('settings.note', 'Note')}:</span> {t('privacy.logout_visibility_note', 'Bluesky is an open and public network. This setting only limits the visibility of your content on the BlueSky app and website, and other apps may not respect this setting. Your content may still be shown to logged-out users by other apps and websites.')}
                                    </p>
                                    <a href="#" className="text-blue-500 hover:underline text-[14px] font-medium inline-block transition-colors">
                                        {t('privacy.learn_more', 'Learn more about what is public on BlueSky.')}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Enable2FAModal isOpen={is2FAModalOpen} onClose={() => setIs2FAModalOpen(false)} />
        </>
    );
};

export default PrivacySettingsPage;
