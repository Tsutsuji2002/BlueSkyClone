import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiPlus, FiX, FiInfo, FiCamera, FiUsers } from 'react-icons/fi';
import { cn } from '../utils/classNames';

const ModerationListsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Modal State
    const [listName, setListName] = useState('');
    const [listDesc, setListDesc] = useState('');

    const handleCreate = () => {
        // Logic to create list would go here
        setIsModalOpen(false);
        setListName('');
        setListDesc('');
    };

    return (
        <MainLayout>
            {/* Main Page Content */}
            <div className="min-h-screen border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg relative">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border p-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                        >
                            <FiArrowLeft size={20} className="dark:text-dark-text" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                            {t('moderation.mod_lists_title')}
                        </h1>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-surface/80 rounded-full transition-colors font-medium text-sm text-gray-900 dark:text-dark-text"
                    >
                        <FiPlus size={16} />
                        {t('moderation.create_new')}
                    </button>
                </div>

                <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <div className="flex flex-col gap-1 items-center mb-6 text-gray-400">
                        <div className="w-8 h-2 bg-gray-300 rounded-full mb-1"></div>
                        <div className="w-8 h-2 bg-gray-300 rounded-full"></div>
                    </div>

                    <p className="text-gray-500 dark:text-dark-text-secondary max-w-xs mx-auto leading-relaxed">
                        {t('moderation.mod_lists_empty')}
                    </p>
                </div>
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-dark-surface w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-dark-border">
                            <button onClick={() => setIsModalOpen(false)} className="text-blue-500 font-medium hover:underline">
                                {t('moderation.cancel')}
                            </button>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
                                {t('moderation.create_list_title')}
                            </h3>
                            <button onClick={handleCreate} disabled={!listName.trim()} className="text-blue-500 font-bold hover:underline disabled:opacity-50">
                                {t('moderation.save')}
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-500 dark:text-dark-text-secondary mb-2">
                                    List avatar
                                </label>
                                <div className="w-24 h-24 bg-blue-500 rounded-xl flex flex-col items-center justify-center text-white relative group cursor-pointer overflow-hidden">
                                    <FiUsers size={40} className="mb-1" />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/20 p-1 flex justify-center">
                                        <FiCamera size={16} />
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-500 dark:text-dark-text-secondary mb-2">
                                    {t('moderation.list_name')}
                                </label>
                                <input
                                    type="text"
                                    value={listName}
                                    onChange={(e) => setListName(e.target.value)}
                                    placeholder={t('moderation.list_name_placeholder')}
                                    className="w-full p-4 bg-gray-100 dark:bg-dark-bg rounded-lg text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-500 dark:text-dark-text-secondary mb-2">
                                    {t('moderation.list_desc')}
                                </label>
                                <textarea
                                    value={listDesc}
                                    onChange={(e) => setListDesc(e.target.value)}
                                    placeholder={t('moderation.list_desc_placeholder')}
                                    rows={4}
                                    className="w-full p-4 bg-gray-100 dark:bg-dark-bg rounded-lg text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default ModerationListsPage;
