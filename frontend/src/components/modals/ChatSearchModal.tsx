import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiSearch, FiUsers, FiCheck } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Avatar from '../common/Avatar';
import LoadingIndicator from '../common/LoadingIndicator';
import api from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import { startConversation } from '../../redux/slices/messagesSlice';

interface ChatSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChatSearchModal: React.FC<ChatSearchModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { user: currentUser } = useAppSelector((state: RootState) => state.auth);
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isGroupMode, setIsGroupMode] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
            // Fetch first 5 accounts the current user is following
            if (currentUser?.handle || currentUser?.did) {
                setLoadingSuggestions(true);
                const actor = encodeURIComponent(currentUser.did || currentUser.handle || '');
                fetch(`/xrpc/app.bsky.graph.getFollows?actor=${actor}&limit=5`, { credentials: 'include' })
                    .then(r => r.ok ? r.json() : Promise.reject(r.status))
                    .then(data => {
                        const actors = (data?.follows ?? []).filter(
                            (u: any) => u.did !== currentUser?.did && u.did !== currentUser?.id
                        );
                        setSuggestedUsers(actors);
                    })
                    .catch(() => setSuggestedUsers([]))
                    .finally(() => setLoadingSuggestions(false));
            }
        } else {
            setSearchQuery('');
            setResults([]);
            setSuggestedUsers([]);
            setIsGroupMode(false);
            setSelectedUsers([]);
        }
    }, [isOpen]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                setLoading(true);
                try {
                    const response = await api.search.users(searchQuery);
                    const filteredData = (response.data || []).filter((user: any) => user.did !== currentUser?.did && user.did !== currentUser?.id);
                    setResults(filteredData);
                } catch (error) {
                    console.error('Failed to search users:', error);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleStartChat = async (user: any) => {
        if (!currentUser?.emailConfirmed) {
            setError(t('messages.email_not_confirmed', { defaultValue: "Proactive chat initiation requires a confirmed email address on Bluesky. Please verify your email in your Bluesky settings." }));
            return;
        }

        setError(null);

        if (isGroupMode) {
            const isSelected = selectedUsers.some(u => (u.did || u.id) === (user.did || user.id));
            if (isSelected) {
                setSelectedUsers(prev => prev.filter(u => (u.did || u.id) !== (user.did || u.did || user.id)));
            } else {
                setSelectedUsers(prev => [...prev, user]);
            }
            return;
        }

        try {
            const resultAction = await dispatch(startConversation([user.did || user.id]) as any);
            if (startConversation.fulfilled.match(resultAction)) {
                onClose();
                navigate(`/messages/${resultAction.payload.id}`);
            } else if (startConversation.rejected.match(resultAction)) {
                setError(resultAction.payload as string || 'Failed to start conversation');
            }
        } catch (error: any) {
            console.error('Failed to start chat:', error);
            setError(error.message || 'Failed to start chat');
        }
    };

    const handleCreateGroup = async () => {
        if (selectedUsers.length < 1) return;
        
        setError(null);
        try {
            const participantIds = selectedUsers.map(u => u.did || u.id);
            const resultAction = await dispatch(startConversation(participantIds) as any);
            if (startConversation.fulfilled.match(resultAction)) {
                onClose();
                navigate(`/messages/${resultAction.payload.id}`);
            } else if (startConversation.rejected.match(resultAction)) {
                setError(resultAction.payload as string || 'Failed to start group chat');
            }
        } catch (error: any) {
            console.error('Failed to create group:', error);
            setError(error.message || 'Failed to create group');
        }
    }



    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start lg:items-center justify-center pt-0 lg:pt-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-[500px] bg-white dark:bg-black rounded-none lg:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full lg:h-auto max-h-[100vh] lg:max-h-[600px] lg:min-h-[280px]">
                {/* Header */}
                <div className="relative flex items-center justify-center px-4 py-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-black">
                    {isGroupMode && selectedUsers.length > 0 ? (
                        <button
                            onClick={handleCreateGroup}
                            className="absolute left-4 text-[#006aff] font-bold text-[15px] z-20"
                        >
                            {t('common.create', 'Create')}
                        </button>
                    ) : isGroupMode ? (
                        <button
                            onClick={() => setIsGroupMode(false)}
                            className="absolute left-4 text-[#006aff] font-normal text-[15px] z-20"
                        >
                            Back
                        </button>
                    ) : null}
                    
                    <h2 className="text-[16.9px] font-bold text-[#232e3e] dark:text-white leading-[19px] tracking-[0.25px] z-10">
                        {isGroupMode ? (selectedUsers.length > 0 ? t('messages.new_group_chat', 'New group chat') : t('messages.new_group_chat', 'New group chat')) : t('messages.start_new_chat', 'New chat')}
                    </h2>
                    
                    <button 
                        onClick={onClose}
                        className="absolute right-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors z-20"
                    >
                        <svg fill="none" width="18" viewBox="0 0 24 24" height="18" style={{ color: '#526580' }}>
                            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L12 10.586l6.293-6.293a1 1 0 1 1 1.414 1.414L13.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414L12 13.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L10.586 12 4.293 5.707a1 1 0 0 1 0-1.414Z"></path>
                        </svg>
                    </button>
                </div>

                {/* Email Verification Warning */}
                {currentUser && !currentUser.emailConfirmed && (
                    <div className="bg-[#0085ff]/10 p-3 border-b border-[#0085ff]/20">
                        <div className="flex gap-3">
                            <div className="text-[#0085ff]">
                                <svg fill="none" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-[13px] text-[#0085ff] font-medium">
                                    Confirm your email address on Bluesky to start chats.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-500/10 p-3 border-b border-red-100 dark:border-red-500/20">
                        <p className="text-[13px] text-red-600 dark:text-red-400 font-medium">
                            {error}
                        </p>
                    </div>
                )}

                {/* Selected Users Chips for Group Mode */}
                {isGroupMode && selectedUsers.length > 0 && (
                    <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-gray-100 dark:border-dark-border/30 bg-gray-50/50 dark:bg-white/5">
                        {selectedUsers.map(user => (
                            <div key={user.did || user.id} className="flex items-center gap-1.5 bg-white dark:bg-black text-[#232e3e] dark:text-white pl-1 pr-2 py-1 rounded-full text-xs font-bold border border-gray-200 dark:border-dark-border shadow-sm">
                                <Avatar src={user.avatarUrl || user.avatar} alt={user.handle} size="xs" />
                                <span>{user.handle}</span>
                                <button onClick={() => setSelectedUsers(prev => prev.filter(u => (u.did || u.id) !== (user.did || user.id)))}>
                                    <svg fill="none" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Search Input Section */}
                <div className="p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-black">
                    <div className="flex flex-row items-center gap-2">
                        <svg fill="none" viewBox="0 0 24 24" width="20" height="20">
                            <path fill="#A5B2C5" fillRule="evenodd" clipRule="evenodd" d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm-8 6a8 8 0 1 1 14.32 4.906l3.387 3.387a1 1 0 0 1-1.414 1.414l-3.387-3.387A8 8 0 0 1 3 11Z"></path>
                        </svg>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search for people"
                            className="flex-1 bg-transparent py-3 text-[15px] text-black dark:text-white outline-none placeholder-[#667B99]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Selected Users Chips Area */}
                {isGroupMode && selectedUsers.length > 0 && (
                    <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-gray-100 dark:border-dark-border/30 bg-white dark:bg-black overflow-y-auto max-h-[120px] no-scrollbar">
                        {selectedUsers.map(user => (
                            <div key={user.did || user.id} className="flex items-center gap-1.5 bg-[#f1f3f5] dark:bg-dark-surface text-[#232e3e] dark:text-white pl-1 pr-2 py-1 rounded-full text-xs font-bold border border-gray-200 dark:border-dark-border shadow-sm">
                                <Avatar src={user.avatarUrl || user.avatar} alt={user.handle} size="xs" />
                                <span className="max-w-[120px] truncate">{user.handle}</span>
                                <button onClick={() => setSelectedUsers(prev => prev.filter(u => (u.did || u.id) !== (user.did || user.id)))}>
                                    <svg fill="none" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar pb-[72px]">
                    {!searchQuery && !loading && (
                        <>
                            {/* New Group Chat Action */}
                            {!isGroupMode && (
                                <button
                                    onClick={() => setIsGroupMode(true)}
                                    className="w-full flex flex-row items-center justify-between p-4 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-dark-border/50"
                                >
                                    <div className="flex flex-row items-center gap-4 flex-1">
                                        <div className="bg-[#eff2f6] dark:bg-dark-surface p-3 rounded-full flex items-center justify-center">
                                            <svg fill="none" viewBox="0 0 24 24" width="20" height="20">
                                                <path fill="#000000" className="dark:fill-white" fillRule="evenodd" clipRule="evenodd" d="M8 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM4 7a4 4 0 1 1 8 0 4 4 0 0 1-8 0Zm13-1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-3.5 1.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Zm7.301 9.7c-.836-2.6-2.88-3.503-4.575-3.111a1 1 0 0 1-.451-1.949c2.815-.651 5.81.966 6.93 4.448a2.49 2.49 0 0 1-.506 2.43A2.92 2.92 0 0 1 20 20h-2a1 1 0 1 1 0-2h2a.92.92 0 0 0 .69-.295.49.49 0 0 0 .112-.505ZM8 14c-1.865 0-3.878 1.274-4.681 4.151a.57.57 0 0 0 .132.55c.15.171.4.299.695.299h7.708a.93.93 0 0 0 .695-.299.57.57 0 0 0 .132-.55C11.878 15.274 9.865 14 8 14Zm0-2c2.87 0 5.594 1.98 6.607 5.613.53 1.9-1.09 3.387-2.753 3.387H4.146c-1.663 0-3.283-1.487-2.753-3.387C2.406 13.981 5.129 12 8 12Z"></path>
                                            </svg>
                                        </div>
                                        <span className="text-[15px] font-medium text-black dark:text-white">New group chat</span>
                                    </div>
                                    <svg fill="none" viewBox="0 0 24 24" width="20" height="20" className="text-black dark:text-white">
                                        <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M8.293 3.293a1 1 0 0 1 1.414 0l8 8a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414-1.414L15.586 12 8.293 4.707a1 1 0 0 1 0-1.414Z"></path>
                                    </svg>
                                </button>
                            )}

                            {/* Suggested People */}
                            {loadingSuggestions ? (
                                <div className="py-8 flex justify-center"><LoadingIndicator size="sm" /></div>
                            ) : suggestedUsers.length > 0 ? (
                                <div className="flex flex-col">
                                    <p className="px-4 pt-3 pb-1 text-[13px] font-semibold text-[#526580] dark:text-[#a5b2c5] uppercase tracking-wide">
                                        {t('messages.suggested', 'Suggested')}
                                    </p>
                                    {suggestedUsers.map((user) => (
                                        <button
                                            key={user.did}
                                            onClick={() => handleStartChat(user)}
                                            className={`w-full flex flex-row items-center gap-3 px-4 py-2 transition-colors text-left ${
                                                selectedUsers.some(u => (u.did || u.id) === (user.did || user.id)) && isGroupMode
                                                    ? 'bg-[#f1f3f5] dark:bg-white/5'
                                                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <Avatar src={user.avatar || user.avatarUrl} alt={user.displayName} size="md" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-[15px] text-gray-900 dark:text-white truncate leading-5">
                                                    {user.displayName || user.handle}
                                                </p>
                                                <p className="text-[14px] text-[#526580] dark:text-[#a5b2c5] truncate leading-4">
                                                    @{user.handle}
                                                </p>
                                            </div>
                                            {isGroupMode && (
                                                <div className={`w-[22px] h-[22px] rounded-[6px] shrink-0 flex items-center justify-center transition-colors ${
                                                    selectedUsers.some(u => (u.did || u.id) === (user.did || user.id))
                                                        ? 'bg-[#006AFF]'
                                                        : 'border-[2px] border-[#DCE2EA] dark:border-[#2E3C4D]'
                                                }`}>
                                                    {selectedUsers.some(u => (u.did || u.id) === (user.did || user.id)) && (
                                                        <svg fill="none" width="14" height="14" viewBox="0 0 24 24">
                                                            <path fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd" d="M17.659 8.175a1.361 1.361 0 0 1 0 1.925l-6.224 6.223a1.361 1.361 0 0 1-1.925 0L6.4 13.212a1.361 1.361 0 0 1 1.925-1.925l2.149 2.148 5.26-5.26a1.361 1.361 0 0 1 1.925 0Z"></path>
                                                        </svg>
                                                    )}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </>
                    )}

                    {/* Dynamic Search Results */}
                    {searchQuery && (
                        <div className="flex flex-col">
                            {loading ? (
                                <div className="py-12 flex justify-center">
                                    <LoadingIndicator size="md" />
                                </div>
                            ) : results.length > 0 ? (
                                results.map((user) => (
                                    <button
                                        key={user.did || user.id}
                                        onClick={() => handleStartChat(user)}
                                        className={`w-full flex flex-row items-center gap-3 px-4 py-2 transition-colors text-left ${selectedUsers.some(u => (u.did || (u as any).id) === (user.did || (user as any).id)) && isGroupMode ? 'bg-[#f1f3f5] dark:bg-white/5' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                    >
                                        <Avatar src={user.avatarUrl || user.avatar} alt={user.displayName} size="md" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-[15px] text-gray-900 dark:text-white truncate leading-5">
                                                {user.displayName || user.handle}
                                            </p>
                                            <p className="text-[14px] text-[#526580] dark:text-[#a5b2c5] truncate leading-4">
                                                @{user.handle}
                                            </p>
                                        </div>
                                        {isGroupMode && (
                                            <div className={`w-[22px] h-[22px] rounded-[6px] shrink-0 flex items-center justify-center transition-colors ${selectedUsers.some(u => (u.did || (u as any).id) === (user.did || (user as any).id)) ? 'bg-[#006AFF]' : 'border-[2px] border-[#DCE2EA] dark:border-[#2E3C4D]'}`}>
                                                {selectedUsers.some(u => (u.did || (u as any).id) === (user.did || (user as any).id)) && (
                                                    <svg fill="none" width="14" height="14" viewBox="0 0 24 24">
                                                        <path fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd" d="M17.659 8.175a1.361 1.361 0 0 1 0 1.925l-6.224 6.223a1.361 1.361 0 0 1-1.925 0L6.4 13.212a1.361 1.361 0 0 1 1.925-1.925l2.149 2.148 5.26-5.26a1.361 1.361 0 0 1 1.925 0Z"></path>
                                                    </svg>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                ))
                            ) : (
                                <div className="py-20 text-center px-10">
                                    <p className="text-[#526580] dark:text-[#667B99]">
                                        {t('search.no_results', { defaultValue: 'No results for' })} "{searchQuery}"
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Navigation */}
                {isGroupMode && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-dark-border bg-white dark:bg-black flex items-center justify-between">
                        <button 
                            onClick={() => setIsGroupMode(false)}
                            className="flex items-center gap-1.5 px-3 py-2 text-[#006aff] font-bold text-[15px] hover:bg-[#006aff]/5 rounded-full transition-colors"
                        >
                            <svg fill="none" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                            Back
                        </button>
                        <button
                            onClick={handleCreateGroup}
                            disabled={selectedUsers.length === 0}
                            className={`px-6 py-2 rounded-full font-bold text-[15px] transition-all ${selectedUsers.length > 0 ? 'bg-[#006aff] text-white hover:bg-[#0052cc]' : 'bg-[#dce2ea] dark:bg-[#2e3c4d] text-white/50 cursor-not-allowed'}`}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatSearchModal;
