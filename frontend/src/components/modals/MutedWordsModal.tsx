import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { FiX, FiTrash2, FiClock, FiPlus, FiAlertCircle } from 'react-icons/fi';
import { RootState, AppDispatch } from '../../redux/store';
import { closeMutedWords } from '../../redux/slices/modalsSlice';
import { addMutedWordAsync, deleteMutedWordAsync, fetchMutedWords } from '../../redux/slices/userSlice';
import { showToast } from '../../redux/slices/toastSlice';
import Button from '../common/Button';
import { MutedWord } from '../../types';

const MutedWordsModal: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch<AppDispatch>();
    const { isOpen, initialWord } = useSelector((state: RootState) => state.modals.mutedWords);
    const { mutedWords, isLoading } = useSelector((state: RootState) => state.user);
    
    const [word, setWord] = useState('');
    const [duration, setDuration] = useState('forever'); // 'forever', '24h', '7d', '30d'
    const [targets, setTargets] = useState('content,tag'); // 'content,tag', 'tag'
    const [excludeFollowing, setExcludeFollowing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setWord(initialWord || '');
            setDuration('forever');
            setTargets('content,tag');
            setExcludeFollowing(false);
            dispatch(fetchMutedWords());
        }
    }, [isOpen, initialWord, dispatch]);

    const handleAdd = async (event?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
        event?.preventDefault();
        event?.stopPropagation();

        const normalizedWord = word.trim();
        if (!normalizedWord) {
            dispatch(showToast({ message: 'Please enter a word or tag', type: 'error' }));
            return;
        }

        setIsSubmitting(true);
        try {
            let expiresAt: string | undefined;
            if (duration !== 'forever') {
                const date = new Date();
                if (duration === '24h') date.setHours(date.getHours() + 24);
                else if (duration === '7d') date.setDate(date.getDate() + 7);
                else if (duration === '30d') date.setDate(date.getDate() + 30);
                expiresAt = date.toISOString();
            }

            await dispatch(addMutedWordAsync({
                word: normalizedWord,
                muteBehavior: 'hide',
                targets,
                expiresAt,
                excludeFollowing
            })).unwrap();
            
            setWord('');
            dispatch(showToast({ message: 'Muted word added', type: 'success' }));
        } catch (error: any) {
            dispatch(showToast({ message: error || 'Failed to add muted word', type: 'error' }));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await dispatch(deleteMutedWordAsync(id)).unwrap();
            dispatch(showToast({ message: 'Muted word removed', type: 'success' }));
        } catch (error: any) {
            dispatch(showToast({ message: error || 'Failed to remove muted word', type: 'error' }));
        }
    };

    if (!isOpen) return null;

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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-dark-surface w-full max-w-[500px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-4 py-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md sticky top-0 z-10">
                    <button 
                        onClick={() => dispatch(closeMutedWords())}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-border rounded-full transition-all active:scale-95"
                    >
                        <FiX size={20} className="text-gray-600 dark:text-dark-text-secondary" />
                    </button>
                    <h2 className="text-[18px] font-black text-gray-900 dark:text-dark-text tracking-tight">
                        Muted words & tags
                    </h2>
                    <div className="w-10" />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-5 space-y-6">
                        <div className="space-y-4">
                            <p className="text-[15px] text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                                Mute specific words or tags to hide them from your Feeds and Notifications.
                            </p>

                            {/* Input Field */}
                            <div className="space-y-2">
                                <label className="text-[13px] font-bold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary">
                                    Word or tag
                                </label>
                                <form className="relative group" onSubmit={handleAdd}>
                                    <input 
                                        type="text"
                                        value={word}
                                        onChange={(e) => setWord(e.target.value)}
                                        placeholder="Enter word/tag"
                                        className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 text-[16px] text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-12"
                                    />
                                    <button 
                                        type="submit"
                                        onClick={handleAdd}
                                        disabled={!word.trim() || isSubmitting}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary/10 rounded-lg transition-all disabled:opacity-30"
                                    >
                                        <FiPlus size={24} />
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[13px] font-bold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary">
                                    Duration
                                </label>
                                <select 
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-3 py-2.5 text-[15px] text-gray-900 dark:text-dark-text focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                                >
                                    <option value="forever">Forever</option>
                                    <option value="24h">24 hours</option>
                                    <option value="7d">7 days</option>
                                    <option value="30d">30 days</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[13px] font-bold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary">
                                    Mute in
                                </label>
                                <select 
                                    value={targets}
                                    onChange={(e) => setTargets(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-3 py-2.5 text-[15px] text-gray-900 dark:text-dark-text focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                                >
                                    <option value="content,tag">Text & tags</option>
                                    <option value="tag">Tags only</option>
                                </select>
                            </div>
                        </div>

                        {/* Exclude Following Toggle */}
                        <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg rounded-2xl cursor-pointer group hover:bg-gray-100 dark:hover:bg-dark-border/50 transition-all">
                            <div className="space-y-0.5">
                                <span className="font-bold text-gray-900 dark:text-dark-text">Exclude users you follow</span>
                                <p className="text-[13px] text-gray-500 dark:text-dark-text-secondary">Don't mute posts from people you know</p>
                            </div>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={excludeFollowing} 
                                    onChange={() => setExcludeFollowing(!excludeFollowing)} 
                                    className="sr-only peer" 
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                            </div>
                        </label>

                        <div className="pt-2">
                            <h3 className="text-[13px] font-bold uppercase tracking-wider text-gray-500 dark:text-dark-text-secondary mb-4">
                                Your muted words
                            </h3>
                            
                            {isLoading && mutedWords.length === 0 ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : mutedWords.length === 0 ? (
                                <div className="text-center py-10 bg-gray-50/50 dark:bg-dark-bg/50 rounded-2xl border-2 border-dashed border-gray-100 dark:border-dark-border">
                                    <FiAlertCircle size={32} className="mx-auto text-gray-300 dark:text-dark-border mb-3" />
                                    <p className="text-gray-500 dark:text-dark-text-secondary text-[14px]">No muted words yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {mutedWords.map((mw: MutedWord) => (
                                        <div 
                                            key={mw.id}
                                            className="flex items-center justify-between p-4 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl group hover:shadow-md transition-all"
                                        >
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-[16px] text-gray-900 dark:text-dark-text">
                                                    {mw.word}
                                                </span>
                                                <div className="flex items-center gap-3 text-[12px] text-gray-500 dark:text-dark-text-secondary">
                                                    <span className="flex items-center gap-1">
                                                        <FiClock size={12} className="text-primary" />
                                                        {getExpiryLabel(mw.expiresAt)}
                                                    </span>
                                                    <span className="w-1 h-1 bg-gray-300 dark:bg-dark-border rounded-full" />
                                                    <span>{mw.targets === 'tag' ? 'Tags only' : 'Text & tags'}</span>
                                                    {mw.excludeFollowing && (
                                                        <>
                                                            <span className="w-1 h-1 bg-gray-300 dark:bg-dark-border rounded-full" />
                                                            <span>Following excluded</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDelete(mw.id)}
                                                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-dark-border bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md">
                    <Button 
                        variant="primary" 
                        fullWidth 
                        className="rounded-full font-black py-3.5 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                        onClick={() => dispatch(closeMutedWords())}
                    >
                        {t('common.done')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default MutedWordsModal;
