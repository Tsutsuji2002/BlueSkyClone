import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams, Link, NavLink } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchConversations, fetchChatSettings, updateChatSettings, acceptConversation, declineConversation, deleteConversation, fetchConversationById } from '../redux/slices/messagesSlice';
import ConversationItem from '../components/messages/ConversationItem';
import SkeletonConversationItem from '../components/messages/SkeletonConversationItem';
import { FiSearch, FiMenu, FiArrowLeft, FiMoreHorizontal } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { openMobileMenu } from '../redux/slices/modalsSlice';
import { RootState } from '../redux/store';
import LoadingIndicator from '../components/common/LoadingIndicator';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ChatSearchModal from '../components/modals/ChatSearchModal';
import ChatPage from './ChatPage';
import GroupChatSettingsPanel from '../components/chat/GroupChatSettingsPanel';

const MessagesPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { conversations, isConversationsLoading, hasMoreConversations, conversationsCursor, isLoadingMoreConversations, requestConversations, isRequestConversationsLoading } = useAppSelector((state: RootState) => state.messages);
    const { user: currentUser } = useAppSelector((state: RootState) => state.auth);
    const { conversationId } = useParams<{ conversationId: string }>();
    
    // Determine current view from route
    const isInboxView = location.pathname === '/messages/inbox';
    const isSettingsView = location.pathname === '/messages/settings';
    const isGroupSettingsView = location.pathname.includes('/settings') && conversationId;
    const isChatView = !!conversationId && !isGroupSettingsView;

    const [searchQuery, setSearchQuery] = useState('');
    const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
    const loadMoreRef = React.useRef<HTMLDivElement>(null);

    // Settings state - mirrors ATProto chat.bsky.actor.declaration
    const [allowIncoming, setAllowIncoming] = useState<string>('following');
    const [allowGroupInvites, setAllowGroupInvites] = useState<string>('following');
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    useEffect(() => {
        // Always fetch all conversations for the left sidebar
        // The left sidebar should never be filtered - it always shows all conversations
        dispatch(fetchConversations({ isRequest: false }));
    }, [dispatch]);

    // Fetch group chat requests when viewing the Requests tab
    useEffect(() => {
        if (isInboxView) {
            dispatch(fetchConversations({ isRequest: true }));
        }
    }, [dispatch, isInboxView]);

    // Fetch individual conversation when viewing group settings to ensure latest state (locked, muted, etc.)
    useEffect(() => {
        if (isGroupSettingsView && conversationId) {
            dispatch(fetchConversationById(conversationId));
        }
    }, [dispatch, isGroupSettingsView, conversationId]);

    useEffect(() => {
        if (isSettingsView) {
            dispatch(fetchChatSettings()).unwrap().then((data: any) => {
                if (data?.allowIncoming) setAllowIncoming(data.allowIncoming);
                // Even if null, we should handle it. Default to 'following' if null/not present.
                setAllowGroupInvites(data?.allowGroupInvites || 'following');
            }).catch(() => {});
        }
    }, [dispatch, isSettingsView]);

    const handleUpdateDmSetting = async (val: string) => {
        const prev = allowIncoming;
        setAllowIncoming(val);
        setIsSavingSettings(true);
        try {
            await dispatch(updateChatSettings({ allowIncoming: val, allowGroupInvites })).unwrap();
        } catch (err) {
            setAllowIncoming(prev); // Rollback
            console.error('Failed to update DM settings:', err);
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleUpdateGroupSetting = async (val: string) => {
        const prev = allowGroupInvites;
        setAllowGroupInvites(val);
        setIsSavingSettings(true);
        try {
            await dispatch(updateChatSettings({ allowIncoming, allowGroupInvites: val })).unwrap();
        } catch (err) {
            setAllowGroupInvites(prev); // Rollback
            console.error('Failed to update group settings:', err);
        } finally {
            setIsSavingSettings(false);
        }
    };

    useEffect(() => {
        if (!hasMoreConversations || isLoadingMoreConversations || isConversationsLoading || searchQuery) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    // Always fetch all conversations for pagination, never filter by request
                    dispatch(fetchConversations({ cursor: conversationsCursor, isRequest: false }));
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [dispatch, hasMoreConversations, isLoadingMoreConversations, isConversationsLoading, conversationsCursor, searchQuery]);

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

    useDocumentTitle(isInboxView ? t('messages.requests', 'Chat requests') : (isSettingsView ? t('messages.settings', 'Chat settings') : t('messages.title', 'Chats')));

    const renderChatSettings = () => (
        <div className="flex flex-col h-full bg-white dark:bg-black">
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border px-5 min-h-[52px] flex flex-row items-center gap-2">
                <button 
                    onClick={() => navigate('/messages')}
                    className="p-1.5 -ml-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                >
                    <FiArrowLeft size={22} className="text-[#526580] dark:text-dark-text-secondary" />
                </button>
                <h1 className="text-[18.8px] font-semibold tracking-[0.25px] text-gray-900 dark:text-white leading-[22px]">
                    {t('messages.settings', 'Chat Settings')}
                </h1>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar pt-5 pb-20">
                <div className="px-5 space-y-6">
                    <section>
                        <h2 className="text-[15px] font-bold text-gray-900 dark:text-white mb-1">
                            {t('messages.settings.allow_dm', 'Allow direct messages from')}
                        </h2>
                        <p className="text-[13.1px] text-[#232e3e] dark:text-[#667b99] leading-[17px] mb-3">
                            {t('messages.settings.allow_dm_desc', 'You can continue ongoing conversations regardless of which setting you choose.')}
                        </p>
                        
                        <div className="space-y-px">
                            {(['all', 'following', 'none'] as const).map((val) => (
                                <button
                                    key={val}
                                    onClick={() => handleUpdateDmSetting(val)}
                                    disabled={isSavingSettings}
                                    className={`w-full flex flex-row items-center gap-2 p-3 rounded-full transition-all disabled:opacity-60 ${allowIncoming === val ? 'bg-[#e5f0ff] dark:bg-primary-900/30' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                >
                                    <div className={`flex items-center justify-center h-[25px] w-[25px] rounded-full border transition-all ${allowIncoming === val ? 'bg-[#006aff] border-[#006aff]' : 'bg-[#f9fafb] dark:bg-dark-surface border-[#dce2ea] dark:border-dark-border'}`}>
                                        {allowIncoming === val && <div className="h-3 w-3 bg-white rounded-full" />}
                                    </div>
                                    <span className={`text-[15px] font-medium ${allowIncoming === val ? 'text-black dark:text-white' : 'text-[#232e3e] dark:text-dark-text'}`}>
                                        {val === 'all' ? t('messages.settings.everyone', 'Everyone') : 
                                         val === 'following' ? t('messages.settings.following', 'People I follow') : 
                                         t('messages.settings.none', 'No one')}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>

                    <div className="h-px bg-gray-200 dark:bg-dark-border my-2" />

                    <section>
                        <h2 className="text-[15px] font-bold text-gray-900 dark:text-white mb-1">
                            {t('messages.settings.allow_group', 'Allow group chat invites from')}
                        </h2>
                        <p className="text-[13.1px] text-[#232e3e] dark:text-[#667b99] leading-[17px] mb-3">
                            {t('messages.settings.allow_dm_desc', 'You can continue ongoing conversations regardless of which setting you choose.')}
                        </p>
                        <div className="space-y-px">
                            {(['all', 'following', 'none'] as const).map((val) => (
                                <button
                                    key={val}
                                    onClick={() => handleUpdateGroupSetting(val)}
                                    disabled={isSavingSettings}
                                    className={`w-full flex flex-row items-center gap-2 p-3 rounded-full transition-all disabled:opacity-60 ${allowGroupInvites === val ? 'bg-[#e5f0ff] dark:bg-primary-900/30' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                >
                                    <div className={`flex items-center justify-center h-[25px] w-[25px] rounded-full border transition-all ${allowGroupInvites === val ? 'bg-[#006aff] border-[#006aff]' : 'bg-[#f9fafb] dark:bg-dark-surface border-[#dce2ea] dark:border-dark-border'}`}>
                                        {allowGroupInvites === val && <div className="h-3 w-3 bg-white rounded-full" />}
                                    </div>
                                    <span className={`text-[15px] font-medium ${allowGroupInvites === val ? 'text-black dark:text-white' : 'text-[#232e3e] dark:text-dark-text'}`}>
                                        {val === 'all' ? t('messages.settings.everyone', 'Everyone') : 
                                         val === 'following' ? t('messages.settings.following', 'People I follow') : 
                                         t('messages.settings.none', 'No one')}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>

                    <div className="h-px bg-gray-200 dark:bg-dark-border my-2" />

                    <button className="w-full flex flex-row items-center justify-between p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                        <div className="flex flex-row items-center gap-2">
                             <svg fill="none" viewBox="0 0 24 24" width="24" height="24" className="text-black dark:text-white">
                                <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M7.018 6a1 1 0 0 0-.808.412L5.4 5.824l.809.588L3 10.825V17a1 1 0 1 0 2 0 1 1 0 0 1 1-1h12a1 1 0 0 1 1 1 1 1 0 1 0 2 0v-5.998l-3.22-4.577A1 1 0 0 0 16.962 6H7.018ZM23 11.686V17a3 3 0 0 1-5.83 1H6.83A3.001 3.001 0 0 1 1 17v-5.5a1 1 0 1 1 0-2h.49l3.102-4.265A3 3 0 0 1 7.018 4h9.944a3 3 0 0 1 2.453 1.274l3.104 4.412H23a1 1 0 1 1 0 2ZM5 13a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1Zm10 0a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2h-2a1 1 0 0 1-1-1Z"></path>
                             </svg>
                             <span className="text-[15px] font-bold text-gray-900 dark:text-white">
                                 {t('messages.settings.export', 'Export my chat data')}
                             </span>
                        </div>
                        <svg fill="none" viewBox="0 0 24 24" width="24" height="24" className="text-black dark:text-white">
                            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M8.293 3.293a1 1 0 0 1 1.414 0l8 8a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414-1.414L15.586 12 8.293 4.707a1 1 0 0 1 0-1.414Z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderChatRequests = () => {
        // Use the separate requestConversations state that was fetched with isRequest=true
        // This comes from the backend's GetConvoRequestsAsync which returns ONLY group chat requests
        
        return (
            <div className="flex flex-col h-full bg-[#f9fafb] dark:bg-black">
                <div className="sticky top-0 z-10 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border px-5 min-h-[52px] flex flex-row items-center gap-2">
                    <button 
                        onClick={() => navigate('/messages')}
                        className="p-1.5 -ml-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                    >
                        <FiArrowLeft size={22} className="text-[#526580] dark:text-dark-text-secondary" />
                    </button>
                    <h1 className="text-[18.8px] font-semibold tracking-[0.25px] text-gray-900 dark:text-white leading-[22px]">
                        {t('messages.requests', 'Chat requests')}
                    </h1>
                </div>
                
                {isRequestConversationsLoading ? (
                    <div className="flex-1 flex items-center justify-center bg-white dark:bg-black">
                        <LoadingIndicator />
                    </div>
                ) : requestConversations.length > 0 ? (
                    <div className="flex-1 overflow-y-auto bg-white dark:bg-black no-scrollbar pt-2">
                        {requestConversations.map((conv) => (
                            <div key={conv.id} className="border-b border-gray-100 dark:border-dark-border/50">
                                <ConversationItem
                                    conversation={conv}
                                    isActive={false}
                                    onClick={() => handleConversationClick(conv.id)}
                                />
                                <div className="flex gap-2 px-4 pb-3">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            dispatch(acceptConversation(conv.id));
                                        }}
                                        className="flex-1 bg-[#006aff] hover:bg-[#005cdb] text-white font-medium text-[14px] py-2 rounded-full transition-colors"
                                    >
                                        {t('messages.accept', 'Accept')}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            dispatch(declineConversation(conv.id) as any);
                                        }}
                                        className="flex-1 bg-[#f1f3f5] dark:bg-dark-surface hover:bg-[#e1e6ed] dark:hover:bg-dark-hover text-gray-900 dark:text-white font-medium text-[14px] py-2 rounded-full transition-colors"
                                    >
                                        {t('messages.decline', 'Decline')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-black pb-[100px]">
                        <div className="bg-[#eff2f6] dark:bg-dark-surface p-6 rounded-full mb-4">
                             <svg fill="none" width="48" viewBox="0 0 24 24" height="48" className="text-[#405168] dark:text-[#a5b2c5]"><path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M19 14h-2.417a5 5 0 0 1-9.166 0H5v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4Zm0-8a1 1 0 0 0-.898-.995L18 5H6a1 1 0 0 0-1 1v6h3.126a1 1 0 0 1 .969.751 3.001 3.001 0 0 0 5.81 0l.056-.16a1 1 0 0 1 .913-.591H19V6Zm2 12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h12l.154.004A3 3 0 0 1 21 6v12Z"></path></svg>
                        </div>
                        <h2 className="text-[24px] font-bold text-gray-900 dark:text-white mb-2">
                            {t('messages.inbox_zero', 'Inbox zero!')}
                        </h2>
                        <p className="text-[15px] text-gray-500 dark:text-dark-text-secondary max-w-[300px]">
                            {t('messages.inbox_zero_desc', 'You have no new chat requests.')}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-1 flex-row mx-auto w-full max-w-[960px] bg-white dark:bg-black min-h-screen">
            {/* Left Column: Conversations List (360px) */}
            <div className={`flex flex-col border-l border-r border-gray-200 dark:border-dark-border bg-white dark:bg-black w-full lg:w-[360px] flex-shrink-0 ${isChatView || isInboxView || isSettingsView ? 'hidden lg:flex' : 'flex'}`}>
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border">
                    <div className="flex flex-row items-center gap-2 px-4 min-h-[52px] w-full max-w-[600px] mx-auto">
                        <div className="flex-1 flex justify-center lg:justify-start min-h-[33px] items-center">
                             <button
                                onClick={() => dispatch(openMobileMenu())}
                                className="lg:hidden mr-2 p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full flex-shrink-0"
                            >
                                <FiMenu size={20} className="text-gray-700 dark:text-dark-text" />
                            </button>
                            <h1 className="text-[18.8px] font-bold tracking-[0.25px] text-gray-900 dark:text-white leading-[22px]">
                                {t('messages.title', 'Chats')}
                            </h1>
                        </div>
                        
                        <div className="flex flex-row items-center gap-2">
                            {/* Requests Pill */}
                            <NavLink
                                to="/messages/inbox"
                                className={({ isActive }) => `flex flex-row items-center px-[14px] py-[8px] gap-[5px] rounded-full transition-colors ${isActive ? 'bg-[#232e3e] text-white' : 'bg-[#eff2f6] dark:bg-dark-surface/50 text-[#405168] dark:text-[#a5b2c5] hover:bg-[#e1e6ed] dark:hover:bg-dark-hover'}`}
                            >
                                <svg fill="none" width="16" viewBox="0 0 24 24" height="16" stroke="currentColor" strokeWidth="0"><path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M19 14h-2.417a5 5 0 0 1-9.166 0H5v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4Zm0-8a1 1 0 0 0-.898-.995L18 5H6a1 1 0 0 0-1 1v6h3.126a1 1 0 0 1 .969.751 3.001 3.001 0 0 0 5.81 0l.056-.16a1 1 0 0 1 .913-.591H19V6Zm2 12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h12l.154.004A3 3 0 0 1 21 6v12Z"></path></svg>
                                <span className="text-[13.1px] font-medium tracking-[0.25px]">
                                    {t('messages.requests', 'Requests')}
                                </span>
                            </NavLink>

                            {/* Settings Pill */}
                            <NavLink
                                to="/messages/settings"
                                className={({ isActive }) => `flex items-center justify-center bg-[#eff2f6] dark:bg-dark-surface/50 text-[#405168] dark:text-[#a5b2c5] hover:bg-[#e1e6ed] dark:hover:bg-dark-hover h-[33px] w-[33px] rounded-full transition-colors ${isActive ? 'bg-[#232e3e] text-white' : ''}`}
                            >
                                <svg fill="none" width="16" viewBox="0 0 24 24" height="16" stroke="currentColor" strokeWidth="0"><path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M11.1 2a1 1 0 0 0-.832.445L8.851 4.57 6.6 4.05a1 1 0 0 0-.932.268l-1.35 1.35a1 1 0 0 0-.267.932l.52 2.251-2.126 1.417A1 1 0 0 0 2 11.1v1.8a1 1 0 0 0 .445.832l2.125 1.417-.52 2.251a1 1 0 0 0 .268.932l1.35 1.35a1 1 0 0 0 .932.267l2.251-.52 1.417 2.126A1 1 0 0 0 11.1 22h1.8a1 1 0 0 0 .832-.445l1.417-2.125 2.251.52a1 1 0 0 0 .932-.268l1.35-1.35a1 1 0 0 0 .267-.932l-.52-2.251 2.126-1.417A1 1 0 0 0 22 12.9v-1.8a1 1 0 0 0-.445-.832L19.43 8.851l.52-2.251a1 1 0 0 0-.268-.932l-1.35-1.35a1 1 0 0 0-.932-.267l-2.251.52-1.417-2.126A1 1 0 0 0 12.9 2h-1.8Zm-.968 4.255L11.635 4h.73l1.503 2.255a1 1 0 0 0 1.057.42l2.385-.551.566.566-.55 2.385a1 1 0 0 0 .42 1.057L20 11.635v.73l-2.255 1.503a1 1 0 0 0-.42 1.057l.551 2.385-.566.566-2.385-.55a1 1 0 0 0-1.057.42L12.365 20h-.73l-1.503-2.255a1 1 0 0 0-1.057-.42l-2.385.551-.566-.566.55-2.385a1 1 0 0 0-.42-1.057L4 12.365v-.73l2.255-1.503a1 1 0 0 0 .42-1.057L6.123 6.69l.566-.566 2.385.55a1 1 0 0 0 1.057-.42ZM8 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0Zm4-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"></path></svg>
                            </NavLink>

                            {/* New Chat Button */}
                            <button
                                onClick={() => setIsChatSearchOpen(true)}
                                className="flex items-center justify-center bg-[#006aff] hover:bg-[#005cdb] text-white h-[33px] w-[33px] rounded-full transition-colors"
                            >
                                <svg fill="none" width="16" viewBox="0 0 24 24" height="16" stroke="currentColor" strokeWidth="0"><path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10a10 10 0 0 1-4.136-.893l-4.68.876A1 1 0 0 1 2.02 20.8l.93-4.537A10 10 0 0 1 2 12C2 6.477 6.477 2 12 2Zm0 2a8 8 0 0 0-7.111 11.668 1 1 0 0 1 .09.66l-.7 3.415 3.537-.662c.214-.04.435-.009.63.088A8 8 0 1 0 12 4Zm0 4a1 1 0 0 1 1 1v2h2a1 1 0 1 1 0 2h-2v2a1 1 0 1 1-2 0v-2H9a1 1 0 1 1 0-2h2V9a1 1 0 0 1 1-1Z"></path></svg>
                            </button>
                        </div>
                    </div>
                    
                    {/* Search Bar */}
                    <div className="px-4 py-2 border-t border-gray-100 dark:border-dark-border/50">
                        <div className="relative group">
                            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-all" size={16} />
                            <input
                                type="text"
                                placeholder={t('messages.search_placeholder', 'Search')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[#eff2f6] dark:bg-[#19222e] py-1.5 pl-10 pr-4 rounded-full text-[13.1px] focus:bg-white dark:focus:bg-black border border-transparent focus:border-primary-500 outline-none transition-all dark:text-white placeholder-gray-500 dark:placeholder-[#667b99]"
                            />
                        </div>
                    </div>
                </div>

                <ChatSearchModal 
                    isOpen={isChatSearchOpen} 
                    onClose={() => setIsChatSearchOpen(false)} 
                />

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto bg-white dark:bg-black no-scrollbar scrollbar-thin scrollbar-color-[#dce2ea] transparent">
                    {isConversationsLoading && conversations.length === 0 ? (
                        <div className="space-y-px px-2 pt-2">
                            {[...Array(8)].map((_, i) => (
                                <SkeletonConversationItem key={i} />
                            ))}
                        </div>
                    ) : (
                        <div className="pt-2 pb-8">
                            {filteredConversations.length > 0 ? (
                                <div className="space-y-px px-2">
                                    {filteredConversations.map((conv) => (
                                        <ConversationItem
                                            key={conv.id}
                                            conversation={conv}
                                            isActive={conversationId === conv.id}
                                            onClick={() => handleConversationClick(conv.id)}
                                        />
                                    ))}
                                    
                                    {!searchQuery && hasMoreConversations && (
                                        <div ref={loadMoreRef} className="p-8 flex justify-center">
                                            {isLoadingMoreConversations && <LoadingIndicator size="sm" />}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-12 text-center">
                                    <p className="text-gray-500 dark:text-dark-text-secondary text-[15px]">
                                        {searchQuery ? t('messages.no_results') : (isInboxView ? t('messages.no_requests', 'You have no new chat requests.') : t('messages.no_messages'))}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Chat Content / Inbox / Settings (600px) */}
            <div className={`flex-1 flex flex-col min-w-0 border-r border-gray-200 dark:border-dark-border ${isChatView || isInboxView || isSettingsView || isGroupSettingsView ? 'flex' : 'hidden lg:flex'} bg-white dark:bg-black overflow-hidden lg:w-[600px]`}>
                {isSettingsView ? (
                    renderChatSettings()
                ) : isInboxView ? (
                    renderChatRequests()
                ) : isGroupSettingsView ? (
                    (() => {
                        const conversation = conversations.find(c => c.id === conversationId);
                        if (!conversation || !currentUser) {
                            return (
                                <div className="flex-1 flex items-center justify-center">
                                    <LoadingIndicator />
                                </div>
                            );
                        }
                        return (
                            <GroupChatSettingsPanel
                                conversation={conversation}
                                currentUser={currentUser}
                                onMuteToggle={() => console.log('Toggle mute')}
                                onLockToggle={(locked) => console.log('Lock/unlock:', locked)}
                                onLeave={() => {
                                    console.log('Leave group');
                                    navigate('/messages');
                                }}
                                onAddMembers={() => {
                                    // TODO: Open add people modal
                                    console.log('Add members');
                                }}
                            />
                        );
                    })()
                ) : isChatView ? (
                    <ChatPage isInSidebar={true} />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-black pb-[40px]">
                        {/* Say Hi Face Icon */}
                        <div className="flex items-center justify-center rounded-full mt-[50px] h-[64px] w-[64px]">
                            <svg fill="currentColor" viewBox="0 0 64 64" width="64" height="64" className="text-gray-900 dark:text-white">
                                <path fillRule="evenodd" clipRule="evenodd" d="M55 32C55 19.298 44.703 9 32 9S9 19.298 9 32c0 3.463.765 6.745 2.134 9.688.358.769.479 1.658.267 2.525l-2.076 8.51a1.667 1.667 0 0 0 1.987 2.02l8.876-2.005a3.84 3.84 0 0 1 2.412.26A22.9 22.9 0 0 0 32 55c12.703 0 23-10.297 23-23Zm2 0c0 13.807-11.193 25-25 25-3.638 0-7.098-.778-10.219-2.177a1.84 1.84 0 0 0-1.152-.133l-8.877 2.004c-2.655.6-5.015-1.802-4.37-4.446l2.077-8.51c.094-.384.046-.809-.139-1.207A24.9 24.9 0 0 1 7 32C7 18.193 18.193 7 32 7s25 11.193 25 25Z"></path>
                                <path fillRule="evenodd" clipRule="evenodd" d="M17.667 32a2.333 2.333 0 1 0 4.667 0 2.333 2.333 0 0 0-4.667 0Zm24 0a2.334 2.334 0 1 0 4.667 0 2.334 2.334 0 0 0-4.667 0Z"></path>
                                <path fillRule="evenodd" clipRule="evenodd" d="M35.137 37.215a1 1 0 0 1 1.414 1.414 6.143 6.143 0 0 1-8.687 0 1 1 0 0 1 1.415-1.414 4.14 4.14 0 0 0 5.858 0Z"></path>
                            </svg>
                        </div>
                        
                        <h2 className="text-[15px] font-medium tracking-[0.25px] text-gray-900 dark:text-white pt-1 pb-3">
                            {t('messages.say_hi', 'Say hi to someone')}
                        </h2>
                        
                        <button 
                            onClick={() => setIsChatSearchOpen(true)}
                            className="flex flex-row items-center justify-center bg-[#006aff] hover:bg-[#005cdb] text-white rounded-full px-[14px] py-[8px] gap-[5px] mt-3 transition-colors shadow-sm"
                        >
                            <svg fill="none" width="16" viewBox="0 0 24 24" height="16" stroke="currentColor" strokeWidth="0"><path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10a10 10 0 0 1-4.136-.893l-4.68.876A1 1 0 0 1 2.02 20.8l.93-4.537A10 10 0 0 1 2 12C2 6.477 6.477 2 12 2Zm0 2a8 8 0 0 0-7.111 11.668 1 1 0 0 1 .09.66l-.7 3.415 3.537-.662c.214-.04.435-.009.63.088A8 8 0 1 0 12 4Zm0 4a1 1 0 0 1 1 1v2h2a1 1 0 1 1 0 2h-2v2a1 1 0 1 1-2 0v-2H9a1 1 0 1 1 0-2h2V9a1 1 0 0 1 1-1Z"></path></svg>
                            <span className="text-[13.1px] font-medium tracking-[0.25px]">
                                {t('messages.new_chat', 'New chat')}
                            </span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessagesPage;
