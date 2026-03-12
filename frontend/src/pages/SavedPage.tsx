import React, { useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import LoadingIndicator from '../components/common/LoadingIndicator';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchBookmarkedPosts } from '../redux/slices/postsSlice';
import PostCard from '../components/feed/PostCard';
import { FiBookmark } from 'react-icons/fi';

const SavedPage: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { bookmarkedPosts, bookmarkedLoading, error } = useAppSelector((state) => state.posts);

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

                {bookmarkedLoading && bookmarkedPosts.length === 0 ? (
                    <LoadingIndicator text={t('common.loading')} />
                ) : error ? (
                    <div className="p-8 text-center text-red-500">
                        <p>{error}</p>
                    </div>
                ) : bookmarkedPosts.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <div className="mb-4 flex justify-center">
                            <FiBookmark size={48} className="text-gray-300" />
                        </div>
                        <p className="text-lg font-bold mb-2">{t('saved.no_bookmarks', 'No bookmarks yet')}</p>
                        <p>{t('saved.no_bookmarks_desc', 'Posts you bookmark will appear here.')}</p>
                    </div>
                ) : (
                    <div>
                        {bookmarkedPosts.map((post) => (
                            <PostCard key={post.uri} post={post} />
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default SavedPage;
