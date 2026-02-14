import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Feed } from '../types';
import { FiArrowLeft, FiArrowUp, FiArrowDown, FiAnchor, FiInfo } from 'react-icons/fi';
import FeedAvatar from '../components/common/FeedAvatar';
import { cn } from '../utils/classNames';
import Button from '../components/common/Button';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { RootState } from '../redux/store';
import { showToast } from '../redux/slices/toastSlice';
import {
    fetchSubscribedFeeds,
    reorderFeeds,
} from '../redux/slices/feedsSlice';

const ManageFeedsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { subscribedFeeds, pinnedFeedIds } = useAppSelector((state: RootState) => state.feeds);

    const [currentPinnedIds, setCurrentPinnedIds] = useState<string[]>(pinnedFeedIds);
    const [hasChanges, setHasChanges] = useState(false);

    React.useEffect(() => {
        if (subscribedFeeds.length === 0) {
            dispatch(fetchSubscribedFeeds());
        }
    }, [dispatch, subscribedFeeds.length]);

    React.useEffect(() => {
        setCurrentPinnedIds(pinnedFeedIds);
    }, [pinnedFeedIds]);

    // Derived lists
    const pinnedFeeds = currentPinnedIds
        .map((id: string) => subscribedFeeds.find((f: Feed) => f.id === id))
        .filter(Boolean) as Feed[];

    const savedFeeds = subscribedFeeds.filter((f: Feed) =>
        f.isSubscribed && !currentPinnedIds.includes(f.id)
    );

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        const newIds = [...currentPinnedIds];
        const temp = newIds[index - 1];
        newIds[index - 1] = newIds[index];
        newIds[index] = temp;
        setCurrentPinnedIds(newIds);
        setHasChanges(true);
    };

    const handleMoveDown = (index: number) => {
        if (index === currentPinnedIds.length - 1) return;
        const newIds = [...currentPinnedIds];
        const temp = newIds[index + 1];
        newIds[index + 1] = newIds[index];
        newIds[index] = temp;
        setCurrentPinnedIds(newIds);
        setHasChanges(true);
    };

    const handleUnpin = (id: string) => {
        setCurrentPinnedIds(currentPinnedIds.filter(pid => pid !== id));
        setHasChanges(true);
    };

    const handlePin = (id: string) => {
        setCurrentPinnedIds([...currentPinnedIds, id]);
        setHasChanges(true);
    };

    const handleSave = async () => {
        try {
            await dispatch(reorderFeeds(currentPinnedIds)).unwrap();
            dispatch(showToast({ message: t('common.save_success', { defaultValue: 'Changes saved successfully!' }), type: 'success' }));
            setHasChanges(false);
            dispatch(fetchSubscribedFeeds());
        } catch (error: any) {
            dispatch(showToast({ message: error || 'Failed to save changes', type: 'error' }));
        }
    };

    return (
        <MainLayout>
            <div className="min-h-screen border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg">
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
                            {t('feeds.title')}
                        </h1>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSave}
                        className={cn(
                            "font-bold px-4 py-1.5 rounded-lg border-none transition-all",
                            hasChanges
                                ? "bg-primary-500 text-white hover:bg-primary-600 shadow-sm"
                                : "bg-gray-100 dark:bg-dark-surface text-gray-400 opacity-50 cursor-not-allowed"
                        )}
                        disabled={!hasChanges}
                    >
                        {t('profile.save_changes')}
                    </Button>
                </div>

                <div className="flex flex-col">
                    {/* Pinned Section */}
                    <div className="p-4 bg-gray-50/50 dark:bg-dark-surface/10">
                        <h2 className="font-bold text-gray-900 dark:text-dark-text">
                            {t('feeds.pinned_feeds')}
                        </h2>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-dark-border border-b border-gray-100 dark:border-dark-border">
                        {pinnedFeeds.map((feed: Feed, index: number) => (
                            <div key={feed.id} className="flex items-center justify-between p-4 bg-white dark:bg-dark-bg">
                                <div className="flex items-center gap-3 min-w-0">
                                    <FeedAvatar src={feed.avatarUrl || feed.avatar} alt={feed.name} />
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-gray-900 dark:text-dark-text truncate">
                                            {feed.name}
                                        </span>
                                        {feed.handle && (
                                            <span className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                                                {t('profile.feed_by')} @{feed.handle}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleMoveUp(index)}
                                        className={cn(
                                            "p-2 rounded-md transition-colors bg-gray-50 dark:bg-dark-surface",
                                            index === 0 ? "text-gray-300 dark:text-dark-border" : "text-gray-600 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover"
                                        )}
                                        disabled={index === 0}
                                    >
                                        <FiArrowUp size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleMoveDown(index)}
                                        className={cn(
                                            "p-2 rounded-md transition-colors bg-gray-50 dark:bg-dark-surface",
                                            index === pinnedFeeds.length - 1 ? "text-gray-300 dark:text-dark-border" : "text-gray-600 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover"
                                        )}
                                        disabled={index === pinnedFeeds.length - 1}
                                    >
                                        <FiArrowDown size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleUnpin(feed.id)}
                                        className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                    >
                                        <FiAnchor size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {pinnedFeeds.length === 0 && (
                            <div className="p-8 text-center text-gray-500 dark:text-dark-text-secondary">
                                No pinned feeds yet.
                            </div>
                        )}
                    </div>

                    {/* Saved Section */}
                    <div className="p-4 bg-gray-50/50 dark:bg-dark-surface/10">
                        <h2 className="font-bold text-gray-900 dark:text-dark-text">
                            {t('feeds.saved_feeds')}
                        </h2>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-dark-border border-b border-gray-100 dark:border-dark-border">
                        {savedFeeds.map((feed: Feed) => (
                            <div key={feed.id} className="flex items-center justify-between p-4 bg-white dark:bg-dark-bg">
                                <div className="flex items-center gap-3 min-w-0">
                                    <FeedAvatar src={feed.avatarUrl || feed.avatar} alt={feed.name} />
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-gray-900 dark:text-dark-text truncate">
                                            {feed.name}
                                        </span>
                                        {feed.handle && (
                                            <span className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                                                {t('profile.feed_by')} @{feed.handle}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePin(feed.id)}
                                        className="p-2 rounded-md bg-gray-50 dark:bg-dark-surface text-gray-400 hover:text-gray-600 dark:hover:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                                    >
                                        <FiAnchor size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {savedFeeds.length === 0 && (
                            <div className="p-10 text-center">
                                <div className="flex items-start justify-center gap-3 p-4 bg-gray-50 dark:bg-dark-surface/20 rounded-xl border border-gray-200 dark:border-dark-border max-w-lg mx-auto">
                                    <FiInfo className="text-gray-400 mt-0.5 flex-shrink-0" size={20} />
                                    <p className="text-gray-500 dark:text-dark-text-secondary text-left text-[14.5px]">
                                        {t('feeds.no_saved_feeds')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Info */}
                    <div className="p-4 mt-2">
                        <p className="text-[14px] text-gray-500 dark:text-dark-text-secondary leading-normal">
                            Feeds are custom algorithms that users build with a little coding expertise. <button className="text-primary-500 hover:underline">See this guide</button> for more information.
                        </p>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default ManageFeedsPage;
