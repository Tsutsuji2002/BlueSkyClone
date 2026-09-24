import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiFilter, FiCalendar, FiUser, FiGlobe, FiFolder, FiCheck } from 'react-icons/fi';

export interface SearchFilterState {
    author?: string;
    since?: string;
    until?: string;
    lang?: string;
    domain?: string;
    hasImages?: boolean;
    hasVideo?: boolean;
    hasLinks?: boolean;
    sort?: 'top' | 'latest';
}

interface SearchFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    filters: SearchFilterState;
    onApplyFilters: (newFilters: SearchFilterState) => void;
    onResetFilters: () => void;
}

const LANGUAGES = [
    { code: '', label: 'All Languages' },
    { code: 'en', label: 'English (en)' },
    { code: 'ja', label: 'Japanese (日本語)' },
    { code: 'vi', label: 'Vietnamese (Tiếng Việt)' },
    { code: 'es', label: 'Spanish (Español)' },
    { code: 'fr', label: 'French (Français)' },
    { code: 'de', label: 'German (Deutsch)' },
    { code: 'pt', label: 'Portuguese (Português)' },
    { code: 'zh', label: 'Chinese (中文)' },
    { code: 'ko', label: 'Korean (한국어)' },
];

const SearchFilterModal: React.FC<SearchFilterModalProps> = ({
    isOpen,
    onClose,
    filters,
    onApplyFilters,
    onResetFilters,
}) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<SearchFilterState>(filters);

    useEffect(() => {
        setDraft(filters);
    }, [filters, isOpen]);

    if (!isOpen) return null;

    const handleApply = () => {
        onApplyFilters(draft);
        onClose();
    };

    const handleReset = () => {
        onResetFilters();
        onClose();
    };

    const activeCount = Object.entries(filters).filter(([key, val]) => {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') return val.trim() !== '' && val !== 'top';
        return false;
    }).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-lg bg-white dark:bg-dark-bg rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-border overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-border">
                    <div className="flex items-center gap-2">
                        <FiFilter size={20} className="text-primary-500" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
                            {t('search.filters_title', { defaultValue: 'Advanced Search Filters' })}
                        </h3>
                        {activeCount > 0 && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400 rounded-full">
                                {activeCount} {t('search.active', { defaultValue: 'active' })}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Form Fields Body */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                    {/* Sort Order */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                            {t('search.sort_by', { defaultValue: 'Sort Order' })}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setDraft({ ...draft, sort: 'top' })}
                                className={`py-2 px-4 rounded-xl text-sm font-medium border transition-colors ${
                                    (draft.sort || 'top') === 'top'
                                        ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                                        : 'bg-gray-50 dark:bg-dark-surface text-gray-700 dark:text-dark-text border-gray-200 dark:border-dark-border hover:bg-gray-100'
                                }`}
                            >
                                {t('search.sort_top', { defaultValue: 'Top Results' })}
                            </button>
                            <button
                                type="button"
                                onClick={() => setDraft({ ...draft, sort: 'latest' })}
                                className={`py-2 px-4 rounded-xl text-sm font-medium border transition-colors ${
                                    draft.sort === 'latest'
                                        ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                                        : 'bg-gray-50 dark:bg-dark-surface text-gray-700 dark:text-dark-text border-gray-200 dark:border-dark-border hover:bg-gray-100'
                                }`}
                            >
                                {t('search.sort_latest', { defaultValue: 'Latest First' })}
                            </button>
                        </div>
                    </div>

                    {/* From User / Author */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1.5">
                            {t('search.from_user', { defaultValue: 'From Author / User' })}
                        </label>
                        <div className="relative">
                            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                value={draft.author || ''}
                                onChange={(e) => setDraft({ ...draft, author: e.target.value })}
                                placeholder="e.g. bsky.app or alice.bsky.social"
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:border-primary-500 text-gray-900 dark:text-dark-text"
                            />
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1.5">
                                {t('search.since_date', { defaultValue: 'Since (From)' })}
                            </label>
                            <div className="relative">
                                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="date"
                                    value={draft.since || ''}
                                    onChange={(e) => setDraft({ ...draft, since: e.target.value })}
                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:border-primary-500 text-gray-900 dark:text-dark-text"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1.5">
                                {t('search.until_date', { defaultValue: 'Until (To)' })}
                            </label>
                            <div className="relative">
                                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="date"
                                    value={draft.until || ''}
                                    onChange={(e) => setDraft({ ...draft, until: e.target.value })}
                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:border-primary-500 text-gray-900 dark:text-dark-text"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Language Dropdown */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1.5">
                            {t('search.language', { defaultValue: 'Post Language' })}
                        </label>
                        <div className="relative">
                            <FiGlobe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <select
                                value={draft.lang || ''}
                                onChange={(e) => setDraft({ ...draft, lang: e.target.value })}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:border-primary-500 text-gray-900 dark:text-dark-text appearance-none"
                            >
                                {LANGUAGES.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Domain Filter */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1.5">
                            {t('search.domain', { defaultValue: 'Linked Domain' })}
                        </label>
                        <div className="relative">
                            <FiFolder className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                value={draft.domain || ''}
                                onChange={(e) => setDraft({ ...draft, domain: e.target.value })}
                                placeholder="e.g. github.com or nytimes.com"
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:border-primary-500 text-gray-900 dark:text-dark-text"
                            />
                        </div>
                    </div>

                    {/* Media Type Checkboxes */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                            {t('search.media_types', { defaultValue: 'Media Attachments' })}
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-800 dark:text-dark-text">
                                <input
                                    type="checkbox"
                                    checked={!!draft.hasImages}
                                    onChange={(e) => setDraft({ ...draft, hasImages: e.target.checked })}
                                    className="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500"
                                />
                                <span>{t('search.has_images', { defaultValue: 'Contains images' })}</span>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-800 dark:text-dark-text">
                                <input
                                    type="checkbox"
                                    checked={!!draft.hasVideo}
                                    onChange={(e) => setDraft({ ...draft, hasVideo: e.target.checked })}
                                    className="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500"
                                />
                                <span>{t('search.has_video', { defaultValue: 'Contains videos' })}</span>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-800 dark:text-dark-text">
                                <input
                                    type="checkbox"
                                    checked={!!draft.hasLinks}
                                    onChange={(e) => setDraft({ ...draft, hasLinks: e.target.checked })}
                                    className="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500"
                                />
                                <span>{t('search.has_links', { defaultValue: 'Contains web links' })}</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-surface/30">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text transition-colors"
                    >
                        {t('common.reset', { defaultValue: 'Reset Filters' })}
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-xl shadow-sm transition-colors"
                    >
                        <FiCheck size={16} />
                        <span>{t('common.apply', { defaultValue: 'Apply Filters' })}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SearchFilterModal;
