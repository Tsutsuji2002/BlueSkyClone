import React, { useState, useEffect } from 'react';
// Share Post Modal
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { closeSharePost } from '../redux/slices/modalsSlice';
import { RootState } from '../redux/store';
import { FiX, FiSearch, FiSend, FiCheck } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import { fetchConversations } from '../redux/slices/messagesSlice';
import signalrService from '../services/signalrService';
import { showToast } from '../redux/slices/toastSlice';
import { formatPostDate } from '../utils/formatDate';

const SharePostModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const sharePostState = useAppSelector((state: RootState) => state.modals.sharePost);
    const { isOpen, post } = sharePostState || { isOpen: false, post: null };

    useEffect(() => {
        if (isOpen) console.log('SharePostModal OPEN. Post ID:', post?.id);
    }, [isOpen, post]);

    const { conversations, isLoading } = useAppSelector((state: RootState) => state.messages);
    const { user: currentUser } = useAppSelector((state: RootState) => state.auth);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (isOpen) {
            dispatch(fetchConversations());
        }
    }, [isOpen, dispatch]);

    const handleClose = () => {
        dispatch(closeSharePost());
        setSearchQuery('');
        setSelectedConversationId(null);
        setMessage('');
        setIsSending(false);
    };

    const handleSend = async () => {
        if (!selectedConversationId || !post) return;

        setIsSending(true);
        try {
            const postUrl = `${window.location.origin}/profile/${post.author.handle}/post/${post.id}`;
            const fullMessage = message ? `${message}\n${postUrl}` : postUrl;

            await signalrService.sendMessage(selectedConversationId, fullMessage);

            dispatch(showToast({ message: t('post.shared_success'), type: 'success' }));
            handleClose();
        } catch (error) {
            console.error('Failed to share post:', error);
            dispatch(showToast({ message: t('post.shared_failed'), type: 'error' }));
        } finally {
            setIsSending(false);
        }
    };

    const filteredConversations = conversations.filter(c => {
        const otherParticipant = c.participants.find(p => p.id !== currentUser?.id) || c.participants[0];
        return (
            otherParticipant.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            otherParticipant.handle.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    if (!isOpen || !post) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface rounded-t-2xl lg:rounded-2xl w-full lg:max-w-md max-h-[90vh] lg:max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-dark-border">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {t('post.share_post')}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full transition-colors"
                    >
                        <FiX size={24} className="text-gray-600 dark:text-dark-text-secondary" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100 dark:border-dark-border">
                    <div className="relative group">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                        <input
                            type="text"
                            placeholder={t('messages.search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-dark-bg py-2 pl-10 pr-4 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all dark:text-dark-text"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto min-h-[200px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredConversations.length > 0 ? (
                        filteredConversations.map(conv => {
                            const otherParticipant = conv.participants.find(p => p.id !== currentUser?.id) || conv.participants[0];
                            const isSelected = selectedConversationId === conv.id;

                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => setSelectedConversationId(conv.id)}
                                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${isSelected
                                        ? 'bg-primary-50 dark:bg-primary-900/20'
                                        : 'hover:bg-gray-50 dark:hover:bg-dark-hover'
                                        }`}
                                >
                                    <Avatar src={otherParticipant.avatar} alt={otherParticipant.displayName} size="md" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-gray-900 dark:text-dark-text truncate">
                                                {otherParticipant.displayName}
                                            </span>
                                            {isSelected && <FiCheck className="text-primary-500" />}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                                            @{otherParticipant.handle}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center text-gray-500 dark:text-dark-text-secondary">
                            {searchQuery ? t('messages.no_results', 'No matching results found') : t('messages.no_recent_chats', 'No recent conversations found')}
                        </div>
                    )}
                </div>

                {/* Footer / Selected State */}
                {selectedConversationId && (
                    <div className="p-4 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-hover/30">
                        {/* Post Preview */}
                        <div className="flex gap-3 mb-4 p-3 bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border/50 shadow-sm">
                            <div className="flex-shrink-0">
                                <Avatar src={post.author.avatarUrl || post.author.avatar} alt={post.author.displayName} size="sm" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="font-bold text-sm text-gray-900 dark:text-dark-text truncate">
                                        {post.author.displayName}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-dark-text-secondary">
                                        · {formatPostDate(post.createdAt)}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary line-clamp-2">
                                    {post.content}
                                </p>
                            </div>
                        </div>

                        {/* Input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder={t('post.add_comment_placeholder')}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="flex-1 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary-500 transition-colors dark:text-dark-text"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isSending) {
                                        handleSend();
                                    }
                                }}
                            />
                            <Button
                                variant="primary"
                                onClick={handleSend}
                                loading={isSending}
                                disabled={isSending}
                                className="rounded-full w-10 h-10 p-0 flex items-center justify-center shrink-0"
                            >
                                <FiSend size={18} />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SharePostModal;
