import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import LoadingIndicator from '../components/common/LoadingIndicator';
import { useAppSelector } from '../hooks/useAppSelector';

const SavedPage: React.FC = () => {
    const { t } = useTranslation();
    const { isLoading } = useAppSelector((state) => state.posts);

    return (
        <MainLayout title={t('saved.title')}>
            <div className="min-h-screen border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg">
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-sm border-b border-gray-200 dark:border-dark-border">
                    <div className="p-4">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                            {t('saved.title')}
                        </h1>
                    </div>
                </div>

                {isLoading ? (
                    <LoadingIndicator text={t('common.loading')} />
                ) : (
                    <div className="p-12 text-center text-gray-500">
                        <p className="text-lg font-bold mb-2">{t('saved.title')}</p>
                        <p>{t('common.coming_soon', 'Bookmarks are coming soon to AT Protocol!')}</p>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default SavedPage;
