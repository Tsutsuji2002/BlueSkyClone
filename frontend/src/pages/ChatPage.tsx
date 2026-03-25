import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMoreHorizontal, FiSmile, FiSend, FiUser, FiBellOff, FiUserX, FiFlag, FiLogOut, FiImage, FiX, FiCornerUpLeft, FiEdit3, FiTrash2, FiShare2, FiSearch } from 'react-icons/fi';
import Avatar from '../components/common/Avatar';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { setActiveConversation, fetchMessages, fetchConversationById, markAsRead, fetchChatLog } from '../redux/slices/messagesSlice';
import { openImageViewer } from '../redux/slices/modalsSlice';
import signalrService, { HubStatus } from '../services/signalrService';
import EmojiPicker, { Theme as EmojiTheme, EmojiClickData } from 'emoji-picker-react';
import { uploadImage } from '../services/mediaService';
import { RootState } from '../redux/store';
import { Message, Conversation, User } from '../types';
import LinkPreviewCard from '../components/common/LinkPreviewCard';
import PostEmbed from '../components/messages/PostEmbed';
import { formatChatMessageDate } from '../utils/formatDate';
import LoadingIndicator from '../components/common/LoadingIndicator';
import ConfirmModal from '../components/common/ConfirmModal';
import { getLinkMetadata } from '../utils/linkMetadata';
import { LinkPreview } from '../types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const extractPostId = (content: string) => {
    const match = content.match(/profile\/[\w.-]+\/post\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
};

const ChatPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { conversationId } = useParams<{ conversationId: string }>();
    const [message, setMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
    const [forwardSearch, setForwardSearch] = useState('');
    const [selectedReactionMessageId, setSelectedReactionMessageId] = useState<string | null>(null);
    const [hubStatus, setHubStatus] = useState<HubStatus>(signalrService.hubStatus);

    // Link Preview State
    const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
    const [isLinkLoading, setIsLinkLoading] = useState(false);
    const [stickyLink, setStickyLink] = useState<string | null>(null);
    const [dismissedLinks, setDismissedLinks] = useState<Set<string>>(new Set());
    const prevContentRef = useRef('');

    useEffect(() => {
        signalrService.onStatusChange((status) => {
            setHubStatus(status);
        });
    }, []);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Link Detection
    useEffect(() => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = (message.match(urlRegex) || []) as string[];
        const prevMatches = (prevContentRef.current.match(urlRegex) || []) as string[];

        const getCounts = (arr: string[]) => {
            const counts: Record<string, number> = {};
            arr.forEach(val => counts[val] = (counts[val] || 0) + 1);
            return counts;
        };

        const currentCounts = getCounts(matches);
        const prevCounts = getCounts(prevMatches);

        const addedLink = matches.find(link => currentCounts[link] > (prevCounts[link] || 0));

        const isPaste = addedLink && (message.length - prevContentRef.current.length > 1);
        const isEnterOrSpace = message.length > 0 && (message.endsWith(' ') || message.endsWith('\n'));
        const isInitialDetection = !linkPreview && addedLink;

        if (addedLink && (isPaste || isEnterOrSpace || isInitialDetection)) {
            const isDifferentLink = !stickyLink || (addedLink !== stickyLink && !stickyLink.startsWith(addedLink) && !addedLink.startsWith(stickyLink));
            const isRePaste = stickyLink === addedLink && isPaste;
            const isFallback = linkPreview && !linkPreview.image;

            if (isDifferentLink || isRePaste || (isEnterOrSpace && (addedLink === stickyLink || isFallback))) {
                const fetchMetadata = async () => {
                    setIsLinkLoading(true);
                    const metadata = await getLinkMetadata(addedLink);
                    if (metadata) {
                        if (dismissedLinks.has(addedLink)) {
                            setDismissedLinks(prev => {
                                const next = new Set(prev);
                                next.delete(addedLink);
                                return next;
                            });
                        }
                        setStickyLink(addedLink);
                        setLinkPreview(metadata);
                    }
                    setIsLinkLoading(false);
                };
                fetchMetadata();
            }
        } else if (!stickyLink && matches.length > 0) {
            const firstLink = matches.find(link => !dismissedLinks.has(link));
            if (firstLink && (isPaste || isEnterOrSpace)) {
                const fetchMetadata = async () => {
                    setIsLinkLoading(true);
                    const metadata = await getLinkMetadata(firstLink);
                    if (metadata) {
                        setStickyLink(firstLink);
                        setLinkPreview(metadata);
                    }
                    setIsLinkLoading(false);
                };
                fetchMetadata();
            }
        }

        prevContentRef.current = message;
    }, [message, stickyLink, dismissedLinks, linkPreview]);
    const [isUploading, setIsUploading] = useState(false);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'primary' | 'danger';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const messageMenuRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const { conversations, activeConversationMessages, isLoading, hasMore, isLoadingMore } = useAppSelector((state: RootState) => state.messages);
    const { user: currentUser } = useAppSelector((state: RootState) => state.auth);
    const { mode } = useAppSelector((state: RootState) => state.theme);
    const conversation = conversations.find((c: Conversation) => c.id === conversationId);

    // Close picker/menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            if (emojiPickerRef.current && !emojiPickerRef.current.contains(target)) {
                setShowEmojiPicker(false);
            }

            if (showOptionsMenu && menuRef.current && !menuRef.current.contains(target)) {
                const toggleButton = document.getElementById('chat-options-toggle');
                if (!toggleButton?.contains(target)) {
                    setShowOptionsMenu(false);
                }
            }

            if (selectedReactionMessageId && messageMenuRef.current && !messageMenuRef.current.contains(target)) {
                setSelectedReactionMessageId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showOptionsMenu, selectedReactionMessageId, showEmojiPicker]);

    const hasConversation = !!conversation;
    // Set active conversation and fetch messages on mount
    useEffect(() => {
        if (conversationId) {
            dispatch(setActiveConversation(conversationId));
            dispatch(fetchMessages({ conversationId, limit: 10 }));
            dispatch(markAsRead(conversationId));

            if (!conversation) {
                dispatch(fetchConversationById(conversationId));
            }

            signalrService.joinConversation(conversationId);
        }
        return () => {
            if (conversationId) {
                signalrService.leaveConversation(conversationId);
            }
            dispatch(setActiveConversation(null));
        };
    }, [conversationId, dispatch]);

    // Mark as read when new messages arrive
    useEffect(() => {
        if (conversationId && activeConversationMessages.length > 0) {
            const hasUnread = activeConversationMessages.some((m: Message) => m.senderId !== currentUser?.id && !m.isRead);
            if (hasUnread) {
                dispatch(markAsRead(conversationId));
            }
        }
    }, [activeConversationMessages, conversationId, dispatch, currentUser?.id]);

    // Scroll to bottom immediately
    React.useLayoutEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [activeConversationMessages, conversationId]);

    // Incremental Sync Polling - Mirroring BlueSky getLog (Feature 2)
    // This acts as a reliable fallback for SignalR and ensures no messages are missed.
    useEffect(() => {
        if (!conversationId || !activeConversationMessages.length) return;

        // Poll every 10 seconds if connected, or 5 seconds if disconnected
        const intervalTime = hubStatus === HubStatus.Connected ? 10000 : 5000;
        
        const pollInterval = setInterval(() => {
            const lastMessage = activeConversationMessages[activeConversationMessages.length - 1];
            if (lastMessage) {
                // Use Tid as cursor (primary) or Id as fallback
                const cursor = lastMessage.tid || lastMessage.id;
                dispatch(fetchChatLog({ conversationId, cursor }));
            }
        }, intervalTime);

        return () => clearInterval(pollInterval);
    }, [conversationId, activeConversationMessages, hubStatus, dispatch]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        setMessage(prev => prev + emojiData.emoji);
    };

    const handleScroll = async () => {
        if (!messagesContainerRef.current || isLoadingMore || !hasMore || !conversationId) return;

        if (messagesContainerRef.current.scrollTop === 0) {
            const firstMessage = activeConversationMessages[0];
            if (firstMessage) {
                const scrollHeight = messagesContainerRef.current.scrollHeight;

                await dispatch(fetchMessages({
                    conversationId,
                    limit: 15,
                    before: new Date(firstMessage.createdAt).toISOString()
                }));

                if (messagesContainerRef.current) {
                    const newScrollHeight = messagesContainerRef.current.scrollHeight;
                    messagesContainerRef.current.scrollTop = newScrollHeight - scrollHeight;
                }
            }
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!message.trim() && !selectedImage) || !conversationId) return;

        try {
            if (editingMessage) {
                await signalrService.editMessage(editingMessage.id, message);
                setEditingMessage(null);
            } else {
                let imageUrl: string | undefined;
                if (selectedImage) {
                    setIsUploading(true);
                    imageUrl = await uploadImage(selectedImage);
                    setIsUploading(false);
                }

                // Pass linkPreview to signalrService if exists
                await signalrService.sendMessage(conversationId, message.trim() || null, imageUrl || null, replyingTo?.id || null, linkPreview);
            }
            setMessage('');
            removeImage();
            setShowEmojiPicker(false);
            setReplyingTo(null);
            setLinkPreview(null);
            setStickyLink(null);
            setDismissedLinks(new Set());
        } catch (error) {
            console.error('Failed to send message:', error);
            setIsUploading(false);
        }
    };

    const handleDismissLink = () => {
        if (stickyLink) {
            setDismissedLinks(prev => new Set(prev).add(stickyLink));
            setStickyLink(null);
            setLinkPreview(null);
        }
    };

    const handleRecall = async (msgId: string) => {
        try {
            await signalrService.recallMessage(msgId);
        } catch (err) {
            console.error('Failed to recall message:', err);
        }
    };

    const handleEdit = (msg: Message) => {
        if (msg.isRecalled) return;
        setEditingMessage(msg);
        setMessage(msg.content || '');
        setReplyingTo(null);
    };

    const handleReply = (msg: Message) => {
        if (msg.isRecalled) return;
        setReplyingTo(msg);
        setEditingMessage(null);
    };

    const handleAddReaction = async (msgId: string, emoji: string) => {
        if (!conversationId) return;
        try {
            console.log(`Adding reaction: ${emoji} to message: ${msgId}`);
            await signalrService.addReaction(conversationId, msgId, emoji);
            setSelectedReactionMessageId(null);
        } catch (err) {
            console.error('Failed to add reaction:', err);
        }
    };

    const handleForward = (msg: Message) => {
        if (msg.isRecalled) return;
        setForwardingMessage(msg);
    };

    const handleViewProfile = () => {
        if (otherParticipant) {
            const profileId = otherParticipant.handle || otherParticipant.did || otherParticipant.id;
            navigate(`/profile/${profileId}`);
        }
        setShowOptionsMenu(false);
    };

    const handleMuteConversation = () => {
        // TODO: Implement mute conversation functionality
        console.log('Mute conversation');
        setShowOptionsMenu(false);
    };

    const handleBlockUser = () => {
        if (!otherParticipant) return;
        setConfirmModal({
            isOpen: true,
            title: t('moderation.block_title', 'Block User'),
            message: t('moderation.block_confirm', { name: otherParticipant.displayName || otherParticipant.handle }),
            onConfirm: () => {
                // TODO: Implement block user functionality
                console.log('Block user:', otherParticipant.id);
                navigate('/messages');
            },
            variant: 'danger'
        });
        setShowOptionsMenu(false);
    };

    const handleReportUser = () => {
        if (otherParticipant) {
            // TODO: Implement report user functionality
            console.log('Report user:', otherParticipant.id);
        }
        setShowOptionsMenu(false);
    };

    const handleLeaveConversation = () => {
        setConfirmModal({
            isOpen: true,
            title: t('messages.leave_conversation', 'Leave Conversation'),
            message: t('messages.leave_confirm'),
            onConfirm: () => {
                // TODO: Implement leave conversation functionality
                console.log('Leave conversation');
                navigate('/messages');
            },
            variant: 'danger'
        });
        setShowOptionsMenu(false);
    };

    const otherParticipant = conversation?.participants.find((p: User) => 
        (p.did && currentUser?.did) ? p.did !== currentUser.did : (p.id !== currentUser?.id && p.handle !== currentUser?.handle)
    );

    useDocumentTitle(otherParticipant?.displayName || otherParticipant?.handle || '');

    return (
        <>
            <div className="flex flex-col h-screen lg:h-screen bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border relative">
                {/* Connection Status Banner */}
                {hubStatus !== HubStatus.Connected && (
                    <div className={`px-4 py-2 text-xs flex items-center justify-between ${hubStatus === HubStatus.Connecting || hubStatus === HubStatus.Reconnecting
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${hubStatus === HubStatus.Connecting || hubStatus === HubStatus.Reconnecting ? 'bg-amber-500' : 'bg-red-500'
                                }`} />
                            {hubStatus === HubStatus.Connecting ? t('messages.connecting', 'Connecting...') :
                                hubStatus === HubStatus.Reconnecting ? t('messages.reconnecting', 'Reconnecting...') :
                                    t('messages.disconnected', 'Disconnected. Check connection/IP.')}
                        </div>
                    </div>
                )}
                {/* Header */}
                <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-dark-border bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/messages')} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors">
                            <FiArrowLeft size={20} className="text-gray-600 dark:text-dark-text" />
                        </button>
                        <Avatar
                            src={otherParticipant?.avatarUrl || otherParticipant?.avatar}
                            alt={otherParticipant?.displayName || 'User'}
                            size="md"
                        />
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-dark-text leading-tight">
                                {otherParticipant?.displayName || t('messages.unknown_user')}
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                                @{otherParticipant?.handle}
                            </p>
                        </div>
                    </div>
                    <div className="relative">
                        <button
                            id="chat-options-toggle"
                            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                        >
                            <FiMoreHorizontal size={20} className="text-gray-600 dark:text-dark-text" />
                        </button>

                        {showOptionsMenu && (
                            <div
                                ref={menuRef}
                                className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-surface rounded-xl shadow-xl border border-gray-100 dark:border-dark-border py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200"
                            >
                                <button
                                    onClick={handleViewProfile}
                                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors text-gray-700 dark:text-dark-text text-sm"
                                >
                                    <FiUser size={18} /> {t('messages.options.view_profile')}
                                </button>
                                <button
                                    onClick={handleMuteConversation}
                                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors text-gray-700 dark:text-dark-text text-sm"
                                >
                                    <FiBellOff size={18} /> {t('messages.options.mute')}
                                </button>
                                <div className="h-px bg-gray-100 dark:bg-dark-border my-1" />
                                <button
                                    onClick={handleBlockUser}
                                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors text-red-500 text-sm font-medium"
                                >
                                    <FiUserX size={18} /> {t('messages.options.block')}
                                </button>
                                <button
                                    onClick={handleReportUser}
                                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors text-red-500 text-sm font-medium"
                                >
                                    <FiFlag size={18} /> {t('messages.options.report')}
                                </button>
                                <button
                                    onClick={handleLeaveConversation}
                                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors text-red-500 text-sm font-medium"
                                >
                                    <FiLogOut size={18} /> {t('messages.options.leave')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div
                    className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth"
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                >
                    {isLoading && activeConversationMessages.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                            <LoadingIndicator size="lg" />
                        </div>
                    ) : activeConversationMessages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                                <FiSmile size={32} className="text-blue-500" />
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-dark-text mb-1">
                                {t('messages.start_conversation')}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary max-w-xs mb-6">
                                {t('messages.say_hello_desc')}
                            </p>
                            <button className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-full text-sm font-bold transition-all transform active:scale-95 shadow-md shadow-primary-500/20">
                                {t('messages.say_hello')}
                            </button>
                        </div>
                    ) : (
                        <>
                            {isLoadingMore && (
                                <div className="flex justify-center py-2">
                                    <LoadingIndicator size="sm" center={false} />
                                </div>
                            )}
                            <div className="flex-grow min-h-0"></div>
                            {activeConversationMessages.map((msg: Message) => {
                                const isMe = (msg.sender?.did && currentUser?.did) 
                                    ? msg.sender.did === currentUser.did 
                                    : (msg.senderId === currentUser?.id || (msg.sender?.handle && currentUser?.handle && msg.sender.handle === currentUser.handle));

                                return (
                                    <div key={msg.id} id={`msg-${msg.id}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group/msg relative`}>
                                        <div className={`max-w-[85%] sm:max-w-[70%] overflow-hidden relative ${isMe
                                            ? 'bg-[#0085ff] text-white rounded-2xl rounded-tr-none shadow-sm shadow-primary-500/10'
                                            : 'bg-gray-100 dark:bg-[#1e1e1e] text-gray-900 dark:text-dark-text rounded-2xl rounded-tl-none border border-gray-100 dark:border-dark-border/50'
                                            }`}>

                                            {/* Reply Context */}
                                            {msg.replyTo && !msg.isRecalled && (
                                                <div className={`mx-2 mt-2 p-2 rounded-lg text-xs border-l-2 bg-black/5 dark:bg-white/5 flex flex-col gap-1 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${isMe ? 'border-white/50' : 'border-primary-500/50'}`}
                                                    onClick={() => {
                                                        const target = document.getElementById(`msg-${msg.replyTo?.id}`);
                                                        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    }}
                                                >
                                                    <span className="font-bold opacity-70">
                                                        {msg.replyTo.senderId === currentUser?.id ? t('common.you') : (msg.replyTo.sender?.displayName || t('messages.unknown_user'))}
                                                    </span>
                                                    <p className="line-clamp-1 opacity-60 text-[11px]">
                                                        {msg.replyTo.isRecalled ? t('messages.recalled_msg', { name: '' }).trim() : msg.replyTo.content || (msg.replyTo.imageUrl ? '📷 Photo' : '')}
                                                    </p>
                                                </div>
                                            )}

                                            {msg.isRecalled ? (
                                                <div className="px-4 py-2 italic opacity-50 text-[13px]">
                                                    {t('messages.recalled_msg', { name: isMe ? t('common.you') : (msg.sender?.displayName || t('messages.unknown_user')) })}
                                                </div>
                                            ) : (
                                                <>
                                                    {msg.imageUrl && (
                                                        <div className="p-1">
                                                            <img
                                                                src={msg.imageUrl!.startsWith('/') ? `http://localhost:5000${msg.imageUrl}` : msg.imageUrl!}
                                                                alt="Chat"
                                                                className="rounded-xl w-full max-h-[400px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                                                onClick={() => {
                                                                    const fullUrl = msg.imageUrl!.startsWith('/') ? `http://localhost:5000${msg.imageUrl}` : msg.imageUrl!;
                                                                    dispatch(openImageViewer({
                                                                        images: [{ url: fullUrl }],
                                                                        index: 0
                                                                    }));
                                                                }}
                                                                onLoad={() => {
                                                                    if (messagesContainerRef.current) {
                                                                        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    )}

                                                    {msg.content && (
                                                        <div className="px-4 py-2.5">
                                                            <p className="text-[15px] whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                                                            {msg.isModified && (
                                                                <span className="text-[10px] opacity-70 block mt-1 italic leading-none">{t('messages.modified')}</span>
                                                            )}
                                                            {extractPostId(msg.content) ? (
                                                                <PostEmbed postId={extractPostId(msg.content)!} />
                                                            ) : (
                                                                msg.linkPreview && <LinkPreviewCard preview={msg.linkPreview} />
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* Reactions Display (Corner badges) */}
                                        {msg.reactions && msg.reactions.length > 0 && (
                                            <div className={`flex flex-wrap gap-1 mt-[-10px] z-10 ${isMe ? 'justify-end mr-2' : 'justify-start ml-2'}`}>
                                                {Object.entries(msg.reactions.reduce((acc, r) => {
                                                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                                    return acc;
                                                }, {} as Record<string, number>)).map(([emoji, count]) => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => handleAddReaction(msg.id, emoji)}
                                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-all border shadow-sm backdrop-blur-sm ${msg.reactions?.some(r => (r.userId === currentUser?.id || r.userId === currentUser?.did) && r.emoji === emoji)
                                                            ? 'bg-primary-50/90 dark:bg-primary-500/20 border-primary-200 dark:border-primary-500/30 text-primary-600 dark:text-primary-400'
                                                            : 'bg-white/90 dark:bg-dark-surface/90 border-gray-100 dark:border-dark-border text-gray-500 hover:border-gray-300 dark:hover:border-dark-text-secondary'
                                                            }`}
                                                    >
                                                        <span>{emoji}</span>
                                                        {count > 1 && <span className="font-bold">{count}</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <div className={`flex items-center gap-2 mt-1 px-1`}>
                                            <span className="text-[10px] font-medium text-gray-400 dark:text-dark-text-secondary">
                                                {formatChatMessageDate(msg.createdAt, i18n.language)}
                                            </span>
                                            {isMe && msg.isRead && (
                                                <span className="text-[10px] font-bold text-primary-500 uppercase tracking-tighter">
                                                    {t('messages.read')}
                                                </span>
                                            )}                                            {/* Quick Reaction Bar (Bluesky style - visible on hover) */}
                                            <div className={`absolute -top-11 ${isMe ? 'right-0' : 'left-0'} opacity-0 group-hover/msg:opacity-100 transition-all duration-300 z-20 pointer-events-none group-hover/msg:pointer-events-auto transform translate-y-2 group-hover/msg:translate-y-0`}>
                                                <div className="flex items-center gap-0.5 p-1 bg-white/95 dark:bg-[#1a1a1a]/95 border border-gray-200/50 dark:border-white/10 rounded-full shadow-2xl backdrop-blur-md">
                                                    {['👍', '❤️', '😆', '😮', '😢', '🔥'].map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            onClick={() => handleAddReaction(msg.id, emoji)}
                                                            className="w-9 h-9 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all hover:scale-125 text-xl active:scale-95"
                                                            title={emoji}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                    <div className="w-[1px] h-4 bg-gray-200 dark:bg-white/10 mx-1" />
                                                    <button
                                                        onClick={() => setSelectedReactionMessageId(msg.id)}
                                                        className="w-9 h-9 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all text-gray-500 hover:text-primary-500"
                                                    >
                                                        <FiMoreHorizontal size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Full Action Menu (on click) */}
                                            {selectedReactionMessageId === msg.id && (
                                                <div
                                                    ref={messageMenuRef}
                                                    className={`absolute top-full mt-2 ${isMe ? 'right-0' : 'left-0'} bg-white dark:bg-dark-surface shadow-xl rounded-xl border border-gray-100 dark:border-dark-border z-20 min-w-[170px] overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
                                                >
                                                    <div className="py-1">
                                                        <button onClick={() => { handleReply(msg); setSelectedReactionMessageId(null); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-dark-bg/50 flex items-center gap-3 text-gray-700 dark:text-dark-text">
                                                            <FiCornerUpLeft size={16} /> {t('messages.reply')}
                                                        </button>
                                                        {isMe && !msg.isRecalled && (
                                                            <>
                                                                <button onClick={() => { handleEdit(msg); setSelectedReactionMessageId(null); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-dark-bg/50 flex items-center gap-3 text-gray-700 dark:text-dark-text">
                                                                    <FiEdit3 size={16} /> {t('messages.edit')}
                                                                </button>
                                                                <button onClick={() => { handleRecall(msg.id); setSelectedReactionMessageId(null); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-dark-bg/50 flex items-center gap-3 text-red-500">
                                                                    <FiTrash2 size={16} /> {t('messages.recall')}
                                                                </button>
                                                            </>
                                                        )}
                                                        <button onClick={() => { handleForward(msg); setSelectedReactionMessageId(null); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-dark-bg/50 flex items-center gap-3 text-gray-700 dark:text-dark-text">
                                                            <FiShare2 size={16} /> {t('messages.forward')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>

                {/* Image Preview */}
                {imagePreview && (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-dark-surface/30 border-t border-gray-100 dark:border-dark-border animate-in slide-in-from-bottom duration-300">
                        <div className="relative inline-block group">
                            <img src={imagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-xl shadow-lg ring-2 ring-white dark:ring-dark-border" />
                            <button
                                onClick={removeImage}
                                className="absolute -top-2 -right-2 p-1.5 bg-gray-900/80 hover:bg-gray-900 text-white rounded-full shadow-md backdrop-blur-sm transition-all"
                            >
                                <FiX size={14} />
                            </button>
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Reply/Edit Preview */}
                {(replyingTo || editingMessage || linkPreview || isLinkLoading) && (
                    <div className="px-4 py-2 bg-gray-50 dark:bg-dark-surface/50 border-t border-gray-100 dark:border-dark-border flex items-center justify-between animate-in slide-in-from-bottom duration-200">
                        {(replyingTo || editingMessage) ? (
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-500 rounded-full">
                                    {replyingTo ? <FiCornerUpLeft size={16} /> : <FiEdit3 size={16} />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-primary-500 uppercase tracking-wider">
                                        {replyingTo
                                            ? t('messages.replying_to', { name: replyingTo.senderId === currentUser?.id ? t('common.you') : (replyingTo.sender?.displayName || t('messages.unknown_user')) })
                                            : t('messages.edit')}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                                        {replyingTo ? (replyingTo.content || '📷 Photo') : (editingMessage?.content || '📷 Photo')}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            // Link Preview
                            <div className="w-full relative group">
                                {isLinkLoading ? (
                                    <div className="flex items-center gap-3 animate-pulse">
                                        <div className="w-12 h-12 bg-gray-200 dark:bg-dark-border rounded-lg" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-gray-200 dark:bg-dark-border rounded w-3/4" />
                                            <div className="h-2 bg-gray-200 dark:bg-dark-border rounded w-1/2" />
                                        </div>
                                    </div>
                                ) : linkPreview ? (
                                    <div className="flex gap-3 bg-white dark:bg-dark-bg rounded-lg p-2 border border-gray-100 dark:border-dark-border shadow-sm">
                                        {linkPreview.image && (
                                            <div className="w-16 h-16 shrink-0 rounded-md overflow-hidden bg-gray-100">
                                                <img src={linkPreview.image} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{linkPreview.domain}</div>
                                            <div className="font-bold text-xs text-gray-900 dark:text-dark-text truncate">{linkPreview.title}</div>
                                            <div className="text-xs text-gray-500 truncate">{linkPreview.description}</div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}

                        <button
                            onClick={() => {
                                if (replyingTo || editingMessage) {
                                    setReplyingTo(null); setEditingMessage(null); if (editingMessage) setMessage('');
                                } else {
                                    handleDismissLink();
                                }
                            }}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-dark-bg rounded-full transition-colors ml-2"
                        >
                            <FiX size={16} />
                        </button>
                    </div>
                )}

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-dark-bg border-t border-gray-200 dark:border-dark-border">
                    <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                        <div className="flex flex-1 items-end gap-2 bg-gray-100 dark:bg-dark-surface rounded-[24px] px-3 py-2 border border-transparent focus-within:border-primary-500/30 focus-within:bg-white dark:focus-within:bg-dark-surface transition-all">
                            <div className="flex items-center gap-1 mb-1">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 text-primary-500 hover:bg-primary-500/10 rounded-full transition-colors cursor-pointer"
                                    title={t('common.add_image')}
                                >
                                    <FiImage size={22} />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                />
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className={`p-2 transition-colors rounded-full ${showEmojiPicker ? 'bg-primary-500/10 text-primary-500' : 'text-primary-500 hover:bg-primary-500/10'}`}
                                        title={t('common.add_emoji')}
                                    >
                                        <FiSmile size={22} />
                                    </button>

                                    {showEmojiPicker && (
                                        <div
                                            ref={emojiPickerRef}
                                            className="absolute bottom-full left-0 mb-4 z-30 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                                        >
                                            <EmojiPicker
                                                onEmojiClick={handleEmojiClick}
                                                theme={mode === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                                                lazyLoadEmojis={true}
                                                skinTonesDisabled={true}
                                                searchPlaceHolder={t('common.search_emojis')}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <textarea
                                value={message}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                                placeholder={t('messages.type_message')}
                                className="flex-1 bg-transparent border-none outline-none py-2 text-[15px] text-gray-900 dark:text-dark-text placeholder-gray-500 dark:placeholder-dark-text-secondary resize-none max-h-32 min-h-[40px]"
                                rows={1}
                                style={{ height: 'auto' }}
                                ref={(el: HTMLTextAreaElement | null) => {
                                    if (el) {
                                        el.style.height = 'auto';
                                        el.style.height = `${el.scrollHeight}px`;
                                    }
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={(!message.trim() && !selectedImage) || isUploading || hubStatus !== HubStatus.Connected}
                            className={`p-2 rounded-full transition-all transform active:scale-90 ${(message.trim() || selectedImage) && !isUploading && hubStatus === HubStatus.Connected
                                ? 'text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                }`}
                        >
                            <FiSend size={24} className="translate-x-0" />
                        </button>
                    </form>
                </div>
            </div>

            {/* Forward Message Modal */}
            {forwardingMessage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">{t('messages.forward')}</h3>
                            <button onClick={() => setForwardingMessage(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-full transition-colors">
                                <FiX size={20} />
                            </button>
                        </div>

                        <div className="p-4 bg-gray-50/50 dark:bg-dark-bg/20 border-b border-gray-100 dark:border-dark-border">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={t('common.search')}
                                    value={forwardSearch}
                                    onChange={(e) => setForwardSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {conversations
                                .filter(c => {
                                    const other = c.participants.find(p => p.id !== currentUser?.id);
                                    return other?.displayName.toLowerCase().includes(forwardSearch.toLowerCase()) ||
                                        other?.handle.toLowerCase().includes(forwardSearch.toLowerCase());
                                })
                                .map(conv => {
                                    const other = conv.participants.find(p => p.id !== currentUser?.id);
                                    return (
                                        <button
                                            key={conv.id}
                                            onClick={async () => {
                                                const token = localStorage.getItem('token');
                                                await fetch(`${API_URL}/chat/messages/${forwardingMessage.id}/forward`, {
                                                    method: 'POST',
                                                    headers: {
                                                        'Authorization': `Bearer ${token}`,
                                                        'Content-Type': 'application/json'
                                                    },
                                                    body: JSON.stringify({ targetConversationIds: [conv.id] })
                                                });
                                                setForwardingMessage(null);
                                            }}
                                            className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-bg/50 rounded-xl transition-colors group"
                                        >
                                            <Avatar src={other?.avatarUrl} alt={other?.displayName || ''} size="md" />
                                            <div className="text-left min-w-0 flex-1">
                                                <p className="font-bold text-gray-900 dark:text-dark-text truncate">{other?.displayName}</p>
                                                <p className="text-xs text-gray-500 truncate">@{other?.handle}</p>
                                            </div>
                                            <div className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-dark-border flex items-center justify-center group-hover:border-primary-500 transition-colors">
                                                <FiSend size={14} className="text-gray-400 group-hover:text-primary-500" />
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}
            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
            />
        </>
    );
};

export default ChatPage;
