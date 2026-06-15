import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchConversations } from '../redux/slices/messagesSlice';
import ConversationItem from '../components/messages/ConversationItem';
import IconButton from '../components/common/IconButton';
import { FiSettings, FiMail, FiSearch, FiMenu, FiPlus } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { openMobileMenu } from '../redux/slices/modalsSlice';
import { RootState } from '../redux/store';
import LoadingIndicator from '../components/common/LoadingIndicator';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ChatSearchModal from '../components/modals/ChatSearchModal';
import ChatPage from './ChatPage';
import { useParams } from 'react-router-dom';
import { useMediaQuery } from '../hooks/useMediaQuery';


const MessagesPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { conversations, isLoading, hasMoreConversations, conversationsCursor, isLoadingMoreConversations } = useAppSelector((state: RootState) => state.messages);
    const { user: currentUser } = useAppSelector((state: RootState) => state.auth);
    const { conversationId } = useParams<{ conversationId: string }>();
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const [searchQuery, setSearchQuery] = useState('');
    const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
    const [showRequests, setShowRequests] = useState(false);
    const loadMoreRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        dispatch(fetchConversations({ isRequest: showRequests }));
    }, [dispatch, showRequests]);

    // Infinite scroll observer
    useEffect(() => {
        if (!hasMoreConversations || isLoadingMoreConversations || isLoading || searchQuery) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    dispatch(fetchConversations({ cursor: conversationsCursor, isRequest: showRequests }));
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [dispatch, hasMoreConversations, isLoadingMoreConversations, isLoading, conversationsCursor, searchQuery, showRequests]);

    const handleConversationClick = (id: string) => {
        navigate(`/messages/${id}`);
    };

    const filteredConversations = conversations.filter(c => {
        const otherParticipants = c.participants.filter(p => 
            (p.did && currentUser?.did) ? p.did !== currentUser.did : p.id !== currentUser?.id
        );
        const otherParticipant = otherParticipants[0] || c.participants[0];
        return (
            otherParticipant?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            otherParticipant?.handle?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    useDocumentTitle(t('messages.title'));

    return (
        <div className="min-h-screen flex bg-white dark:bg-black">
            {/* Left Column: Conversations List */}
            <div className={`flex flex-col border-r border-gray-200 dark:border-dark-border bg-white dark:bg-black ${isDesktop ? 'w-[350px] xl:w-[400px] flex-shrink-0' : 'flex-1'} ${!isDesktop && conversationId ? 'hidden' : 'flex'}`}>
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-sm border-b border-gray-200 dark:border-[#232e3e]">
                    <div className="p-3 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => dispatch(openMobileMenu())}
                                className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full flex-shrink-0"
                            >
                                <FiMenu size={22} className="text-gray-700 dark:text-dark-text" />
                            </button>
                            <h1 className="text-xl font-black text-gray-900 dark:text-white">
                                {t('messages.title', { defaultValue: 'Chats' })}
                            </h1>
                        </div>
                        <div className="flex items-center gap-2">
                             <IconButton
                                icon={<FiSettings size={20} />}
                                tooltip={t('messages.settings')}
                                onClick={() => navigate('/settings/chat')}
                                className="text-gray-900 dark:text-[#a5b2c5] hover:bg-gray-100 dark:hover:bg-white/10"
                            />
                            <button
                                onClick={() => setIsChatSearchOpen(true)}
                                className="bg-[#0085ff] hover:bg-[#007bdf] text-white p-1.5 rounded-full transition-colors flex items-center justify-center"
                                title={t('messages.new_chat')}
                            >
                                <FiPlus size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Inbox Toggles */}
                    <div className="flex border-b border-gray-100 dark:border-dark-border/50">
                        <button 
                            onClick={() => setShowRequests(false)}
                            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${!showRequests ? 'border-primary-500 text-primary-500' : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                        >
                            {t('messages.all', 'All')}
                        </button>
                        <button 
                            onClick={() => setShowRequests(true)}
                            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${showRequests ? 'border-primary-500 text-primary-500' : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                        >
                            {t('messages.requests', 'Requests')}
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="px-4 py-2">
                        <div className="relative group">
                            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-all" size={16} />
                            <input
                                type="text"
                                placeholder={t('messages.search_placeholder', { defaultValue: 'Search' })}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-100 dark:bg-[#19222e] py-1.5 pl-10 pr-4 rounded-full text-sm focus:bg-white dark:focus:bg-black border border-transparent focus:border-primary-500 outline-none transition-all dark:text-white placeholder-gray-500 dark:placeholder-[#667b99]"
                            />
                        </div>
                    </div>
                </div>

                <ChatSearchModal 
                    isOpen={isChatSearchOpen} 
                    onClose={() => setIsChatSearchOpen(false)} 
                />

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto bg-white dark:bg-dark-bg no-scrollbar">
                    {isLoading && conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20">
                            <LoadingIndicator size="lg" />
                            <p className="mt-4 text-gray-400 dark:text-dark-text-secondary animate-pulse text-sm">
                                {t('messages.loading_conversations')}
                            </p>
                        </div>
                    ) : (
                        <>
                            {filteredConversations.length > 0 ? (
                                <div className="divide-y divide-gray-100 dark:divide-dark-border">
                                    {filteredConversations.map((conv) => (
                                        <ConversationItem
                                            key={conv.id}
                                            conversation={conv}
                                            isActive={conversationId === conv.id}
                                            onClick={() => handleConversationClick(conv.id)}
                                        />
                                    ))}
                                    
                                    {/* Load More trigger */}
                                    {!searchQuery && hasMoreConversations && (
                                        <div ref={loadMoreRef} className="p-8 flex justify-center border-t border-gray-50 dark:border-dark-border/50">
                                            {isLoadingMoreConversations && <LoadingIndicator size="sm" />}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-12 text-center">
                                    <p className="text-gray-500 dark:text-dark-text-secondary">
                                        {searchQuery ? t('messages.no_results') : (showRequests ? t('messages.no_requests', 'No message requests') : t('messages.no_messages'))}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Right Column: Chat Content */}
            <div className={`flex-1 flex flex-col min-w-0 ${conversationId ? 'flex' : 'hidden lg:flex'} bg-white dark:bg-black overflow-hidden`}>
                {conversationId ? (
                    <ChatPage isInSidebar={true} />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f8f9fa] dark:bg-[#000]">
                        <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mb-6">
                            <FiMail size={40} className="text-primary-500" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                            {t('messages.select_chat_title', 'Select a message')}
                        </h2>
                        <p className="text-gray-500 dark:text-dark-text-secondary max-w-sm">
                            {t('messages.select_chat_desc', 'Choose an existing conversation or start a new one to begin chatting.')}
                        </p>
                        <button 
                            onClick={() => setIsChatSearchOpen(true)}
                            className="mt-8 bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-full font-bold transition-all transform active:scale-95"
                        >
                            {t('messages.new_chat')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessagesPage;
