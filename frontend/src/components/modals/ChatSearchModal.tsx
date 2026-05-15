import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiSearch } from 'react-icons/fi';
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        } else {
            setSearchQuery('');
            setResults([]);
        }
    }, [isOpen]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                setLoading(true);
                try {
                    const response = await api.search.users(searchQuery);
                    setResults(response.data || []);
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-[450px] bg-white dark:bg-[#161e27] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-200 dark:border-[#232e3e]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#232e3e]">
                    <div className="flex flex-col">
                        <h2 className="text-[19px] font-bold text-gray-900 dark:text-white leading-tight">
                            {t('messages.start_new_chat', { defaultValue: 'Start a new chat' })}
                        </h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-[#a5b2c5]"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Email Verification Warning */}
                {currentUser && !currentUser.emailConfirmed && (
                    <div className="bg-[#0085ff]/10 p-4 border-b border-[#0085ff]/20">
                        <div className="flex gap-3">
                            <div className="text-[#0085ff] pt-0.5">
                                <svg fill="none" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-[13.5px] text-[#0085ff] font-medium leading-normal">
                                    Confirm your email address on Bluesky to start chats.
                                </p>
                                <a 
                                    href="https://bsky.app/settings" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[13px] text-[#0085ff] font-bold underline mt-1 inline-block"
                                >
                                    Verify on Bluesky
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-500/10 p-4 border-b border-red-100 dark:border-red-500/20">
                        <p className="text-[13.5px] text-red-600 dark:text-red-400 font-medium">
                            {error}
                        </p>
                    </div>
                )}

                {/* Search Input */}
                <div className="p-4 px-6">
                    <div className="relative flex items-center group">
                        <FiSearch className="absolute left-3.5 text-primary-500" size={18} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder={t('common.search', { defaultValue: 'Search' })}
                            className="w-full bg-gray-50 dark:bg-[#0a0f14] py-2.5 pl-11 pr-4 rounded-xl text-[15px] focus:bg-white dark:focus:bg-black border border-transparent focus:border-primary-500 outline-none transition-all dark:text-white dark:placeholder-[#526580]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {loading ? (
                        <div className="py-12 flex justify-center">
                            <LoadingIndicator size="md" />
                        </div>
                    ) : results.length > 0 ? (
                        <div className="flex flex-col">
                            {results.map((user) => (
                                <button
                                    key={user.did || user.id}
                                    onClick={() => handleStartChat(user)}
                                    className="px-6 py-3.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-left group"
                                >
                                    <Avatar 
                                        src={user.avatarUrl || user.avatar} 
                                        alt={user.displayName} 
                                        size="md" 
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-bold text-[15px] text-gray-900 dark:text-white truncate group-hover:underline">
                                                    {user.displayName || user.handle}
                                                </p>
                                                <p className="text-[14px] text-[#526580] dark:text-[#a5b2c5] truncate font-medium">
                                                    @{user.handle}
                                                </p>
                                            </div>
                                            {/* Logic for "can't be messaged" would go here based on user settings */}
                                            {user.cannotBeMessaged && (
                                                <span className="text-[13px] text-[#526580] whitespace-nowrap">
                                                    can't be messaged
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : searchQuery.trim() && !loading ? (
                        <div className="py-20 text-center px-10">
                            <p className="text-[#526580] dark:text-[#a5b2c5]">
                                {t('search.no_results', { defaultValue: 'No results for' })} "{searchQuery}"
                            </p>
                        </div>
                    ) : (
                        <div className="py-20 text-center px-10">
                            <p className="text-[14px] text-[#526580] dark:text-[#a5b2c5] max-w-[250px] mx-auto">
                                Search for someone by their handle or name to start a chat.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatSearchModal;
