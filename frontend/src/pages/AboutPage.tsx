import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiBook, FiGlobe, FiSliders, FiTool, FiChevronRight } from 'react-icons/fi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const AboutPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const aboutItems = [
        { id: 'terms', label: t('about.terms'), icon: <FiBook size={20} />, link: '#' },
        { id: 'privacy', label: t('about.privacy'), icon: <FiBook size={20} />, link: '#' },
        { id: 'status', label: t('about.status'), icon: <FiGlobe size={20} />, link: '#' },
    ];

    const systemItems = [
        { id: 'system_log', label: t('about.system_log'), icon: <FiSliders size={20} />, link: '#' },
    ];

    useDocumentTitle(t('about.title'));

    return (
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
                        {t('about.title')}
                    </h1>
                </div>

                <div className="flex flex-col">
                    {aboutItems.map((item) => (
                        <a
                            key={item.id}
                            href={item.link}
                            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-100 dark:border-dark-border/50"
                        >
                            <div className="flex items-center gap-4 text-gray-900 dark:text-dark-text">
                                <span className="opacity-80">{item.icon}</span>
                                <span className="text-[15px] font-medium">{item.label}</span>
                            </div>
                            <FiChevronRight className="text-gray-300 dark:text-dark-text-secondary" />
                        </a>
                    ))}

                    <div className="h-px bg-gray-100 dark:bg-dark-border my-0" />

                    {systemItems.map((item) => (
                        <a
                            key={item.id}
                            href={item.link}
                            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-100 dark:border-dark-border/50"
                        >
                            <div className="flex items-center gap-4 text-gray-900 dark:text-dark-text">
                                <span className="opacity-80">{item.icon}</span>
                                <span className="text-[15px] font-medium">{item.label}</span>
                            </div>
                            <FiChevronRight className="text-gray-300 dark:text-dark-text-secondary" />
                        </a>
                    ))}

                    <div className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-dark-border/50">
                        <div className="flex items-center gap-4 text-gray-900 dark:text-dark-text">
                            <span className="opacity-80"><FiTool size={20} /></span>
                            <span className="text-[15px] font-medium">{t('about.version')} 1.112.0</span>
                        </div>
                        <span className="text-sm text-gray-400 dark:text-gray-500 font-mono">f43f3c6 (prod)</span>
                    </div>

                </div>
            </div>
    );
};

export default AboutPage;
