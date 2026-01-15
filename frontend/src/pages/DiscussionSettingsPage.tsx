import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiMessageSquare } from 'react-icons/fi';
import { cn } from '../utils/classNames';

const DiscussionSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [sortOrder, setSortOrder] = useState('top'); // top, oldest, newest
    const [treeView, setTreeView] = useState(false);

    const RadioItem = ({
        label,
        value,
        checked,
        onChange
    }: {
        label: string;
        value: string;
        checked: boolean;
        onChange: (val: string) => void;
    }) => (
        <button
            onClick={() => onChange(value)}
            className="w-full flex items-center gap-4 py-3 group"
        >
            <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                checked
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-200 dark:border-gray-700 group-hover:border-gray-300"
            )}>
                {checked && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
            </div>
            <span className={cn(
                "text-[15px] transition-colors",
                checked ? "text-gray-900 dark:text-dark-text font-medium" : "text-gray-600 dark:text-dark-text-secondary"
            )}>
                {label}
            </span>
        </button>
    );

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
                        {t('content.discussion_settings')}
                    </h1>
                </div>

                <div className="p-6">
                    {/* Sort Replies Section */}
                    <section className="mb-10">
                        <div className="flex items-center gap-3 mb-2">
                            <FiMessageSquare className="text-gray-500" size={20} />
                            <h2 className="font-bold text-gray-900 dark:text-dark-text text-[15px]">
                                {t('content.sort_replies')}
                            </h2>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-4">
                            {t('content.sort_replies_desc')}
                        </p>
                        <div className="flex flex-col">
                            <RadioItem
                                label={t('content.top_replies_first')}
                                value="top"
                                checked={sortOrder === 'top'}
                                onChange={setSortOrder}
                            />
                            <RadioItem
                                label={t('content.oldest_replies_first')}
                                value="oldest"
                                checked={sortOrder === 'oldest'}
                                onChange={setSortOrder}
                            />
                            <RadioItem
                                label={t('content.newest_replies_first')}
                                value="newest"
                                checked={sortOrder === 'newest'}
                                onChange={setSortOrder}
                            />
                        </div>
                    </section>

                    {/* Tree View Section */}
                    <section>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                                </svg>
                                <h2 className="font-bold text-gray-900 dark:text-dark-text text-[15px]">
                                    {t('content.tree_view')}
                                </h2>
                            </div>
                            <button
                                onClick={() => setTreeView(!treeView)}
                                className={cn(
                                    "w-11 h-6 rounded-full relative transition-colors duration-200 ease-in-out",
                                    treeView ? "bg-blue-500" : "bg-gray-200 dark:bg-dark-surface"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm",
                                    treeView ? "left-[22px]" : "left-0.5"
                                )} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-2 pl-8">
                            {t('content.tree_view_desc')}
                        </p>
                    </section>
                </div>
            </div>
        </MainLayout>
    );
};

export default DiscussionSettingsPage;
