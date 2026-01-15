import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiChevronRight, FiShield, FiKey, FiBell, FiEye, FiCheck, FiX } from 'react-icons/fi';
import Button from '../components/common/Button';

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
    const [logoutVisibility, setLogoutVisibility] = useState(false);

    return (
        <MainLayout>
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
                            onClick={() => setIs2FAModalOpen(true)}
                            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-100 dark:border-dark-border/50"
                        >
                            <div className="flex items-center gap-4">
                                <FiShield size={22} className="text-gray-900 dark:text-dark-text opacity-80" />
                                <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('privacy.2fa_title')}</span>
                            </div>
                            <span className="text-blue-500 font-medium text-sm">{t('privacy.enable')}</span>
                        </button>

                        <button
                            onClick={() => navigate('/settings/privacy/app-passwords')}
                            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-100 dark:border-dark-border/50"
                        >
                            <div className="flex items-center gap-4">
                                <FiKey size={22} className="text-gray-900 dark:text-dark-text opacity-80" />
                                <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('privacy.app_passwords')}</span>
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
                                    <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('privacy.notify_posts')}</span>
                                    <span className="text-sm text-gray-500 dark:text-dark-text-secondary">{t('privacy.notify_posts_subtitle')}</span>
                                </div>
                            </div>
                            <FiChevronRight className="text-gray-300 dark:text-dark-text-secondary" />
                        </button>
                    </div>

                    {/* Visibility Group */}
                    <div className="mt-4 px-4">
                        <div className="flex items-start gap-4 mb-2">
                            <FiEye size={22} className="text-gray-900 dark:text-dark-text opacity-80 mt-1" />
                            <div>
                                <h3 className="text-[15px] font-medium text-gray-900 dark:text-dark-text mb-1">
                                    {t('privacy.logout_visibility')}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-3 leading-relaxed">
                                    {t('privacy.logout_visibility_desc')}
                                </p>
                            </div>
                            <div className="relative inline-flex items-center cursor-pointer ml-auto">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={logoutVisibility}
                                    onChange={() => setLogoutVisibility(!logoutVisibility)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                            <p className="text-sm text-blue-700 dark:text-blue-300 flex gap-2">
                                <span className="font-bold">ⓘ</span>
                                {t('privacy.logout_visibility_note')}
                            </p>
                            <button className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline mt-1 ml-6">
                                {t('privacy.learn_more')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Enable2FAModal isOpen={is2FAModalOpen} onClose={() => setIs2FAModalOpen(false)} />
        </MainLayout>
    );
};

export default PrivacySettingsPage;
