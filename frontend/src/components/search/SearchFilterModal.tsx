import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiCalendar, FiChevronDown, FiPlus } from 'react-icons/fi';
import Avatar from '../common/Avatar';
import { API_BASE_URL } from '../../constants';

export interface CustomFilterRule {
    id: string;
    mode: 'include' | 'exclude'; // Include | Exclude
    type: 'author' | 'domain' | 'mentions'; // From these people | With this domain | Mentioning these people
    value: string;
}

export interface SearchFilterState {
    query?: string; // All of these words
    noneWords?: string; // None of these words
    exactPhrase?: string; // This exact phrase
    since?: string; // Date (YYYY-MM-DD)
    until?: string; // Date (YYYY-MM-DD)
    lang?: string; // Language code
    media?: string; // 'none' | 'images' | 'video' | 'links'
    postType?: string; // 'none' | 'posts' | 'replies'
    author?: string; // Author handle
    domain?: string;
    customRules?: CustomFilterRule[];
}

interface UserSuggestion {
    id: string;
    handle: string;
    displayName?: string;
    avatarUrl?: string;
}

interface SearchFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    filters: SearchFilterState;
    initialQuery?: string;
    onApplyFilters: (newFilters: SearchFilterState) => void;
    onResetFilters: () => void;
}

const LANGUAGES = [
    { code: '', label: 'No language filter' },
    { code: 'en', label: 'English' },
    { code: 'ja', label: 'Japanese' },
    { code: 'vi', label: 'Vietnamese' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'zh', label: 'Chinese' },
    { code: 'ko', label: 'Korean' },
];

const MEDIA_OPTIONS = [
    { value: '', label: 'No media filter' },
    { value: 'images', label: 'Contains images' },
    { value: 'video', label: 'Contains videos' },
    { value: 'links', label: 'Contains links' },
];

const POST_TYPE_OPTIONS = [
    { value: '', label: 'No post filter' },
    { value: 'posts', label: 'Posts only' },
    { value: 'replies', label: 'Replies only' },
];

const AUTHOR_OPTIONS = [
    { value: '', label: 'No author filter' },
    { value: 'my_posts', label: 'My posts' },
    { value: 'custom', label: 'Specify user...' },
];

const SearchFilterModal: React.FC<SearchFilterModalProps> = ({
    isOpen,
    onClose,
    filters,
    initialQuery = '',
    onApplyFilters,
    onResetFilters,
}) => {
    const { t } = useTranslation();
    
    // Draft states matching Bluesky dialog fields
    const [allWords, setAllWords] = useState<string>('');
    const [noneWords, setNoneWords] = useState<string>('');
    const [exactPhrase, setExactPhrase] = useState<string>('');
    const [sinceDate, setSinceDate] = useState<string>('');
    const [untilDate, setUntilDate] = useState<string>('');
    const [selectedLang, setSelectedLang] = useState<string>('');
    const [selectedMedia, setSelectedMedia] = useState<string>('');
    const [selectedPostType, setSelectedPostType] = useState<string>('');
    const [selectedAuthorMode, setSelectedAuthorMode] = useState<string>('');
    const [authorHandle, setAuthorHandle] = useState<string>('');
    const [customRules, setCustomRules] = useState<CustomFilterRule[]>([]);

    // User Autocomplete state
    const [activeTargetId, setActiveTargetId] = useState<string | null>(null); // 'author' or rule.id
    const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isOpen) {
            setAllWords(filters.query || initialQuery || '');
            setNoneWords(filters.noneWords || '');
            setExactPhrase(filters.exactPhrase || '');
            setSinceDate(filters.since || '');
            setUntilDate(filters.until || '');
            setSelectedLang(filters.lang || '');
            setSelectedMedia(filters.media || '');
            setSelectedPostType(filters.postType || '');
            setAuthorHandle(filters.author || '');
            setSelectedAuthorMode(filters.author ? 'custom' : '');
            setCustomRules(filters.customRules ? [...filters.customRules] : []);
            setActiveTargetId(null);
            setUserSuggestions([]);
        }
    }, [isOpen, filters, initialQuery]);

    if (!isOpen) return null;

    const handleFetchUserSuggestions = (targetId: string, queryText: string) => {
        setActiveTargetId(targetId);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        const cleanQ = queryText.trim().replace(/^@/, '');
        if (!cleanQ) {
            setUserSuggestions([]);
            return;
        }

        debounceTimerRef.current = setTimeout(async () => {
            try {
                setIsSearchingUsers(true);
                const res = await fetch(`${API_BASE_URL}/search/users?q=${encodeURIComponent(cleanQ)}&skip=0&take=5`);
                if (res.ok) {
                    const data = await res.json();
                    const suggestions: UserSuggestion[] = (data || []).map((u: any) => ({
                        id: u.id || u.did || u.handle,
                        handle: u.handle,
                        displayName: u.displayName || u.handle,
                        avatarUrl: u.avatar || u.avatarUrl,
                    }));
                    setUserSuggestions(suggestions);
                }
            } catch (err) {
                console.error('[SearchFilterModal] Failed to search users:', err);
            } finally {
                setIsSearchingUsers(false);
            }
        }, 250);
    };

    const handleSelectUser = (targetId: string, handle: string) => {
        if (targetId === 'author') {
            setAuthorHandle(handle);
        } else {
            setCustomRules(customRules.map(r => r.id === targetId ? { ...r, value: handle } : r));
        }
        setUserSuggestions([]);
        setActiveTargetId(null);
    };

    const handleSearch = () => {
        const resultFilters: SearchFilterState = {
            query: allWords.trim(),
            noneWords: noneWords.trim(),
            exactPhrase: exactPhrase.trim(),
            since: sinceDate,
            until: untilDate,
            lang: selectedLang,
            media: selectedMedia,
            postType: selectedPostType,
            author: selectedAuthorMode === 'my_posts' ? 'me' : authorHandle.trim(),
            customRules: customRules.filter(r => r.value.trim() !== ''),
        };
        onApplyFilters(resultFilters);
        onClose();
    };

    const handleAddFilterRule = () => {
        const newRule: CustomFilterRule = {
            id: String(Date.now()),
            mode: 'include',
            type: 'author',
            value: '',
        };
        setCustomRules([...customRules, newRule]);
    };

    const handleRemoveFilterRule = (id: string) => {
        setCustomRules(customRules.filter(r => r.id !== id));
        if (activeTargetId === id) {
            setActiveTargetId(null);
            setUserSuggestions([]);
        }
    };

    const handleUpdateFilterRule = (id: string, updates: Partial<CustomFilterRule>) => {
        setCustomRules(customRules.map(r => r.id === id ? { ...r, ...updates } : r));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
            {/* Modal Container */}
            <div className="w-full max-w-[600px] bg-white dark:bg-dark-bg rounded-[16px] shadow-2xl border border-gray-200 dark:border-dark-border overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header Bar */}
                <div className="relative flex items-center justify-center px-4 py-2.5 min-h-[50px] border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg">
                    {/* Cancel Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute left-2.5 px-3.5 py-1.5 rounded-full text-[13.5px] font-medium text-[#526580] dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
                    >
                        {t('common.cancel', { defaultValue: 'Cancel' })}
                    </button>

                    {/* Title */}
                    <h3 className="text-[17px] font-semibold text-gray-900 dark:text-dark-text">
                        {t('search.filters_title', { defaultValue: 'Filters' })}
                    </h3>

                    {/* Search Primary Blue Button */}
                    <button
                        type="button"
                        onClick={handleSearch}
                        className="absolute right-2.5 px-4 py-1.5 rounded-full text-[13.5px] font-semibold text-white bg-[#006AFF] hover:bg-blue-600 transition-colors shadow-sm"
                    >
                        {t('nav.search', { defaultValue: 'Search' })}
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">

                    {/* 1. All of these words */}
                    <div>
                        <label className="block text-[13px] font-semibold text-[#405168] dark:text-dark-text-secondary mb-2">
                            {t('search.all_of_these_words', { defaultValue: 'All of these words' })}
                        </label>
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={allWords}
                                onChange={(e) => setAllWords(e.target.value)}
                                placeholder="cats dogs"
                                className="w-full bg-[#EFF2F6] dark:bg-dark-surface py-2.5 pl-3.5 pr-9 rounded-[10px] text-[15px] text-gray-900 dark:text-dark-text placeholder-[#667B99] outline-none border border-transparent focus:border-primary-500 transition-colors"
                            />
                            {allWords && (
                                <button
                                    type="button"
                                    onClick={() => setAllWords('')}
                                    className="absolute right-2.5 p-1 bg-[#EFF2F6] dark:bg-dark-surface hover:bg-gray-300 dark:hover:bg-dark-border rounded-full text-[#405168] dark:text-dark-text-secondary transition-colors"
                                >
                                    <FiX size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 2. None of these words & This exact phrase */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[13px] font-semibold text-[#405168] dark:text-dark-text-secondary mb-2">
                                {t('search.none_of_these_words', { defaultValue: 'None of these words' })}
                            </label>
                            <input
                                type="text"
                                value={noneWords}
                                onChange={(e) => setNoneWords(e.target.value)}
                                placeholder="cows pigs"
                                className="w-full bg-[#EFF2F6] dark:bg-dark-surface py-2.5 px-3.5 rounded-[10px] text-[15px] text-gray-900 dark:text-dark-text placeholder-[#667B99] outline-none border border-transparent focus:border-primary-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-[13px] font-semibold text-[#405168] dark:text-dark-text-secondary mb-2">
                                {t('search.this_exact_phrase', { defaultValue: 'This exact phrase' })}
                            </label>
                            <input
                                type="text"
                                value={exactPhrase}
                                onChange={(e) => setExactPhrase(e.target.value)}
                                placeholder="what's up"
                                className="w-full bg-[#EFF2F6] dark:bg-dark-surface py-2.5 px-3.5 rounded-[10px] text-[15px] text-gray-900 dark:text-dark-text placeholder-[#667B99] outline-none border border-transparent focus:border-primary-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* 3. Since & Until Date Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[13px] font-semibold text-[#405168] dark:text-dark-text-secondary mb-2">
                                {t('search.since_date', { defaultValue: 'Since' })}
                            </label>
                            <div className="relative flex items-center bg-[#EFF2F6] dark:bg-dark-surface rounded-[10px] px-3 border border-transparent focus-within:border-primary-500 transition-colors">
                                <FiCalendar className="text-[#667B99] flex-shrink-0 mr-2" size={18} />
                                <input
                                    type="date"
                                    value={sinceDate}
                                    onChange={(e) => setSinceDate(e.target.value)}
                                    placeholder="dd/mm/yyyy"
                                    className="w-full py-2.5 bg-transparent text-[15px] text-gray-900 dark:text-dark-text outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[13px] font-semibold text-[#405168] dark:text-dark-text-secondary mb-2">
                                {t('search.until_date', { defaultValue: 'Until' })}
                            </label>
                            <div className="relative flex items-center bg-[#EFF2F6] dark:bg-dark-surface rounded-[10px] px-3 border border-transparent focus-within:border-primary-500 transition-colors">
                                <FiCalendar className="text-[#667B99] flex-shrink-0 mr-2" size={18} />
                                <input
                                    type="date"
                                    value={untilDate}
                                    onChange={(e) => setUntilDate(e.target.value)}
                                    placeholder="dd/mm/yyyy"
                                    className="w-full py-2.5 bg-transparent text-[15px] text-gray-900 dark:text-dark-text outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 4. Language & Media Pill Dropdowns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[13px] font-semibold text-[#405168] dark:text-dark-text-secondary mb-2">
                                {t('search.language', { defaultValue: 'Language' })}
                            </label>
                            <div className="relative inline-block w-full">
                                <select
                                    value={selectedLang}
                                    onChange={(e) => setSelectedLang(e.target.value)}
                                    className="w-full appearance-none bg-[#EFF2F6] dark:bg-dark-surface py-2 px-3.5 pr-8 rounded-full text-[13.5px] font-medium text-[#405168] dark:text-dark-text cursor-pointer outline-none border border-transparent focus:border-primary-500 transition-colors"
                                >
                                    {LANGUAGES.map((l) => (
                                        <option key={l.code} value={l.code}>
                                            {l.label}
                                        </option>
                                    ))}
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#405168] dark:text-dark-text-secondary pointer-events-none" size={16} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[13px] font-semibold text-[#405168] dark:text-dark-text-secondary mb-2">
                                {t('search.media', { defaultValue: 'Media' })}
                            </label>
                            <div className="relative inline-block w-full">
                                <select
                                    value={selectedMedia}
                                    onChange={(e) => setSelectedMedia(e.target.value)}
                                    className="w-full appearance-none bg-[#EFF2F6] dark:bg-dark-surface py-2 px-3.5 pr-8 rounded-full text-[13.5px] font-medium text-[#405168] dark:text-dark-text cursor-pointer outline-none border border-transparent focus:border-primary-500 transition-colors"
                                >
                                    {MEDIA_OPTIONS.map((m) => (
                                        <option key={m.value} value={m.value}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#405168] dark:text-dark-text-secondary pointer-events-none" size={16} />
                            </div>
                        </div>
                    </div>

                    {/* 5. Post type & Author Pill Dropdowns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[13px] font-semibold text-[#405168] dark:text-dark-text-secondary mb-2">
                                {t('search.post_type', { defaultValue: 'Post type' })}
                            </label>
                            <div className="relative inline-block w-full">
                                <select
                                    value={selectedPostType}
                                    onChange={(e) => setSelectedPostType(e.target.value)}
                                    className="w-full appearance-none bg-[#EFF2F6] dark:bg-dark-surface py-2 px-3.5 pr-8 rounded-full text-[13.5px] font-medium text-[#405168] dark:text-dark-text cursor-pointer outline-none border border-transparent focus:border-primary-500 transition-colors"
                                >
                                    {POST_TYPE_OPTIONS.map((pt) => (
                                        <option key={pt.value} value={pt.value}>
                                            {pt.label}
                                        </option>
                                    ))}
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#405168] dark:text-dark-text-secondary pointer-events-none" size={16} />
                            </div>
                        </div>

                        <div className="relative">
                            <label className="block text-[13px] font-semibold text-[#405168] dark:text-dark-text-secondary mb-2">
                                {t('search.author', { defaultValue: 'Author' })}
                            </label>
                            <div className="relative inline-block w-full">
                                <select
                                    value={selectedAuthorMode}
                                    onChange={(e) => {
                                        setSelectedAuthorMode(e.target.value);
                                        if (e.target.value !== 'custom') setAuthorHandle('');
                                    }}
                                    className="w-full appearance-none bg-[#EFF2F6] dark:bg-dark-surface py-2 px-3.5 pr-8 rounded-full text-[13.5px] font-medium text-[#405168] dark:text-dark-text cursor-pointer outline-none border border-transparent focus:border-primary-500 transition-colors"
                                >
                                    {AUTHOR_OPTIONS.map((a) => (
                                        <option key={a.value} value={a.value}>
                                            {a.label}
                                        </option>
                                    ))}
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#405168] dark:text-dark-text-secondary pointer-events-none" size={16} />
                            </div>

                            {selectedAuthorMode === 'custom' && (
                                <div className="relative mt-2">
                                    <input
                                        type="text"
                                        value={authorHandle}
                                        onChange={(e) => {
                                            setAuthorHandle(e.target.value);
                                            handleFetchUserSuggestions('author', e.target.value);
                                        }}
                                        onFocus={(e) => handleFetchUserSuggestions('author', e.target.value)}
                                        placeholder="alice.bsky.social"
                                        className="w-full bg-[#EFF2F6] dark:bg-dark-surface py-2 px-3.5 rounded-[10px] text-[14px] text-gray-900 dark:text-dark-text placeholder-[#667B99] outline-none border border-transparent focus:border-primary-500 transition-colors"
                                    />
                                    {/* User Autocomplete Popup */}
                                    {activeTargetId === 'author' && userSuggestions.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-[14px] shadow-xl overflow-hidden p-1.5">
                                            {userSuggestions.map((u) => (
                                                <button
                                                    type="button"
                                                    key={u.id}
                                                    onClick={() => handleSelectUser('author', u.handle)}
                                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-[10px] transition-colors text-left"
                                                >
                                                    <Avatar src={u.avatarUrl} alt={u.displayName || u.handle} size="md" />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-[14px] font-bold text-gray-900 dark:text-dark-text truncate">
                                                            {u.displayName || u.handle}
                                                        </div>
                                                        <div className="text-[12.5px] text-gray-500 dark:text-dark-text-secondary truncate">
                                                            @{u.handle}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 6. Dynamic Filter Cards Area */}
                    {customRules.length > 0 && (
                        <div className="space-y-3 pt-1">
                            {customRules.map((rule) => (
                                <div
                                    key={rule.id}
                                    className="p-3 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl shadow-xs space-y-2.5"
                                >
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {/* Include / Exclude Pill */}
                                        <div className="relative">
                                            <select
                                                value={rule.mode}
                                                onChange={(e) => handleUpdateFilterRule(rule.id, { mode: e.target.value as any })}
                                                className="appearance-none bg-[#EFF2F6] dark:bg-dark-surface py-1.5 pl-3 pr-7 rounded-full text-[13px] font-medium text-[#405168] dark:text-dark-text cursor-pointer outline-none"
                                            >
                                                <option value="include">Include</option>
                                                <option value="exclude">Exclude</option>
                                            </select>
                                            <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#405168] pointer-events-none" size={14} />
                                        </div>

                                        {/* Filter Type Pill */}
                                        <div className="relative">
                                            <select
                                                value={rule.type}
                                                onChange={(e) => handleUpdateFilterRule(rule.id, { type: e.target.value as any })}
                                                className="appearance-none bg-[#EFF2F6] dark:bg-dark-surface py-1.5 pl-3 pr-7 rounded-full text-[13px] font-medium text-[#405168] dark:text-dark-text cursor-pointer outline-none"
                                            >
                                                <option value="author">From these people</option>
                                                <option value="domain">With this domain</option>
                                                <option value="mentions">Mentioning these people</option>
                                            </select>
                                            <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#405168] pointer-events-none" size={14} />
                                        </div>

                                        <div className="flex-1" />

                                        {/* Remove Rule Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFilterRule(rule.id)}
                                            className="p-1.5 bg-[#EFF2F6] dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-border rounded-full text-[#405168] dark:text-dark-text transition-colors"
                                        >
                                            <FiX size={15} />
                                        </button>
                                    </div>

                                    {/* Input Value with User Autocomplete */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={rule.value}
                                            onChange={(e) => {
                                                handleUpdateFilterRule(rule.id, { value: e.target.value });
                                                if (rule.type === 'author' || rule.type === 'mentions') {
                                                    handleFetchUserSuggestions(rule.id, e.target.value);
                                                }
                                            }}
                                            onFocus={(e) => {
                                                if (rule.type === 'author' || rule.type === 'mentions') {
                                                    handleFetchUserSuggestions(rule.id, e.target.value);
                                                }
                                            }}
                                            placeholder={
                                                rule.type === 'domain'
                                                    ? 'bsky.app atproto.com'
                                                    : 'alice.bsky.social bob.bsky.social'
                                            }
                                            className="w-full bg-[#EFF2F6] dark:bg-dark-surface py-2 px-3 rounded-[10px] text-[14.5px] text-gray-900 dark:text-dark-text placeholder-[#667B99] outline-none border border-transparent focus:border-primary-500 transition-colors"
                                        />

                                        {/* User Autocomplete Popup Card matching Pic 3 */}
                                        {activeTargetId === rule.id && userSuggestions.length > 0 && (
                                            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-[14px] shadow-xl overflow-hidden p-1.5">
                                                {userSuggestions.map((u) => (
                                                    <button
                                                        type="button"
                                                        key={u.id}
                                                        onClick={() => handleSelectUser(rule.id, u.handle)}
                                                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-[10px] transition-colors text-left"
                                                    >
                                                        <Avatar src={u.avatarUrl} alt={u.displayName || u.handle} size="md" />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-[14px] font-bold text-gray-900 dark:text-dark-text truncate">
                                                                {u.displayName || u.handle}
                                                            </div>
                                                            <div className="text-[12.5px] text-gray-500 dark:text-dark-text-secondary truncate">
                                                                @{u.handle}
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* "+ Add filter" Button */}
                    <div>
                        <button
                            type="button"
                            onClick={handleAddFilterRule}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#EFF2F6] dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-border text-[13px] font-semibold text-[#405168] dark:text-dark-text transition-colors mt-1"
                        >
                            <FiPlus size={16} />
                            <span>{t('search.add_filter', { defaultValue: 'Add filter' })}</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SearchFilterModal;
