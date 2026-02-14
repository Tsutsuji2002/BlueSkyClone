import React, { useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import LoadingIndicator from '../components/common/LoadingIndicator';

import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchBookmarkedPosts } from '../redux/slices/postsSlice';
import PostCard from '../components/feed/PostCard';

const SavedPage: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { posts, isLoading } = useAppSelector((state) => state.posts);

    // Specifically filter posts that are bookmarked
    const savedPosts = posts.filter(post => post.isBookmarked);

    useEffect(() => {
        dispatch(fetchBookmarkedPosts());
    }, [dispatch]);

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

                {isLoading && savedPosts.length === 0 ? (
                    <LoadingIndicator text={t('common.loading')} />
                ) : savedPosts.length > 0 ? (
                    <div className="divide-y divide-gray-100 dark:divide-dark-border">
                        {savedPosts.map(post => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-gray-500">
                        {t('saved.no_saved')}
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default SavedPage;
