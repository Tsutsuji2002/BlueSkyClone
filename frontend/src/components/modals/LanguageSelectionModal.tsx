import React, { useState, useMemo } from 'react';
import { FiX, FiSearch, FiCheck } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { ALL_LANGUAGES, LanguageMetadata } from '../../constants/languages';
import { cn } from '../../utils/classNames';

interface LanguageSelectionModalProps {
    onClose: () => void;
    selectedCodes: string[];
    onToggle: (code: string) => void;
}

const LanguageSelectionModal: React.FC<LanguageSelectionModalProps> = ({ onClose, selectedCodes, onToggle }) => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredLanguages = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return ALL_LANGUAGES;
        return ALL_LANGUAGES.filter(
            lang => lang.englishName.toLowerCase().includes(query) ||
                lang.nativeName.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    const recentlyUsed = useMemo(() => {
        // For now, let's show currently selected at the top as "Selected"
        return selectedCodes.map(code => ALL_LANGUAGES.find(l => l.code === code)).filter(Boolean) as LanguageMetadata[];
    }, [selectedCodes]);

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-dark-bg w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">{t('language.modal_title')}</h2>
                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">{t('language.modal_desc')}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors text-gray-500"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100 dark:border-dark-border bg-white dark:bg-dark-bg sticky top-0 z-10">
                    <div className="relative">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder={t('language.search_languages')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-dark-surface border-none rounded-2xl pl-11 pr-4 py-3 text-[15px] dark:text-dark-text focus:ring-2 focus:ring-primary-500/20 transition-all outline-none"
                            autoFocus
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-4">
                    {!searchQuery && recentlyUsed.length > 0 && (
                        <div>
                            <h3 className="px-4 py-2 text-xs font-bold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider">{t('language.recently_used')}</h3>
                            <div className="space-y-0.5">
                                {recentlyUsed.map(lang => (
                                    <button
                                        key={`recent-${lang.code}`}
                                        onClick={() => onToggle(lang.code)}
                                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-dark-surface-hover rounded-xl transition-colors"
                                    >
                                        <span className="text-[15px] font-bold dark:text-dark-text">{lang.englishName}</span>
                                        <div className={cn(
                                            "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                                            selectedCodes.includes(lang.code)
                                                ? "bg-primary-500 border-primary-500"
                                                : "border-gray-300 dark:border-dark-border"
                                        )}>
                                            {selectedCodes.includes(lang.code) && <FiCheck className="text-white" size={14} strokeWidth={4} />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        {!searchQuery && <h3 className="px-4 py-2 text-xs font-bold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider">{t('language.all_languages')}</h3>}
                        <div className="space-y-0.5">
                            {filteredLanguages.map(lang => (
                                <button
                                    key={lang.code}
                                    onClick={() => onToggle(lang.code)}
                                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-dark-surface-hover rounded-xl transition-colors"
                                >
                                    <span className="text-[15px] font-medium dark:text-dark-text">{lang.englishName}</span>
                                    <div className={cn(
                                        "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                                        selectedCodes.includes(lang.code)
                                            ? "bg-primary-500 border-primary-500"
                                            : "border-gray-300 dark:border-dark-border"
                                    )}>
                                        {selectedCodes.includes(lang.code) && <FiCheck className="text-white" size={14} strokeWidth={4} />}
                                    </div>
                                </button>
                            ))}
                        </div>
                        {filteredLanguages.length === 0 && (
                            <div className="p-8 text-center text-gray-500 dark:text-dark-text-secondary">
                                {t('language.no_results', { query: searchQuery })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-5 border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-bg">
                    <button
                        onClick={onClose}
                        className="w-full bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white font-bold py-4 rounded-full transition-all shadow-lg shadow-primary-500/20"
                    >
                        {t('language.done')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LanguageSelectionModal;
