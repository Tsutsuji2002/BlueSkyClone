import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import Feed from '../components/feed/Feed';
import { FiArrowLeft, FiHash, FiTrendingUp } from 'react-icons/fi';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchPostsByTag } from '../redux/slices/postsSlice';
import { RootState } from '../redux/store';
import LoadingIndicator from '../components/common/LoadingIndicator';

const TagPage: React.FC = () => {
    const { tag } = useParams<{ tag: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const { posts, isLoading, hasMore } = useAppSelector((state: RootState) => state.posts);
    const [offset, setOffset] = useState(0);
    const limit = 20;

    useEffect(() => {
        if (tag) {
            dispatch(fetchPostsByTag({ tag, limit, offset: 0 }));
            setOffset(0);
        }
    }, [dispatch, tag]);

    const handleLoadMore = () => {
        if (tag) {
            const nextOffset = offset + limit;
            dispatch(fetchPostsByTag({ tag, limit, offset: nextOffset }));
            setOffset(nextOffset);
        }
    };

    return (
        <MainLayout>
            <div className="min-h-screen bg-white dark:bg-dark-bg">
                {/* Header */}
                <div className="sticky top-0 z-30 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors flex-shrink-0"
                        >
                            <FiArrowLeft size={20} className="text-gray-900 dark:text-dark-text" />
                        </button>
                        <div className="flex flex-col min-w-0">
                            <h1 className="text-xl font-black text-gray-900 dark:text-dark-text truncate leading-tight flex items-center gap-2">
                                <span className="text-primary-500">#</span>{tag}
                            </h1>
                            <span className="text-[13px] text-gray-500 dark:text-dark-text-secondary font-medium">
                                {t('explore.trending_posts')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tag Info / Hero */}
                <div className="bg-gradient-to-b from-primary-50/30 to-white dark:from-primary-900/10 dark:to-dark-bg px-4 py-8 border-b border-gray-100 dark:border-dark-border text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-2xl mb-4">
                        <FiHash size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-dark-text mb-2">
                        #{tag}
                    </h2>
                    <p className="text-gray-500 dark:text-dark-text-secondary max-w-sm mx-auto flex items-center justify-center gap-2">
                        <FiTrendingUp size={16} />
                        {t('tag.exploring_tagged', { tag })}
                    </p>
                </div>

                {/* Posts Feed */}
                <div className="pb-20">
                    {isLoading && offset === 0 ? (
                        <div className="flex justify-center py-20">
                            <LoadingIndicator size="lg" />
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-dark-surface rounded-full flex items-center justify-center mb-6">
                                <FiHash className="text-gray-300" size={40} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2">
                                {t('feeds.no_posts')}
                            </h2>
                            <p className="text-gray-500 dark:text-dark-text-secondary">
                                {t('tag.no_posts_with_tag', { tag })}
                            </p>
                        </div>
                    ) : (
                        <>
                            <Feed posts={posts} />
                            {hasMore && posts.length >= limit && (
                                <button
                                    onClick={handleLoadMore}
                                    className="w-full py-4 text-primary-500 font-bold hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors disabled:opacity-50"
                                    disabled={isLoading}
                                >
                                    {isLoading ? t('common.loading') : t('common.load_more')}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default TagPage;
