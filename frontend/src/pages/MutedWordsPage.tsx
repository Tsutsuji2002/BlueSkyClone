import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiPlus, FiX, FiCheck } from 'react-icons/fi';
import { cn } from '../utils/classNames';

const MutedWordsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Modal Form State
    const [word, setWord] = useState('');
    const [duration, setDuration] = useState('forever');
    const [muteIn, setMuteIn] = useState('text_tags');
    const [excludeFollowing, setExcludeFollowing] = useState(false);

    // Mock data for muted words (can be expanded to use Redux later)
    const [mutedWords, setMutedWords] = useState<{ id: string, word: string }[]>([]);

    const handleAddWord = () => {
        if (word.trim()) {
            setMutedWords([...mutedWords, { id: Date.now().toString(), word: word.trim() }]);
            setWord('');
            setIsModalOpen(false);
        }
    };

    return (
        <MainLayout>
            {/* Main Page Content */}
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
                </div>

                <div className="p-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-bold text-gray-900 dark:text-dark-text text-lg">
                            {t('moderation.your_muted_words')}
                        </h2>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-surface/80 rounded-full transition-colors font-medium text-sm"
                        >
                            <FiPlus size={16} />
                            {t('moderation.create_new')}
                        </button>
                    </div>

                    {mutedWords.length === 0 ? (
                        <div className="bg-gray-50 dark:bg-dark-surface/30 rounded-lg p-8 text-center">
                            <p className="text-gray-500 dark:text-dark-text-secondary italic">
                                {t('moderation.no_muted_words')}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {mutedWords.map((item) => (
                                <div key={item.id} className="p-4 border border-gray-200 dark:border-dark-border rounded-lg flex justify-between items-center">
                                    <span className="font-bold dark:text-dark-text">{item.word}</span>
                                    <button
                                        onClick={() => setMutedWords(mutedWords.filter(w => w.id !== item.id))}
                                        className="text-red-500 hover:text-red-700 font-medium text-sm"
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-dark-surface w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-dark-border">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                                {t('moderation.add_muted_word_title')}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-text">
                                <FiX size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-4 leading-relaxed">
                                {t('moderation.muted_word_desc')}
                            </p>

                            <div className="mb-6">
                                <input
                                    type="text"
                                    value={word}
                                    onChange={(e) => setWord(e.target.value)}
                                    placeholder={t('moderation.input_placeholder')}
                                    className="w-full p-4 text-lg border border-blue-500 rounded-lg bg-white dark:bg-dark-bg dark:text-dark-text focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                />
                            </div>

                            {/* Duration */}
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-900 dark:text-dark-text mb-3">
                                    {t('moderation.duration')}:
                                </label>
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {[
                                        { label: t('moderation.forever'), val: 'forever' },
                                        { label: t('moderation.24h'), val: '24h' },
                                        { label: t('moderation.7d'), val: '7d' },
                                        { label: t('moderation.30d'), val: '30d' },
                                    ].map(opt => (
                                        <button
                                            key={opt.val}
                                            onClick={() => setDuration(opt.val)}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-colors",
                                                duration === opt.val
                                                    ? "bg-blue-500 border-blue-500 text-white"
                                                    : "bg-white border-gray-300 text-gray-700 dark:bg-transparent dark:border-gray-600 dark:text-dark-text hover:bg-gray-50"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-4 h-4 rounded-full border border-white flex items-center justify-center",
                                                duration === opt.val ? "opacity-100" : "opacity-0"
                                            )}>
                                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                            </div>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Mute In */}
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-900 dark:text-dark-text mb-3">
                                    {t('moderation.mute_in')}:
                                </label>
                                <div className="flex gap-2">
                                    {[
                                        { label: t('moderation.text_and_tags'), val: 'text_tags', icon: true },
                                        { label: t('moderation.tags_only'), val: 'tags_only', icon: false },
                                    ].map(opt => (
                                        <button
                                            key={opt.val}
                                            onClick={() => setMuteIn(opt.val)}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors",
                                                muteIn === opt.val
                                                    ? "bg-blue-500 border-blue-500 text-white"
                                                    : "bg-white border-gray-300 text-gray-700 dark:bg-transparent dark:border-gray-600 dark:text-dark-text hover:bg-gray-50"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-4 h-4 rounded-full border border-white flex items-center justify-center",
                                                muteIn === opt.val ? "opacity-100" : "opacity-0"
                                            )}>
                                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                            </div>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Exclude Following Toggle */}
                            <div className="mb-8">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={excludeFollowing}
                                            onChange={(e) => setExcludeFollowing(e.target.checked)}
                                            className="peer sr-only"
                                        />
                                        <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-transparent peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-colors"></div>
                                        <FiCheck className="absolute top-0.5 left-0.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" size={20} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 dark:text-dark-text group-hover:text-gray-700">
                                        {t('moderation.exclude_following')}
                                    </span>
                                </label>
                            </div>

                            {/* Add Button */}
                            <button
                                onClick={handleAddWord}
                                disabled={!word.trim()}
                                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-bold rounded-full transition-colors text-[15px]"
                            >
                                {t('moderation.add')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default MutedWordsPage;
