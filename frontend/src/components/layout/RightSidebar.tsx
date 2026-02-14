import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch } from 'react-icons/fi';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';

import TrendingSection from './TrendingSection';
import SuggestedUsersSection from './SuggestedUsersSection';

const RightSidebar: React.FC = () => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');

    const { user } = useAppSelector((state: RootState) => state.auth);
    const supportLink = user
        ? `/support?email=${encodeURIComponent(`${user.username}@gmail.com`)}&username=${encodeURIComponent(user.handle)}`
        : '/support';

    return (
        <div className="h-screen sticky top-0 py-2 px-4 space-y-4 overflow-y-auto no-scrollbar">
            {/* Search Bar */}
            <div className="relative pt-1">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                <input
                    type="text"
                    placeholder={t('feeds.search_placeholder', { defaultValue: 'Tìm kiếm' })}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 text-[15px] rounded-xl bg-gray-100 dark:bg-dark-surface border-none text-gray-900 dark:text-dark-text placeholder-gray-500 dark:placeholder-dark-text-secondary focus:outline-none focus:ring-1 focus:ring-primary-500 transition-shadow"
                />
            </div>

            {/* Suggested Users / Onboarding */}
            <SuggestedUsersSection />

            {/* Trending Topics */}
            <TrendingSection />

            {/* Footer Links */}
            <div className="px-1 py-4">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-primary-500 font-medium">
                    <a href={supportLink} target="_blank" rel="noopener noreferrer" className="hover:underline">{t('sidebar.feedback', { defaultValue: 'Phản hồi' })}</a>
                    <span className="text-gray-300 dark:text-gray-700">·</span>
                    <button className="hover:underline">{t('sidebar.privacy', { defaultValue: 'Quyền riêng tư' })}</button>
                    <span className="text-gray-300 dark:text-gray-700">·</span>
                    <button className="hover:underline">{t('sidebar.terms', { defaultValue: 'Điều khoản' })}</button>
                    <span className="text-gray-300 dark:text-gray-700">·</span>
                    <button className="hover:underline">{t('sidebar.help', { defaultValue: 'Giúp đỡ' })}</button>
                </div>
            </div>
        </div>
    );
};

export default RightSidebar;
