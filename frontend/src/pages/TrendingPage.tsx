import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiMoreHorizontal, FiBookmark, FiHeart } from 'react-icons/fi';
import MainLayout from '../components/layout/MainLayout';
import PostCard from '../components/feed/PostCard';
import { useAppSelector } from '../hooks/useAppSelector';
import { RootState } from '../redux/store';
import IconButton from '../components/common/IconButton';

const TrendingPage: React.FC = () => {
    const { topic } = useParams<{ topic: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { topics: trendingTopics } = useAppSelector((state: RootState) => state.trending);
    const { posts: allPosts } = useAppSelector((state: RootState) => state.posts);

    const topicData = useMemo(() => {
        return trendingTopics.find(t => t.hashtag.replace('#', '') === topic);
    }, [topic, trendingTopics]);

    // In a real app, you would fetch posts based on the topic/hashtag
    // For now, we'll just show some sample posts that mention the topic (or all if none found)
    const filteredPosts = useMemo(() => {
        const posts = allPosts.filter(p => p.content.toLowerCase().includes((topic || '').toLowerCase()));
        return posts.length > 0 ? posts : allPosts.slice(0, 5);
    }, [topic, allPosts]);

    return (
        <MainLayout>
            <div className="min-h-screen bg-white dark:bg-dark-bg">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border p-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                            >
                                <FiArrowLeft size={22} className="dark:text-dark-text" />
                            </button>
                            <div className="flex flex-col">
                                <h1 className="text-xl font-black text-gray-900 dark:text-dark-text leading-tight">
                                    {topic || t('sidebar.trending_header')}
                                </h1>
                                <p className="text-[13px] text-gray-500 dark:text-dark-text-secondary">
                                    {t('sidebar.trending_handle', { defaultValue: '@trending.bsky.app' })} · <span className="inline-flex items-center gap-0.5"><FiHeart size={10} className="fill-current" /> 1</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <IconButton icon={<FiMoreHorizontal size={20} />} />
                            <IconButton icon={<FiBookmark size={20} />} />
                        </div>
                    </div>
                </div>

                {/* Posts List */}
                <div className="flex flex-col">
                    {filteredPosts.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </div>
            </div>
        </MainLayout>
    );
};

export default TrendingPage;
