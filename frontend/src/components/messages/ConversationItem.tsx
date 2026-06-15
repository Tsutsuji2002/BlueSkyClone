import React from 'react';
import { Conversation } from '../../types';
import Avatar from '../common/Avatar';
import UserHoverCard from '../common/UserHoverCard';
import { formatPostDate } from '../../utils/formatDate';
import { cn } from '../../utils/classNames';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BsPatchCheckFill } from 'react-icons/bs';

interface ConversationItemProps {
    conversation: Conversation;
    isActive?: boolean;
    onClick?: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
    conversation,
    isActive = false,
    onClick
}) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user: currentUser } = useAppSelector((state) => state.auth);

    const isGroup = conversation.participants.length > 2 || !!conversation.groupName;

    // Filter out the current user to find the other participant(s)
    const otherParticipants = conversation.participants.filter(p => 
        (p.did && currentUser?.did) ? p.did !== currentUser.did : (p.id !== currentUser?.id && p.handle !== currentUser?.handle)
    );
    const otherParticipant = otherParticipants[0] || conversation.participants[0];

    const groupDisplayName = conversation.groupName || otherParticipants.map(p => p.displayName || p.handle).join(', ');

    const handleProfileClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (otherParticipant) {
            navigate(`/profile/user/${otherParticipant.id}`);
        }
    };

    if (!otherParticipant) return null;

    return (
        <div
            className={cn(
                "flex gap-3 p-4 cursor-pointer transition-colors border-b border-gray-100 dark:border-dark-border",
                isActive ? "bg-primary-50 dark:bg-primary-900/10" : "hover:bg-gray-50 dark:hover:bg-dark-surface/50"
            )}
            onClick={onClick}
        >
            <div className="flex-shrink-0 relative">
                {isGroup && otherParticipants.length >= 2 ? (
                    <div className="relative w-12 h-12">
                        <div className="absolute top-0 right-0 z-10 border-2 border-white dark:border-dark-bg rounded-full overflow-hidden w-8 h-8">
                             <Avatar
                                src={otherParticipants[0].avatarUrl || otherParticipants[0].avatar}
                                alt={otherParticipants[0].displayName}
                                size="sm"
                            />
                        </div>
                        <div className="absolute bottom-0 left-0 z-0 border-2 border-white dark:border-dark-bg rounded-full overflow-hidden w-8 h-8">
                             <Avatar
                                src={otherParticipants[1].avatarUrl || otherParticipants[1].avatar}
                                alt={otherParticipants[1].displayName}
                                size="sm"
                            />
                        </div>
                    </div>
                ) : (
                    <UserHoverCard user={otherParticipant}>
                        <div onClick={handleProfileClick}>
                            <Avatar
                                src={otherParticipant.avatarUrl || otherParticipant.avatar}
                                alt={otherParticipant.displayName}
                                size="md"
                            />
                        </div>
                    </UserHoverCard>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-gray-900 dark:text-dark-text truncate flex items-center gap-0.5">
                            {isGroup ? groupDisplayName : otherParticipant.displayName}
                            {!isGroup && (otherParticipant as any).isVerified && (
                                <BsPatchCheckFill className="text-blue-500 flex-shrink-0" size={13} />
                            )}
                        </span>
                        {!isGroup && (
                            <span className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                                @{otherParticipant.handle || otherParticipant.username}
                            </span>
                        )}
                        {isGroup && (
                            <span className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                                {t('messages.n_participants', { count: conversation.participants.length })}
                            </span>
                        )}
                    </div>
                    {conversation.lastMessage && (
                        <span className="text-xs text-gray-400 dark:text-dark-text-secondary whitespace-nowrap pt-1">
                            {formatPostDate(conversation.lastMessage.createdAt)}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                    <p className={cn(
                        "text-sm truncate flex-1",
                        conversation.unreadCount > 0
                            ? "font-bold text-gray-900 dark:text-dark-text"
                            : "text-gray-500 dark:text-dark-text-secondary"
                    )}>
                        {conversation.lastMessage ? (
                            <>
                                {conversation.lastMessage.senderId === currentUser?.id && (
                                    <span className="opacity-70">{t('common.you')}: </span>
                                )}
                                {conversation.lastMessage.isRecalled
                                    ? t('messages.recalled_msg', { name: '' }).trim()
                                    : conversation.lastMessage.content || (conversation.lastMessage.imageUrl ? '📷 Photo' : '')}
                            </>
                        ) : t('messages.no_messages')}
                    </p>
                    {conversation.unreadCount > 0 && (
                        <div className="min-w-[18px] h-4 bg-primary-500 rounded-full flex items-center justify-center px-1">
                            <span className="text-[10px] text-white font-bold">{conversation.unreadCount}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConversationItem;
