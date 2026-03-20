import React, { useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import LoadingIndicator from '../components/common/LoadingIndicator';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchBookmarkedPosts } from '../redux/slices/postsSlice';
import PostCard from '../components/feed/PostCard';
import Feed from '../components/feed/Feed';
import { FiBookmark } from 'react-icons/fi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const SavedPage: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { bookmarkedPosts, bookmarkedLoading, hasMore, error } = useAppSelector((state) => state.posts);

    useEffect(() => {
        dispatch(fetchBookmarkedPosts({ skip: 0 }));
    }, [dispatch]);

    const handleLoadMore = () => {
        dispatch(fetchBookmarkedPosts({ skip: bookmarkedPosts.length }));
    };

    useDocumentTitle(t('saved.title'));

    return (
        <div className="min-h-screen border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg">
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
                    <div className="p-12 text-center text-red-500 flex flex-col items-center">
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl mb-4">
                            <p className="font-bold mb-2">{t('common.error_occurred', 'An error occurred')}</p>
                            <p className="text-sm opacity-80">{error}</p>
                        </div>
                        <button 
                            onClick={() => dispatch(fetchBookmarkedPosts({ skip: 0 }))}
                            className="text-primary-500 font-bold hover:underline"
                        >
                            {t('common.retry', 'Try again')}
                        </button>
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
                    <Feed 
                        posts={bookmarkedPosts} 
                        isLoading={bookmarkedLoading}
                        hasMore={hasMore}
                        onLoadMore={handleLoadMore}
                        emptyMessage={t('saved.no_bookmarks_desc', 'Posts you bookmark will appear here.')}
                    />
                )}
            </div>
        </div>
    );
};

export default SavedPage;
