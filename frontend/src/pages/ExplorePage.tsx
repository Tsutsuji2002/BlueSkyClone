import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { RootState } from '../redux/store';
import { FiSearch, FiX, FiPlus, FiGrid, FiMenu, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { BsPatchCheckFill } from 'react-icons/bs';

import { useTranslation } from 'react-i18next';
import LoadingIndicator from '../components/common/LoadingIndicator';
import { cn } from '../utils/classNames';
import { Feed } from '../types';
import FeedAvatar from '../components/common/FeedAvatar';
import Avatar from '../components/common/Avatar';
import UserHoverCard from '../components/common/UserHoverCard';
import { openMobileMenu } from '../redux/slices/modalsSlice';
import { fetchTrending, fetchInterestsList } from '../redux/slices/trendingSlice';
import { fetchTrendingFeeds, pinFeed, unpinFeed, fetchSubscribedFeeds } from '../redux/slices/feedsSlice';
import PostCard from '../components/feed/PostCard';
import PostSkeleton from '../components/feed/PostSkeleton';
import SuggestedUsersForExplore from '../components/explore/SuggestedUsersForExplore';
import api from '../utils/api';
import InterestsEditor from '../components/feed/InterestsEditor';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { feedActionKey } from '../utils/feedKeys';
import { useGetActorStarterPacksQuery } from '../redux/api/starterPackApi';

// Deterministic avatar colour from handle string
const AVATAR_COLORS = ['4f46e5','0284c7','059669','d97706','dc2626','7c3aed','0891b2','65a30d'];
const avatarBg = (seed: string) => AVATAR_COLORS[seed.charCodeAt(0) % AVATAR_COLORS.length];
const uiAvatar = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${avatarBg(name)}&color=fff&size=80&bold=true`;


// ─────────────────────────────────────────────────────────────────────────────
// StarterPacksExploreSection – Bluesky-style starter pack cards with
// a wide member avatar strip, pack name, creator, and "Open pack" button.
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_STARTER_PACKS = [
    {
        uri: 'at://did:plc:filmcritics/app.bsky.graph.starterpack/1',
        record: { name: 'Film & TV Magazines', description: 'A collection of film critics, cinema writers, and movie enthusiasts on Bluesky.' },
        creator: { handle: 'filmcritics.org.uk', displayName: 'Film Critics' },
        listItemsSample: [
            { subject: { did: '1',  handle: 'a', avatar: 'https://i.pravatar.cc/80?img=1'  } },
            { subject: { did: '2',  handle: 'b', avatar: 'https://i.pravatar.cc/80?img=3'  } },
            { subject: { did: '3',  handle: 'c', avatar: 'https://i.pravatar.cc/80?img=5'  } },
            { subject: { did: '4',  handle: 'd', avatar: 'https://i.pravatar.cc/80?img=7'  } },
            { subject: { did: '5',  handle: 'e', avatar: 'https://i.pravatar.cc/80?img=11' } },
            { subject: { did: '6',  handle: 'f', avatar: 'https://i.pravatar.cc/80?img=13' } },
            { subject: { did: '7',  handle: 'g', avatar: 'https://i.pravatar.cc/80?img=15' } },
            { subject: { did: '8',  handle: 'h', avatar: 'https://i.pravatar.cc/80?img=17' } },
            { subject: { did: '9',  handle: 'i', avatar: 'https://i.pravatar.cc/80?img=19' } },
        ],
        list: { listItemCount: 141 },
    },
    {
        uri: 'at://did:plc:streetphoto/app.bsky.graph.starterpack/1',
        record: { name: 'Street Photographers', description: 'The best street photographers on Bluesky — from documentary to fine art.' },
        creator: { handle: 'antonpodolsky.bsky.social', displayName: 'Anton Podolsky' },
        listItemsSample: [
            { subject: { did: '10', handle: 'sp1', avatar: 'https://i.pravatar.cc/80?img=21' } },
            { subject: { did: '11', handle: 'sp2', avatar: 'https://i.pravatar.cc/80?img=23' } },
            { subject: { did: '12', handle: 'sp3', avatar: 'https://i.pravatar.cc/80?img=25' } },
            { subject: { did: '13', handle: 'sp4', avatar: 'https://i.pravatar.cc/80?img=27' } },
            { subject: { did: '14', handle: 'sp5', avatar: 'https://i.pravatar.cc/80?img=29' } },
            { subject: { did: '15', handle: 'sp6', avatar: 'https://i.pravatar.cc/80?img=31' } },
            { subject: { did: '16', handle: 'sp7', avatar: 'https://i.pravatar.cc/80?img=33' } },
            { subject: { did: '17', handle: 'sp8', avatar: 'https://i.pravatar.cc/80?img=35' } },
            { subject: { did: '18', handle: 'sp9', avatar: 'https://i.pravatar.cc/80?img=37' } },
        ],
        list: { listItemCount: 24 },
    },
    {
        uri: 'at://did:plc:naturephoto/app.bsky.graph.starterpack/1',
        record: { name: 'Top-Notch Nature Photographers 📷 Starter Pack', description: 'Wildlife, landscape, and macro photographers documenting the natural world.' },
        creator: { handle: 'nickchillphoto.com', displayName: 'Nick Chill Photo' },
        listItemsSample: [
            { subject: { did: '19', handle: 'np1', avatar: 'https://i.pravatar.cc/80?img=39' } },
            { subject: { did: '20', handle: 'np2', avatar: 'https://i.pravatar.cc/80?img=41' } },
            { subject: { did: '21', handle: 'np3', avatar: 'https://i.pravatar.cc/80?img=43' } },
            { subject: { did: '22', handle: 'np4', avatar: 'https://i.pravatar.cc/80?img=45' } },
            { subject: { did: '23', handle: 'np5', avatar: 'https://i.pravatar.cc/80?img=47' } },
            { subject: { did: '24', handle: 'np6', avatar: 'https://i.pravatar.cc/80?img=49' } },
            { subject: { did: '25', handle: 'np7', avatar: 'https://i.pravatar.cc/80?img=51' } },
            { subject: { did: '26', handle: 'np8', avatar: 'https://i.pravatar.cc/80?img=53' } },
            { subject: { did: '27', handle: 'np9', avatar: 'https://i.pravatar.cc/80?img=55' } },
        ],
        list: { listItemCount: 96 },
    },
] as any[];


const MAX_VISIBLE_AVATARS = 9;

const StarterPacksExploreSection: React.FC = () => {
    const navigate = useNavigate();
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const { data, isLoading } = useGetActorStarterPacksQuery(
        { actor: currentUser?.did || currentUser?.handle || 'bsky.app', limit: 10 },
        { skip: !currentUser }
    );

    const packs: any[] = (data?.starterPacks?.length ? data.starterPacks : FALLBACK_STARTER_PACKS);

    return (
        <div className="flex flex-col bg-white dark:bg-dark-bg border-t border-[#dce2ea] dark:border-dark-border">
            {/* Header */}
            <div className="flex flex-row items-center p-[24px_16px_12px] gap-1">
                <div className="z-20 w-5 h-5 -ml-0.5 flex items-center justify-center">
                    <svg fill="none" width="20" viewBox="0 0 24 24" height="20" className="text-black dark:text-white">
                        <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M11.26 5.227 5.02 6.899c-.734.197-1.17.95-.973 1.685l1.672 6.24c.197.734.951 1.17 1.685.973l6.24-1.672c.734-.197 1.17-.951.973-1.685L12.945 6.2a1.375 1.375 0 0 0-1.685-.973Zm-6.566.459a2.632 2.632 0 0 0-1.86 3.223l1.672 6.24a2.632 2.632 0 0 0 3.223 1.861l6.24-1.672a2.631 2.631 0 0 0 1.861-3.223l-1.672-6.24a2.632 2.632 0 0 0-3.223-1.861l-6.24 1.672Z"></path>
                        <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M15.138 18.411a4.606 4.606 0 1 0 0-9.211 4.606 4.606 0 0 0 0 9.211Zm0 1.257a5.862 5.862 0 1 0 0-11.724 5.862 5.862 0 0 0 0 11.724Z"></path>
                    </svg>
                </div>
                <div className="text-[16.9px] leading-[22px] font-semibold text-black dark:text-white tracking-[0.25px] flex-1">
                    Starter Packs
                </div>
            </div>

            {/* Pack cards */}
            {packs.map((pack: any) => {
                const members: any[] = pack.listItemsSample || [];
                const totalCount: number = pack.list?.listItemCount ?? members.length;
                const visibleMembers = members.slice(0, MAX_VISIBLE_AVATARS);
                const extraCount = Math.max(0, totalCount - MAX_VISIBLE_AVATARS);

                return (
                    <div
                        key={pack.uri}
                        onClick={() => navigate(`/starter-pack?uri=${encodeURIComponent(pack.uri)}`)}
                        className="mx-4 mb-3 cursor-pointer"
                    >
                        {/* Card matching sample HTML: p-4 gap-3 border rounded-lg overflow-hidden */}
                        <div className="w-full p-4 gap-3 border border-[#dce2ea] dark:border-dark-border rounded-lg overflow-hidden flex flex-col hover:bg-[#eff2f6]/30 dark:hover:bg-dark-surface/30 transition-colors">
                            {/* Avatar row: each slot = 8.33% width, inner wrapper = 120% for overlap */}
                            <div className="flex flex-row items-center" style={{ position: 'relative', width: '98.33%' }}>
                                {visibleMembers.map((item: any, i: number) => {
                                    const sub = item.subject || item;
                                    const avatarSrc = sub.avatar || uiAvatar(sub.displayName || sub.handle || String(i));
                                    const totalSlots = visibleMembers.length + (extraCount > 0 ? 1 : 0);
                                    return (
                                        <div key={sub.did || i} style={{ width: '8.33333%', zIndex: 100 - i }}>
                                            <div style={{ position: 'relative', width: '120%' }}>
                                                <div style={{ borderRadius: '999px', backgroundColor: 'rgb(249,250,251)', paddingTop: '100%' }}>
                                                    <div style={{ width: 53, height: 53, position: 'absolute', inset: 0 }}>
                                                        <div style={{ overflow: 'hidden', width: 53, height: 53, borderRadius: 26, backgroundColor: 'rgb(249,250,251)' }}>
                                                            <img
                                                                src={avatarSrc}
                                                                alt=""
                                                                style={{ objectPosition: 'left 50% top 50%', width: '100%', height: '100%', position: 'absolute', left: 0, top: 0, objectFit: 'cover' }}
                                                                onError={(e) => { (e.target as HTMLImageElement).src = uiAvatar(sub.handle || String(i)); }}
                                                            />
                                                        </div>
                                                        <div style={{ position: 'absolute', inset: 0, borderWidth: 1, borderColor: 'rgb(220,226,234)', opacity: 0.6, pointerEvents: 'none', borderRadius: 26 }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {extraCount > 0 && (
                                    <div style={{ width: '8.33333%', zIndex: 1 }}>
                                        <div style={{ position: 'relative', width: '120%' }}>
                                            <div style={{ paddingTop: '100%' }}>
                                                <div style={{ position: 'absolute', inset: 0, borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgb(135,152,176)' }}>
                                                    <span style={{ fontSize: 15, letterSpacing: '0.25px', color: 'rgb(255,255,255)', lineHeight: '20px', fontWeight: 600 }}>+{extraCount}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Pack info row + Open pack button */}
                            <div className="w-full flex flex-row items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="text-[15px] leading-[20px] font-semibold text-black dark:text-white truncate">
                                        {pack.record?.name || pack.name || 'Starter Pack'}
                                    </div>
                                    <div className="text-[13.1px] leading-[17px] text-[#405168] dark:text-dark-text-secondary truncate">
                                        By @{pack.creator?.handle || 'unknown'}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/starter-pack?uri=${encodeURIComponent(pack.uri)}`); }}
                                    style={{ backgroundColor: 'rgb(239,242,246)', borderRadius: '999px', padding: '8px 14px', zIndex: 50 }}
                                    className="flex-shrink-0 text-[13.1px] leading-[17px] font-medium text-[#405168] dark:text-dark-text-secondary hover:brightness-95 transition-all"
                                >
                                    Open pack
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const ExplorePage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { accounts, interests, topics } = useAppSelector((state: RootState) => state.trending);
    const { feeds } = useAppSelector((state: RootState) => state.feeds);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const { isAuthenticated } = useAppSelector((state: RootState) => state.auth);
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [isSearchUIActive, setIsSearchUIActive] = useState(false);
    const [hideInterestsCard, setHideInterestsCard] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const observerTarget = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        dispatch(fetchTrending());
        dispatch(fetchInterestsList());
        dispatch(fetchTrendingFeeds());
        dispatch(fetchSubscribedFeeds());
    }, [dispatch]);



    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            if (query.startsWith('@')) {
                const userQuery = query.slice(1);
                if (userQuery.length > 0) {
                    const response = await api.search.users(userQuery);
                    setResults((response.data || []).map((u: any) => ({ ...u, _type: 'user' })));
                } else {
                    setResults([]);
                }
            } else {
                const [usersRes, feedsRes] = await Promise.all([
                    api.search.users(query, 0, 5),
                    api.search.feeds(query, 0, 5)
                ]);

                const combined = [
                    ...(usersRes.data || []).map((u: any) => ({ ...u, _type: 'user' })),
                    ...(feedsRes.data || []).map((f: any) => ({ ...f, _type: 'feed' }))
                ];
                setResults(combined);
            }
        } catch (error) {
            console.error('Search failed:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                handleSearch(searchQuery);
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, handleSearch]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleResultClick = (result: any) => {
        if (result._type === 'feed') {
            const fk = feedActionKey(result as Feed);
            navigate(`/feeds/${encodeURIComponent(fk)}`);
        } else {
            navigate(`/profile/${result.handle}`);
        }
        setSearchQuery('');
        setShowResults(false);
        setIsSearchUIActive(false);
    };

    const handleCancelSearch = () => {
        setIsSearchUIActive(false);
        setSearchQuery('');
        setResults([]);
        setShowResults(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
            setShowResults(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setResults([]);
        setShowResults(false);
        if (searchInputRef.current) searchInputRef.current.focus();
    };


    const handlePinToggle = async (e: React.MouseEvent, feed: Feed) => {
        e.stopPropagation();
        const key = feedActionKey(feed);
        if (feed.isPinned) {
            await dispatch(unpinFeed(key));
        } else {
            await dispatch(pinFeed(key));
        }
        dispatch(fetchSubscribedFeeds());
    };

    useEffect(() => {
        if (isSearchUIActive && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchUIActive]);

    useDocumentTitle(t('nav.explore'));

    return (
        <div className="min-h-screen border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg">
                {/* Header */}
                <div className="sticky top-0 z-40 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border p-4 flex items-center gap-4">
                    {!isSearchUIActive && (
                        <button
                            onClick={() => dispatch(openMobileMenu())}
                            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full flex-shrink-0"
                        >
                            <FiMenu size={24} className="text-gray-700 dark:text-dark-text" />
                        </button>
                    )}
                    <div className="relative group flex-1" ref={searchRef}>
                        <div className="relative flex items-center gap-3">
                            <div className="relative flex-1">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder={t('explore.search_placeholder')}
                                    className="w-full bg-gray-100 dark:bg-dark-surface py-3 pl-12 pr-10 rounded-xl text-[15px] focus:bg-white dark:focus:bg-dark-bg border border-transparent focus:border-primary-500 outline-none transition-colors dark:text-dark-text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setShowResults(true);
                                    }}
                                    onFocus={() => {
                                        setShowResults(true);
                                        setIsSearchUIActive(true);
                                    }}
                                    onKeyDown={handleKeyDown}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={clearSearch}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                                    >
                                        <FiX size={16} />
                                    </button>
                                )}
                            </div>
                            {isSearchUIActive && (
                                <button 
                                    onClick={handleCancelSearch}
                                    className="text-primary-500 font-medium hover:underline px-1"
                                >
                                    {t('common.cancel')}
                                </button>
                            )}
                        </div>

                        {/* Dropdown Results */}
                        {showResults && isSearchUIActive && (searchQuery.trim() || loading) && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl shadow-xl z-50 overflow-hidden min-h-[100px] max-h-[80vh] flex flex-col">
                                <div className="p-3 border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-surface/50">
                                    <p className="text-[15px] font-medium text-gray-900 dark:text-dark-text">
                                        {t('search.searching_for', { query: searchQuery })}
                                    </p>
                                </div>

                                <div className="overflow-y-auto flex-1">
                                    {loading ? (
                                        <div className="p-8 flex justify-center">
                                            <LoadingIndicator size="md" />
                                        </div>
                                    ) : results.length > 0 ? (
                                        <div className="py-2">
                                            {results.map((result) => (
                                                <button
                                                    key={result.id || result.handle}
                                                    onClick={() => handleResultClick(result)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors text-left"
                                                >
                                                    {result._type === 'feed' ? (
                                                        <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xl">
                                                            {result.avatarUrl || result.avatar ? (
                                                                <img src={result.avatarUrl || result.avatar} alt="" className="w-full h-full rounded-lg object-cover" />
                                                            ) : (
                                                                result.name?.[0] || 'F'
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <UserHoverCard user={result}>
                                                            <div onClick={(e) => { e.stopPropagation(); handleResultClick(result); }}>
                                                                <Avatar
                                                                    src={result.avatarUrl || result.avatar}
                                                                    alt={result.displayName}
                                                                    size="md"
                                                                />
                                                            </div>
                                                        </UserHoverCard>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-gray-900 dark:text-dark-text truncate">
                                                            {result._type === 'feed' ? result.name : (
                                                                <UserHoverCard user={result}>
                                                                    <span>{result.displayName}</span>
                                                                </UserHoverCard>
                                                            )}
                                                        </p>
                                                        <p className="text-[14px] text-gray-500 dark:text-dark-text-secondary truncate">
                                                            {result._type === 'feed' ? (
                                                                <>Feed · @{result.handle}</>
                                                            ) : (
                                                                <>@{result.handle}</>
                                                            )}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : searchQuery.trim() ? (
                                        <div className="p-8 text-center text-gray-500 dark:text-dark-text-secondary cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface"
                                            onClick={() => navigate(`/search?q=${encodeURIComponent(searchQuery)}`)}>
                                            <p className="font-medium text-primary-500">{t('search.goto_search', { query: searchQuery })}</p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-6 p-4">
                    {isSearchUIActive ? (
                        <section className="flex flex-col">
                            {searchQuery.trim() && (
                                <div className="mb-4">
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider px-2">
                                        {t('search.searching_for', { query: searchQuery })}
                                    </h3>
                                </div>
                            )}

                            <div className="flex flex-col">
                                {loading ? (
                                    <div className="p-8 flex justify-center">
                                        <LoadingIndicator size="md" />
                                    </div>
                                ) : results.length > 0 ? (
                                    <div className="flex flex-col">
                                        {results.map((result) => (
                                            <button
                                                key={result.id || result.did || result.handle}
                                                onClick={() => handleResultClick(result)}
                                                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors text-left border-b border-gray-100 dark:border-dark-border last:border-0"
                                            >
                                                {result._type === 'feed' ? (
                                                    <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xl flex-shrink-0">
                                                        {result.avatarUrl || result.avatar ? (
                                                            <img src={result.avatarUrl || result.avatar} alt="" className="w-full h-full rounded-lg object-cover" />
                                                        ) : (
                                                            result.name?.[0] || 'F'
                                                        )}
                                                    </div>
                                                ) : (
                                                    <UserHoverCard user={result}>
                                                        <div onClick={(e) => { e.stopPropagation(); handleResultClick(result); }}>
                                                            <Avatar
                                                                src={result.avatarUrl || result.avatar}
                                                                alt={result.displayName}
                                                                size="lg"
                                                            />
                                                        </div>
                                                    </UserHoverCard>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <p className="font-bold text-gray-900 dark:text-dark-text truncate">
                                                            {result._type === 'feed' ? result.name : (
                                                                <UserHoverCard user={result}>
                                                                    <span>{result.displayName}</span>
                                                                </UserHoverCard>
                                                            )}
                                                        </p>
                                                        {result.isVerified && <BsPatchCheckFill className="text-blue-500 flex-shrink-0" size={14} />}
                                                    </div>
                                                    <p className="text-[14px] text-gray-500 dark:text-dark-text-secondary truncate">
                                                        {result._type === 'feed' ? (
                                                            <>Feed · @{result.handle}</>
                                                        ) : (
                                                            <>@{result.handle}</>
                                                        )}
                                                    </p>
                                                    {result.bio && (
                                                        <p className="text-[14px] text-gray-600 dark:text-dark-text-secondary line-clamp-1 mt-0.5">
                                                            {result.bio}
                                                        </p>
                                                    )}
                                                </div>
                                                
                                                {result._type === 'user' && (currentUser?.id !== result.id) && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Optional: add follow toggle here if needed, but the card has it
                                                        }}
                                                        className={cn(
                                                            "px-4 py-1.5 rounded-full text-sm font-bold border",
                                                            result.isFollowing 
                                                                ? "border-gray-300 dark:border-dark-border text-gray-900 dark:text-dark-text"
                                                                : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent"
                                                        )}
                                                    >
                                                        {result.isFollowing ? t('profile.following') : t('profile.follow')}
                                                    </button>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                ) : searchQuery.trim() ? (
                                    <div className="p-12 text-center text-gray-500 dark:text-dark-text-secondary">
                                        <p>{t('search.no_results', { query: searchQuery })}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-6">
                                        <SuggestedUsersForExplore />
                                        <div className="p-12 text-center text-gray-500 dark:text-dark-text-secondary">
                                            <p>{t('common.start_typing')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    ) : (
                        <div className="w-full max-w-[600px] mx-auto pb-[100px] flex flex-col">
                            {/* 1. Your interests card */}
                            {!hideInterestsCard && (
                                <div className="p-4 border-b border-[#c0ca98] dark:border-dark-border gap-3 flex flex-col relative bg-white dark:bg-dark-bg">
                                    <button
                                        aria-label="Hide this card"
                                        onClick={() => setHideInterestsCard(true)}
                                        className="flex flex-row items-center justify-center bg-white dark:bg-dark-surface h-[33px] w-[33px] rounded-full absolute top-2 right-2 hover:bg-gray-100 dark:hover:bg-dark-surface/80 transition-colors z-20"
                                    >
                                        <div className="w-[17px] h-[17px] relative">
                                            <div className="absolute w-[18px] h-[18px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                                <svg fill="none" width="18" viewBox="0 0 24 24" height="18" className="text-[#526580] pointer-events-none">
                                                    <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L12 10.586l6.293-6.293a1 1 0 1 1 1.414 1.414L13.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414L12 13.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L10.586 12 4.293 5.707a1 1 0 0 1 0-1.414Z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                    </button>

                                    <div className="flex flex-row gap-2 items-center">
                                        <svg fill="none" viewBox="0 0 24 24" width="20" height="20" className="text-black dark:text-white shrink-0">
                                            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M7 3a1 1 0 0 1 1 1v2h2a1 1 0 1 1 0 2H8v2a1 1 0 1 1-2 0V8H4a1 1 0 0 1 0-2h2V4a1 1 0 0 1 1-1Zm6 4a4 4 0 1 1 8 0 4 4 0 0 1-8 0Zm4-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3 14a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6Zm2 1v4h4v-4H5Zm9.171-.829a1 1 0 0 1 1.415 0L17 15.585l1.414-1.414a1 1 0 1 1 1.414 1.414L18.414 17l1.414 1.414a1 1 0 0 1-1.414 1.414L17 18.414l-1.415 1.414a1 1 0 0 1-1.414-1.414l1.415-1.415-1.415-1.414a1 1 0 0 1 0-1.414Z"></path>
                                        </svg>
                                        <div className="text-[16.9px] leading-[22px] font-semibold tracking-[0.25px] text-black dark:text-white">
                                            Your interests
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-[6px]">
                                        {['Art', 'Comics', 'Books', 'Culture', 'Software Dev', 'Video Games', 'Journalism', 'Movies', 'Music', 'News', 'Tech', 'Sports', 'Science', 'Writers', 'Food', 'Politics', 'Photography', 'Animals'].map((tag) => (
                                            <div key={tag} className="flex justify-center items-center rounded-full bg-[#f9fafb] dark:bg-dark-surface px-4 h-8">
                                                <span className="text-[13.1px] leading-[17px] tracking-[0.25px] text-[#232e3e] dark:text-dark-text">
                                                    {tag}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="text-[13.1px] leading-[17px] tracking-[0.25px] text-black dark:text-white">
                                        Your interests help us find what you like!
                                    </div>

                                    <button
                                        onClick={() => navigate('/settings/interests')}
                                        aria-label="Edit interests"
                                        className="flex flex-row items-center justify-center bg-[#006aff] hover:bg-[#005cd6] text-white rounded-full py-2 px-3.5 gap-[5px] transition-colors"
                                    >
                                        <span className="text-[13.1px] leading-[17px] font-medium tracking-[0.25px]">
                                            Edit interests
                                        </span>
                                    </button>
                                </div>
                            )}

                            {/* 2. Trending Section */}
                            <div className="flex flex-col pb-3 bg-white dark:bg-dark-bg">
                                <div className="flex flex-row items-center px-4 pt-6 pb-3 gap-1 bg-white dark:bg-dark-bg border-b border-[#dce2ea] dark:border-dark-border">
                                    <div className="z-20 w-5 h-5 -ml-0.5 flex items-center justify-center">
                                        <svg fill="none" width="20" viewBox="0 0 24 24" height="20" className="text-black dark:text-white">
                                            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M15 7a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V9.414L14.414 15a2 2 0 0 1-2.828 0L9 12.414l-5.293 5.293a1 1 0 0 1-1.414-1.414L7.586 11a2 2 0 0 1 2.828 0L13 13.586 18.586 8H16a1 1 0 0 1-1-1Z"></path>
                                        </svg>
                                    </div>
                                    <div className="text-[16.9px] leading-[22px] font-semibold text-black dark:text-white tracking-[0.25px] flex-1">
                                        Trending
                                    </div>
                                    <button aria-label="Trending options" className="flex items-center justify-center bg-white dark:bg-dark-surface h-[33px] w-[33px] rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface/80 transition-colors">
                                        <div className="w-[17px] h-[17px] relative">
                                            <div className="absolute w-[18px] h-[18px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                                <svg fill="none" width="18" viewBox="0 0 24 24" height="18" className="text-[#526580]">
                                                    <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M2 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm16 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm-6-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                    </button>
                                </div>

                                {/* Trending Topics List */}
                                {(topics.length > 0 ? topics.slice(0, 5) : [
                                    { id: '1', hashtag: 'Andy Burnham pushes socialist reforms', description: "Critics compare his National Care Service plan to Scotland's existing SNP policy.", postsCount: '627 posts' },
                                    { id: '2', hashtag: 'Celebrity Traitors series 2 premieres', description: 'Reality TV fans react to the new season premiere of Celebrity Traitors.', postsCount: '2.1K posts' },
                                    { id: '3', hashtag: 'Man City financial charges case', description: "Panel decision on City's financial charges; legal costs reportedly at issue.", postsCount: '6.8K posts' },
                                    { id: '4', hashtag: 'Trump weighs diesel export ban', description: 'Trump backs halting US diesel exports as record prices squeeze consumers and businesses.', postsCount: '14.3K posts' },
                                    { id: '5', hashtag: 'Big Brother 26 jury prepares finale', description: 'Houseguests prepare for the season finale as the jury deliberates.', postsCount: '3.2K posts' }
                                ]).map((item: any, index: number) => {
                                    const hashtagStr = item.hashtag || item.title || item.topic || '';
                                    const descStr = item.description || 'Recent discussions and trending activity on Bluesky.';
                                    const postsLabel = item.postsCount || `${((index + 1) * 2.4).toFixed(1)}K posts`;

                                    // Use real Account avatars from redux, falling back to deterministic ui-avatars
                                    const avatarSeeds = [hashtagStr, hashtagStr + '1', hashtagStr + '2'];
                                    const avatarList = accounts.length >= 3
                                        ? accounts.slice(index % Math.max(accounts.length - 2, 1), (index % Math.max(accounts.length - 2, 1)) + 3).map((a: any) => (a.avatar && a.avatar.startsWith('http')) ? a.avatar : uiAvatar(a.displayName || a.handle || 'U'))
                                        : avatarSeeds.map(s => uiAvatar(s.slice(0, 2)));

                                    return (
                                        <div
                                            key={item.id || index}
                                            onClick={() => navigate(`/search?q=${encodeURIComponent(hashtagStr)}`)}
                                            className="flex flex-row items-center justify-start border-b border-[#dce2ea] dark:border-dark-border cursor-pointer hover:bg-[#eff2f6]/50 dark:hover:bg-dark-surface/50 transition-colors"
                                        >
                                            <div className="p-[12px_20px] w-full flex flex-row gap-2">
                                                <div className="text-[15px] leading-[20px] font-medium text-[#8798b0] tabular-nums">
                                                    {index + 1}.
                                                </div>

                                                <div className="flex-1 min-w-0 flex flex-col gap-[2px]">
                                                    <div className="text-[15px] leading-[20px] font-semibold text-black dark:text-white line-clamp-2">
                                                        {hashtagStr.replace('#', '')}
                                                    </div>

                                                    <div className="text-[13.1px] leading-[17px] text-[#405168] dark:text-dark-text-secondary line-clamp-2">
                                                        {descStr}
                                                    </div>

                                                    <div className="mt-[4px] flex flex-row gap-2 items-center">
                                                        <div className="flex flex-row" style={{ width: '56px' }}>
                                                            {avatarList.map((url, i) => (
                                                                <div
                                                                    key={i}
                                                                    className="w-6 h-6 rounded-full overflow-hidden border-2 border-white dark:border-dark-bg bg-[#e8edf3] flex-shrink-0"
                                                                    style={{ marginLeft: i === 0 ? 0 : '-8px', zIndex: 3 - i, position: 'relative' }}
                                                                >
                                                                    <img
                                                                        src={url}
                                                                        alt=""
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => { (e.target as HTMLImageElement).src = uiAvatar(hashtagStr.slice(i, i + 2)); }}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="text-[13.1px] leading-[17px] text-[#405168] dark:text-dark-text-secondary min-w-0">
                                                            {postsLabel}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 3. Discover feeds Section */}
                            <div className="flex flex-col bg-white dark:bg-dark-bg border-t border-[#dce2ea] dark:border-dark-border">
                                <div className="flex flex-row items-center p-[24px_16px_12px] gap-1 bg-white dark:bg-dark-bg">
                                    <div className="z-20 w-5 h-5 -ml-0.5 flex items-center justify-center">
                                        <svg fill="none" width="20" viewBox="0 0 24 24" height="20" className="text-black dark:text-white">
                                            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M4 5a1 1 0 0 0 0 2h16a1 1 0 1 0 0-2H4Zm0 12a1 1 0 1 0 0 2h3a1 1 0 1 0 0-2H4Zm-1-5a1 1 0 0 1 1-1h5a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm14-3a1 1 0 0 1 .92.606l1.342 3.132 3.132 1.343a1 1 0 0 1 0 1.838l-3.132 1.343-1.343 3.132a1 1 0 0 1-1.838 0l-1.343-3.132-3.132-1.343a1 1 0 0 1 0-1.838l3.132-1.343 1.343-3.132A1 1 0 0 1 17 9Zm0 3.539-.58 1.355a1 1 0 0 1-.526.525L14.539 15l1.355.58a1 1 0 0 1 .525.526L17 17.461l.58-1.355a1 1 0 0 1 .526-.525L19.461 15l-1.355-.58a1 1 0 0 1-.525-.526L17 12.539Z"></path>
                                        </svg>
                                    </div>
                                    <div className="text-[16.9px] leading-[22px] font-semibold text-black dark:text-white tracking-[0.25px] flex-1">
                                        Discover feeds
                                    </div>
                                    <button 
                                        aria-label="Search for more feeds"
                                        onClick={() => setIsSearchUIActive(true)}
                                        className="flex flex-row items-center justify-center bg-white dark:bg-dark-surface h-[33px] w-[33px] rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface/80 transition-colors"
                                    >
                                        <div className="w-[17px] h-[17px] relative">
                                            <div className="absolute w-[24px] h-[24px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                                <svg fill="none" width="24" viewBox="0 0 24 24" height="24" className="text-[#526580] pointer-events-none">
                                                    <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm-8 6a8 8 0 1 1 14.32 4.906l3.387 3.387a1 1 0 0 1-1.414 1.414l-3.387-3.387A8 8 0 0 1 3 11Z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                    </button>
                                </div>

                                {/* Feed Items */}
                                {(feeds.length > 0 ? feeds : [
                                    { uri: '1', name: 'SciArt 🐡', handle: 'flyingtrilobite.com', description: '🔸The intersection of art + science\n🔸Science communication across visual art disciplines\n🔸Medical illustration, paleoart, fine art, bioart, webcomics +more', followersCount: 5043, avatar: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=80&q=80' },
                                    { uri: '2', name: '#Housing+', handle: 'fema.monster', description: '#Housing+ is a place that includes many aspects of housing--tenant rights, YIMBY, zoning, rent control, gentrification, and the unhoused.', followersCount: 88, avatar: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=80&q=80' },
                                    { uri: '3', name: 'NFL+', handle: 'parkermolloy.com', description: 'Football talk on Bluesky.', followersCount: 7598, avatar: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=80&q=80' },
                                    { uri: '4', name: 'MySky', handle: 'mysky.social', description: 'Own your algorithm. A personalized feed with a control panel.', followersCount: 130, avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=80&q=80' }
                                ]).map((feed: any) => (
                                    <div key={feed.uri || feed.name} className="border-t border-[#dce2ea] dark:border-dark-border p-4">
                                        <div
                                            onClick={() => navigate(`/feeds/${encodeURIComponent(feedActionKey(feed))}`)}
                                            className="flex flex-col items-center justify-start cursor-pointer group"
                                        >
                                            <div className="w-full flex flex-col gap-2">
                                                <div className="flex flex-row items-center gap-2">
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#f9fafb] dark:bg-dark-surface shrink-0 relative">
                                                        <img
                                                            src={feed.avatarUrl || feed.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(feed.name)}&background=random`}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute inset-0 border border-[#dce2ea] dark:border-dark-border rounded-lg opacity-60 pointer-events-none" />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[15px] leading-[20px] font-semibold text-black dark:text-white truncate">
                                                            {feed.name}
                                                        </div>
                                                        <div className="text-[13.1px] leading-[17px] text-[#405168] dark:text-dark-text-secondary truncate">
                                                            Feed by @{feed.handle || feed.creator?.handle}
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={(e) => handlePinToggle(e, feed)}
                                                        className={cn(
                                                            "flex flex-row items-center justify-center rounded-full px-[14px] py-2 gap-[5px] text-[13.1px] font-medium leading-[17px] transition-colors",
                                                            feed.isPinned
                                                                ? "bg-gray-100 dark:bg-dark-surface text-gray-900 dark:text-white border border-[#dce2ea] dark:border-dark-border"
                                                                : "bg-[#006aff] hover:bg-[#005cd6] text-white"
                                                        )}
                                                    >
                                                        <div className="z-20 w-[17px] h-[17px] -ml-[2px] -mr-[2px] relative">
                                                            <div className="absolute w-[18px] h-[18px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                                                <svg fill="none" width="18" viewBox="0 0 24 24" height="18" className="text-white pointer-events-none">
                                                                    <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M6.5 3a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v3.997a6.25 6.25 0 0 0 1.83 4.42l.377.376A1 1 0 0 1 20 12.5V15a1 1 0 0 1-1 1h-6v5a1 1 0 1 1-2 0v-5H5a1 1 0 0 1-1-1v-2.5a1 1 0 0 1 .293-.707l.376-.377A6.25 6.25 0 0 0 6.5 6.996V3.001Zm2 1v2.997a8.25 8.25 0 0 1-2.416 5.834L6 12.914V14h12v-1.086l-.084-.083A8.25 8.25 0 0 1 15.5 6.997V4h-7Z"></path>
                                                                </svg>
                                                            </div>
                                                        </div>
                                                        <span>{feed.isPinned ? t('feeds.pinned') : 'Pin feed'}</span>
                                                    </button>
                                                </div>

                                                <div className="text-[13.1px] leading-[17px] text-black dark:text-white whitespace-pre-line">
                                                    {feed.description}
                                                </div>

                                                <div className="text-[13.1px] leading-[17px] font-semibold text-[#405168] dark:text-dark-text-secondary">
                                                    Liked by {(feed.followersCount || feed.likeCount || 5043).toLocaleString()} users
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="border-t border-[#dce2ea] dark:border-dark-border">
                                    <button
                                        type="button"
                                        aria-label="Load more"
                                        className="w-full flex flex-row items-center justify-center p-[12px_16px] gap-2 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors"
                                    >
                                        <span className="text-[13.1px] leading-[17px] text-black dark:text-white font-medium">
                                            Load more suggested feeds
                                        </span>
                                        <svg fill="none" viewBox="0 0 24 24" width="16" height="16" className="text-[#405168]">
                                            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M3.293 8.293a1 1 0 0 1 1.414 0L12 15.586l7.293-7.293a1 1 0 1 1 1.414 1.414l-8 8a1 1 0 0 1-1.414 0l-8-8a1 1 0 0 1 0-1.414Z"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* 4. Suggested Accounts Section */}
                            <SuggestedUsersForExplore />

                            {/* 5. Starter Packs Section */}
                            <StarterPacksExploreSection />
                        </div>
                    )}
                </div>
            </div>

    );
};

export default ExplorePage;
