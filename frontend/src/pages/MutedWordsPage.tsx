import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiPlus, FiX, FiCheck, FiTrash2, FiAlertCircle, FiEyeOff, FiRefreshCw, FiHash, FiFileText } from 'react-icons/fi';
import { cn } from '../utils/classNames';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchMutedWords, addMutedWordAsync, deleteMutedWordAsync, syncMutedWords } from '../redux/slices/userSlice';
import LoadingIndicator from '../components/common/LoadingIndicator';

const MutedWordsPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { mutedWords, isLoading } = useAppSelector(state => state.user);

    const [isModalOpen, setIsModalOpen] = useState(false);

    // Modal Form State
    const [word, setWord] = useState('');
    const [muteBehavior, setMuteBehavior] = useState('hide'); // Default to hide
    const [targets, setTargets] = useState<string[]>(['content']); // Default to content

    useEffect(() => {
        dispatch(fetchMutedWords());
    }, [dispatch]);

    const handleAddWord = async () => {
        if (word.trim() && targets.length > 0) {
            await dispatch(addMutedWordAsync({
                word: word.trim(),
                muteBehavior,
                targets: targets.join(',')
            }));
            setWord('');
            setTargets(['content']);
            setIsModalOpen(false);
        }
    };

    const handleSync = () => {
        dispatch(syncMutedWords());
    };

    const handleDelete = (id: number) => {
        dispatch(deleteMutedWordAsync(id));
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
                        {t('moderation.muted_words_title')}
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
                        {t('moderation.your_muted_words')}
                    </h2>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white hover:bg-primary-600 rounded-full transition-colors font-medium text-sm"
                    >
                        <FiPlus size={16} />
                        {t('moderation.add_new')}
                    </button>
                </div>

                {isLoading && mutedWords.length === 0 ? (
                    <div className="flex justify-center py-12">
                        <LoadingIndicator size="lg" />
                    </div>
                ) : mutedWords.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-dark-surface/30 rounded-2xl p-12 text-center border border-dashed border-gray-200 dark:border-dark-border">
                        <p className="text-gray-500 dark:text-dark-text-secondary italic">
                            {t('moderation.no_muted_words')}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {mutedWords.map((item) => (
                            <div key={item.id} className="p-4 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl flex justify-between items-center shadow-sm">
                                <div className="flex flex-col">
                                    <span className="font-bold dark:text-dark-text text-lg">{item.word}</span>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs text-gray-500 dark:text-dark-text-secondary flex items-center gap-1">
                                            {item.muteBehavior === 'hide' ? (
                                                <><FiEyeOff size={12} /> {t('moderation.behavior_hide', 'Fully hidden')}</>
                                            ) : (
                                                <><FiAlertCircle size={12} /> {t('moderation.behavior_warn', 'Show warning')}</>
                                            )}
                                        </span>
                                        <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-dark-text-secondary/50 border border-gray-200 dark:border-dark-border px-1.5 rounded">
                                            {item.targets || 'content'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title={t('common.delete')}
                                >
                                    <FiTrash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-dark-surface w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border dark:border-dark-border">
                        {/* Modal Header */}
                        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100 dark:border-dark-border">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                                {t('moderation.add_muted_word_title')}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors">
                                <FiX size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-6 leading-relaxed">
                                {t('moderation.muted_word_desc', 'Posts containing these words or tags will be filtered according to your preference.')}
                            </p>

                            <div className="mb-8">
                                <label className="block text-sm font-bold text-gray-700 dark:text-dark-text-secondary mb-2 uppercase tracking-tight">
                                    {t('moderation.word_or_tag', 'Word or Tag')}
                                </label>
                                <input
                                    type="text"
                                    value={word}
                                    onChange={(e) => setWord(e.target.value)}
                                    placeholder={t('moderation.input_placeholder', 'e.g. #politics, spoiler')}
                                    className="w-full p-4 text-lg border border-gray-200 dark:border-dark-border rounded-2xl bg-gray-50 dark:bg-dark-bg dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                                    autoFocus
                                />
                            </div>

                            {/* Mute Behavior */}
                            <div className="mb-8">
                                <label className="block text-sm font-bold text-gray-700 dark:text-dark-text-secondary mb-4 uppercase tracking-tight">
                                    {t('moderation.mute_behavior', 'Mute Behavior')}
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setMuteBehavior('hide')}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                                            muteBehavior === 'hide'
                                                ? "bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                                                : "bg-white border-gray-100 text-gray-500 dark:bg-dark-surface dark:border-dark-border hover:border-gray-200"
                                        )}
                                    >
                                        <FiEyeOff size={24} />
                                        <span className="font-bold text-sm">{t('moderation.hide_completely', 'Hide Completely')}</span>
                                    </button>
                                    <button
                                        onClick={() => setMuteBehavior('warn')}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                                            muteBehavior === 'warn'
                                                ? "bg-yellow-50 border-yellow-500 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                                                : "bg-white border-gray-100 text-gray-500 dark:bg-dark-surface dark:border-dark-border hover:border-gray-200"
                                        )}
                                    >
                                        <FiAlertCircle size={24} />
                                        <span className="font-bold text-sm">{t('moderation.show_warning', 'Show Warning')}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Mute Targets */}
                            <div className="mb-8">
                                <label className="block text-sm font-bold text-gray-700 dark:text-dark-text-secondary mb-4 uppercase tracking-tight">
                                    {t('moderation.mute_targets', 'Mute Targets')}
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => {
                                            if (targets.includes('content')) setTargets(targets.filter(t => t !== 'content'));
                                            else setTargets([...targets, 'content']);
                                        }}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                                            targets.includes('content')
                                                ? "bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                                                : "bg-white border-gray-100 text-gray-500 dark:bg-dark-surface dark:border-dark-border hover:border-gray-200"
                                        )}
                                    >
                                        <FiFileText size={24} />
                                        <span className="font-bold text-sm">{t('moderation.target_content', 'Text Content')}</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (targets.includes('tag')) setTargets(targets.filter(t => t !== 'tag'));
                                            else setTargets([...targets, 'tag']);
                                        }}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                                            targets.includes('tag')
                                                ? "bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                                                : "bg-white border-gray-100 text-gray-500 dark:bg-dark-surface dark:border-dark-border hover:border-gray-200"
                                        )}
                                    >
                                        <FiHash size={24} />
                                        <span className="font-bold text-sm">{t('moderation.target_tag', 'Tags & Hashtags')}</span>
                                    </button>
                                </div>
                                {targets.length === 0 && (
                                    <p className="text-xs text-red-500 mt-2 font-medium">
                                        {t('moderation.target_required', 'Please select at least one target')}
                                    </p>
                                )}
                            </div>

                            {/* Add Button */}
                            <button
                                onClick={handleAddWord}
                                disabled={!word.trim() || targets.length === 0}
                                className="w-full py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all text-lg shadow-lg shadow-primary-500/20"
                            >
                                {t('moderation.add_word', 'Add Muted Word')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MutedWordsPage;
