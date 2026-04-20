import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiBell } from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { updateNotificationSettings } from '../redux/slices/authSlice';

const PostNotificationSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    
    // Map the post notification UI to defaultReplyRestriction as it has the same 3-states and was synced to PDS
    const settings = useAppSelector(state => state.auth.settings);
    const selectedOption = settings?.defaultReplyRestriction || 'anyone';

    const handleOptionChange = (option: 'anyone' | 'followers' | 'none') => {
        dispatch(updateNotificationSettings({ defaultReplyRestriction: option }));
    };

    return (
        <div className="min-h-screen bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border px-4 py-3 flex items-center gap-4">
                <button
                    onClick={() => navigate('/settings/privacy')}
                    className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                >
                    <FiArrowLeft size={20} className="dark:text-dark-text" />
                </button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                    {t('privacy.notify_posts', 'Allow others to be notified of your posts')}
                </h1>
            </div>

            <div className="p-4 flex flex-col gap-6">
                <div className="flex gap-3">
                    <FiBell className="text-gray-900 dark:text-dark-text mt-1 shrink-0" size={24} />
                    <p className="text-[14px] text-gray-600 dark:text-dark-text-secondary leading-relaxed font-medium">
                        {t('privacy.notify_posts_desc', 'This feature allows users to receive notifications when you make a post. Turn off this feature to discourage other users from receiving notifications when you make a post.')}
                    </p>
                </div>

                <div className="space-y-1">
                    <label className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-dark-surface/50 rounded-lg cursor-pointer">
                        <input
                            type="radio"
                            name="notification-privacy"
                            className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            checked={selectedOption === 'anyone'}
                            onChange={() => handleOptionChange('anyone')}
                        />
                        <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('privacy.anyone_follows', 'Anyone who follows me')}</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-dark-surface/50 rounded-lg cursor-pointer">
                        <input
                            type="radio"
                            name="notification-privacy"
                            className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            checked={selectedOption === 'followers'}
                            onChange={() => handleOptionChange('followers')}
                        />
                        <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('privacy.followers_i_follow', 'Only followers who I follow')}</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-dark-surface/50 rounded-lg cursor-pointer">
                        <input
                            type="radio"
                            name="notification-privacy"
                            className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            checked={selectedOption === 'none'}
                            onChange={() => handleOptionChange('none')}
                        />
                        <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('privacy.no_one', 'No one')}</span>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default PostNotificationSettingsPage;
