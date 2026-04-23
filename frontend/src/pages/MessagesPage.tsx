import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchConversations } from '../redux/slices/messagesSlice';
import ConversationItem from '../components/messages/ConversationItem';
import IconButton from '../components/common/IconButton';
import { FiSettings, FiMail, FiSearch, FiMenu } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { openMobileMenu } from '../redux/slices/modalsSlice';
import { RootState } from '../redux/store';
import LoadingIndicator from '../components/common/LoadingIndicator';
import { useDocumentTitle } from '../hooks/useDocumentTitle';


const MessagesPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { conversations, activeConversationId, isLoading } = useAppSelector((state: RootState) => state.messages);
    const { user: currentUser } = useAppSelector((state: RootState) => state.auth);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        dispatch(fetchConversations());
    }, [dispatch]);

    const handleConversationClick = (id: string) => {
        navigate(`/messages/${id}`);
    };

    const filteredConversations = conversations.filter(c => {
        const otherParticipants = c.participants.filter(p => 
            (p.did && currentUser?.did) ? p.did !== currentUser.did : p.id !== currentUser?.id
        );
        const otherParticipant = otherParticipants[0] || c.participants[0];
        return (
            otherParticipant.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            otherParticipant.handle.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    useDocumentTitle(t('messages.title'));

    return (
        <div className="min-h-screen flex flex-col border-r border-gray-200 dark:border-dark-border">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-sm border-b border-gray-200 dark:border-dark-border">
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => dispatch(openMobileMenu())}
                                className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full flex-shrink-0"
                            >
                                <FiMenu size={24} className="text-gray-700 dark:text-dark-text" />
                            </button>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                                {t('messages.title')}
                            </h1>
                        </div>
                        <div className="flex gap-1">
                            <IconButton
                                icon={<FiSettings size={20} />}
                                tooltip={t('messages.settings')}
                                onClick={() => navigate('/settings/chat')}
                            />
                            <IconButton
                                icon={<FiMail size={20} />}
                                variant="primary"
                                tooltip={t('messages.new_message')}
                                onClick={() => navigate('/search?tab=users')}
                            />
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="px-4 pb-2">
                        <div className="relative group">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                placeholder={t('messages.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-100 dark:bg-dark-surface py-2.5 pl-10 pr-4 rounded-full text-sm focus:bg-white dark:focus:bg-dark-bg border border-transparent focus:border-primary-500 outline-none transition-all dark:text-dark-text"
                            />
                        </div>
                    </div>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading && conversations.length === 0 ? (
                        <div className="flex items-center justify-center p-20">
                            <LoadingIndicator size="lg" />
                        </div>
                    ) : filteredConversations.length > 0 ? (
                        filteredConversations.map((conv) => (
                            <ConversationItem
                                key={conv.id}
                                conversation={conv}
                                isActive={activeConversationId === conv.id}
                                onClick={() => handleConversationClick(conv.id)}
                            />
                        ))
                    ) : (
                        <div className="p-12 text-center">
                            <p className="text-gray-500 dark:text-dark-text-secondary">
                                {searchQuery ? t('messages.no_results') : t('messages.no_messages')}
                            </p>
                        </div>
                    )}
                </div>
        </div>
    );
};

export default MessagesPage;
