import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Feed } from '../types';
import { FiArrowLeft, FiTrash2 } from 'react-icons/fi';
import { BsPin, BsPinFill, BsGripVertical } from 'react-icons/bs';
import FeedAvatar from '../components/common/FeedAvatar';
import { cn } from '../utils/classNames';
import Button from '../components/common/Button';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { RootState } from '../redux/store';
import { showToast } from '../redux/slices/toastSlice';
import {
    fetchSubscribedFeeds,
    pinFeed,
    unpinFeed,
    unsaveFeed,
    reorderFeeds,
    reorderPinnedFeeds,
} from '../redux/slices/feedsSlice';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { feedActionKey } from '../utils/feedKeys';

function isGuidString(s: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

const ManageFeedsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { subscribedFeeds, pinnedFeedIds } = useAppSelector((state: RootState) => state.feeds);

    const [currentPinnedIds, setCurrentPinnedIds] = useState<string[]>(pinnedFeedIds);
    const [initialPinnedIds, setInitialPinnedIds] = useState<string[]>(pinnedFeedIds);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Drag state
    const dragIndexRef = useRef<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    React.useEffect(() => {
        if (subscribedFeeds.length === 0) {
            dispatch(fetchSubscribedFeeds());
        }
    }, [dispatch, subscribedFeeds.length]);

    React.useEffect(() => {
        setCurrentPinnedIds(pinnedFeedIds);
        setInitialPinnedIds(pinnedFeedIds);
    }, [pinnedFeedIds]);

    // Derived lists
    const pinnedFeeds = currentPinnedIds
        .map((pid: string) => subscribedFeeds.find((f: Feed) => f.id === pid || feedActionKey(f) === pid))
        .filter(Boolean) as Feed[];

    const savedFeeds = subscribedFeeds.filter(
        (f: Feed) =>
            f.isSubscribed &&
            !currentPinnedIds.some((pid) => pid === f.id || pid === feedActionKey(f))
    );

    // Drag and Drop Handlers
    const handleDragStart = (index: number) => {
        dragIndexRef.current = index;
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        const dragIndex = dragIndexRef.current;
        if (dragIndex === null || dragIndex === dropIndex) {
            setDragOverIndex(null);
            return;
        }
        const newIds = [...currentPinnedIds];
        const [removed] = newIds.splice(dragIndex, 1);
        newIds.splice(dropIndex, 0, removed);
        setCurrentPinnedIds(newIds);
        setHasChanges(true);
        dragIndexRef.current = null;
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        dragIndexRef.current = null;
        setDragOverIndex(null);
    };

    const handleUnpin = (id: string) => {
        setCurrentPinnedIds(currentPinnedIds.filter(pid => pid !== id));
        setHasChanges(true);
    };

    const handlePin = (id: string) => {
        if (currentPinnedIds.includes(id)) return;
        setCurrentPinnedIds([...currentPinnedIds, id]);
        setHasChanges(true);
    };

    const handleRemoveSaved = async (feed: Feed) => {
        const fk = feedActionKey(feed);
        await dispatch(unsaveFeed(fk));
        dispatch(showToast({ message: 'Feed removed', type: 'success' }));
    };

    const handleSave = async () => {
        const uniqueCurrentPinnedIds = Array.from(new Set(currentPinnedIds));
        const toUnpin = initialPinnedIds.filter((id) => !uniqueCurrentPinnedIds.includes(id));
        const toPin = uniqueCurrentPinnedIds.filter((id) => !initialPinnedIds.includes(id));

        const guidIds = uniqueCurrentPinnedIds.filter(isGuidString);
        const remotePinnedKeys = uniqueCurrentPinnedIds.filter((k) => !isGuidString(k));

        setIsSaving(true);
        try {
            for (const key of toUnpin) {
                await dispatch(unpinFeed(key)).unwrap();
            }
            for (const key of toPin) {
                await dispatch(pinFeed(key)).unwrap();
            }
            if (remotePinnedKeys.length > 0) {
                await dispatch(reorderPinnedFeeds(remotePinnedKeys)).unwrap();
            }
            if (guidIds.length > 0) {
                await dispatch(reorderFeeds(guidIds)).unwrap();
            }

            dispatch(showToast({ message: t('common.save_success', { defaultValue: 'Changes saved!' }), type: 'success' }));
            setHasChanges(false);
            dispatch(fetchSubscribedFeeds({ bypassThrottle: true }));
            setInitialPinnedIds(uniqueCurrentPinnedIds);
        } catch (error: any) {
            dispatch(showToast({ message: String(error) || 'Failed to save changes', type: 'error' }));
        } finally {
            setIsSaving(false);
        }
    };

    useDocumentTitle('Edit My Feeds');

    return (
        <div className="min-h-screen border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                    >
                        <FiArrowLeft size={20} className="dark:text-dark-text" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">Feeds</h1>
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSave}
                    className={cn(
                        "font-bold px-4 py-1.5 rounded-full border-none transition-all text-sm",
                        hasChanges && !isSaving
                            ? "bg-gray-100 dark:bg-dark-surface text-gray-900 dark:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-hover"
                            : "bg-gray-100 dark:bg-dark-surface text-gray-400 opacity-50 cursor-not-allowed"
                    )}
                    disabled={!hasChanges || isSaving}
                >
                    Save changes
                </Button>
            </div>

            <div className="flex flex-col">
                {/* Pinned Section */}
                <div className="px-4 pt-5 pb-2">
                    <h2 className="font-bold text-gray-900 dark:text-dark-text text-lg">
                        Pinned Feeds
                    </h2>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-dark-border">
                    {pinnedFeeds.map((feed: Feed, index: number) => {
                        const fk = feedActionKey(feed);
                        const isDragOver = dragOverIndex === index;
                        return (
                            <div
                                key={fk}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDrop={(e) => handleDrop(e, index)}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                    "flex items-center justify-between px-4 py-3 bg-white dark:bg-dark-bg transition-colors select-none",
                                    isDragOver ? "bg-primary-50 dark:bg-primary-900/10 border-t-2 border-primary-500" : "hover:bg-gray-50 dark:hover:bg-dark-surface/30"
                                )}
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <FeedAvatar
                                        src={feed.avatarUrl || feed.avatar}
                                        alt={feed.name}
                                        size="sm"
                                        className="rounded-lg flex-shrink-0"
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-semibold text-gray-900 dark:text-dark-text truncate text-[15px]">
                                            {feed.name}
                                        </span>
                                        {feed.handle && (
                                            <span className="text-[13px] text-gray-500 dark:text-dark-text-secondary truncate">
                                                Feed by @{feed.handle}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button
                                        onClick={() => handleUnpin(fk)}
                                        title="Unpin feed"
                                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1e3a5f] dark:bg-[#1a3050] text-primary-400 hover:bg-[#1a3050] transition-colors"
                                    >
                                        <BsPinFill size={16} />
                                    </button>
                                    <div
                                        className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
                                    >
                                        <BsGripVertical size={20} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {pinnedFeeds.length === 0 && (
                        <div className="px-4 py-8 text-center text-gray-500 dark:text-dark-text-secondary text-sm">
                            No pinned feeds yet. Pin a feed below to add it here.
                        </div>
                    )}
                </div>

                {/* Saved Section */}
                {savedFeeds.length > 0 && (
                    <>
                        <div className="px-4 pt-5 pb-2">
                            <h2 className="font-bold text-gray-900 dark:text-dark-text text-lg">
                                Saved Feeds
                            </h2>
                        </div>

                        <div className="divide-y divide-gray-100 dark:divide-dark-border">
                            {savedFeeds.map((feed: Feed) => {
                                const fk = feedActionKey(feed);
                                return (
                                    <div key={fk} className="flex items-center justify-between px-4 py-3 bg-white dark:bg-dark-bg hover:bg-gray-50 dark:hover:bg-dark-surface/30 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <FeedAvatar
                                                src={feed.avatarUrl || feed.avatar}
                                                alt={feed.name}
                                                size="sm"
                                                className="rounded-lg flex-shrink-0"
                                            />
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold text-gray-900 dark:text-dark-text truncate text-[15px]">
                                                    {feed.name}
                                                </span>
                                                {feed.handle && (
                                                    <span className="text-[13px] text-gray-500 dark:text-dark-text-secondary truncate">
                                                        Feed by @{feed.handle}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <button
                                                onClick={() => handleRemoveSaved(feed)}
                                                title="Remove feed"
                                                className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handlePin(fk)}
                                                title="Pin feed"
                                                className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
                                            >
                                                <BsPin size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Footer Info */}
                <div className="px-4 py-6 mt-2">
                    <p className="text-[13px] text-gray-500 dark:text-dark-text-secondary leading-normal">
                        Feeds are custom algorithms that users build with a little coding expertise.{' '}
                        <button className="text-primary-500 hover:underline">See this guide</button>{' '}
                        for more information.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ManageFeedsPage;
