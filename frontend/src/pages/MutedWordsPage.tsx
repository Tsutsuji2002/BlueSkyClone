import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiPlus, FiTrash2, FiClock, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { cn } from '../utils/classNames';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchMutedWords, deleteMutedWordAsync, syncMutedWords } from '../redux/slices/userSlice';
import { openMutedWords } from '../redux/slices/modalsSlice';
import LoadingIndicator from '../components/common/LoadingIndicator';
import { MutedWord } from '../types';

const MutedWordsPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { mutedWords, isLoading } = useAppSelector(state => state.user);

    useEffect(() => {
        dispatch(fetchMutedWords());
    }, [dispatch]);

    const handleSync = () => {
        dispatch(syncMutedWords());
    };

    const handleDelete = (id: number) => {
        dispatch(deleteMutedWordAsync(id));
    };

    const getExpiryLabel = (expiry?: string) => {
        if (!expiry) return 'Forever';
        const date = new Date(expiry);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) return 'Expired';
        if (diffDays === 1) return '24 hours';
        if (diffDays <= 7) return `${diffDays} days`;
        return `${diffDays} days`;
    };

    return (
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
                        Muted words & tags
                    </h1>
                </div>

                <button
                    onClick={handleSync}
                    disabled={isLoading}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors relative"
                    title={t('moderation.sync_with_bluesky', 'Sync with Bluesky')}
                >
                    <FiRefreshCw size={20} className={cn("dark:text-dark-text", isLoading && "animate-spin")} />
                </button>
            </div>

            <div className="p-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="font-bold text-gray-900 dark:text-dark-text text-lg">
                        Your muted words
                    </h2>
                    <button
                        onClick={() => dispatch(openMutedWords())}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white hover:bg-primary-600 rounded-full transition-all font-bold text-[15px] shadow-lg shadow-primary-500/20 active:scale-95"
                    >
                        <FiPlus size={18} />
                        {t('moderation.add_new')}
                    </button>
                </div>

                {isLoading && mutedWords.length === 0 ? (
                    <div className="flex justify-center py-12">
                        <LoadingIndicator size="lg" />
                    </div>
                ) : mutedWords.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-dark-surface/30 rounded-3xl p-16 text-center border-2 border-dashed border-gray-100 dark:border-dark-border/50">
                         <FiAlertCircle size={48} className="mx-auto text-gray-200 dark:text-dark-border mb-4" />
                        <p className="text-gray-500 dark:text-dark-text-secondary font-medium">
                            {t('moderation.no_muted_words')}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {mutedWords.map((item: MutedWord) => (
                            <div 
                                key={item.id} 
                                className="p-5 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl flex justify-between items-center shadow-sm hover:shadow-md transition-shadow group"
                            >
                                <div className="flex flex-col gap-1.5">
                                    <span className="font-bold text-gray-900 dark:text-dark-text text-lg tracking-tight">{item.word}</span>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-dark-text-secondary">
                                            <FiClock size={13} className="text-primary" />
                                            <span>{getExpiryLabel(item.expiresAt)}</span>
                                        </div>
                                        <div className="w-1 h-1 bg-gray-200 dark:bg-dark-border rounded-full" />
                                        <span className="text-[11px] uppercase font-black text-gray-400 dark:text-dark-text-secondary/50 border border-gray-200 dark:border-dark-border/50 px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-dark-bg">
                                            {item.targets === 'tag' ? 'Tags only' : 'Text & tags'}
                                        </span>
                                        {item.excludeFollowing && (
                                            <>
                                                <div className="w-1 h-1 bg-gray-200 dark:bg-dark-border rounded-full" />
                                                <span className="text-[11px] font-bold text-primary px-2 py-0.5 rounded-lg bg-primary/10">Following Excluded</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title={t('common.delete')}
                                >
                                    <FiTrash2 size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MutedWordsPage;
