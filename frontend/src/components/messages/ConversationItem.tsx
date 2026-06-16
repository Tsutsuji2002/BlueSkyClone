import React from 'react';
import { Conversation } from '../../types';
import Avatar from '../common/Avatar';
import GroupAvatar from './GroupAvatar';
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
    const hasChatted = !!conversation.lastMessage;
    const hasUnread = conversation.unreadCount > 0;

    // Filter out the current user to find the other participant(s)
    const otherParticipants = conversation.participants.filter(p =>
        (p.did && currentUser?.did) ? p.did !== currentUser.did : (p.id !== currentUser?.id && p.handle !== currentUser?.handle)
    );
    const otherParticipant = otherParticipants[0] || conversation.participants[0];

    const groupDisplayName = conversation.groupName || (otherParticipants.length > 0
        ? "Group with " + otherParticipants.map(p => p.handle ? `@${p.handle}` : p.displayName).join(', ')
        : t('messages.group_chat', 'Group Chat'));

    const handleProfileClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (otherParticipant && !isGroup) {
            navigate(`/profile/${otherParticipant.handle || otherParticipant.did || otherParticipant.id}`);
        }
    };

    if (!otherParticipant) return null;

    const lastMessageText = (() => {
        if (!conversation.lastMessage) return null;
        const lm = conversation.lastMessage;
        const isMine = lm.senderId === currentUser?.id;
        const prefix = isMine ? <span className="text-gray-500 dark:text-gray-400">{t('common.you')}: </span> : null;
        const text = lm.isRecalled
            ? t('messages.recalled_msg', { name: '' }).trim()
            : lm.content || (lm.imageUrl ? '📷 Photo' : '');
        return <>{prefix}{text}</>;
    })();

    return (
        <div
            className={cn(
                "relative mx-2 my-0.5 group cursor-pointer rounded-xl transition-colors",
                isActive
                    ? "bg-primary-50 dark:bg-primary-900/10"
                    : "bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-dark-surface/50"
            )}
            onClick={onClick}
        >
            <div className="flex flex-row items-center gap-3 px-3 py-3">
                {/* Avatar */}
                <div className="flex-shrink-0 relative">
                    {isGroup && otherParticipants.length >= 2 ? (
                        <GroupAvatar
                            users={otherParticipants}
                            size="sm"
                        />
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

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Row 1: Name + time */}
                    <div className="flex items-baseline justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                            <span className={cn(
                                "text-[15px] truncate leading-[20px]",
                                hasUnread ? "font-bold text-gray-900 dark:text-white" : "font-semibold text-gray-900 dark:text-dark-text"
                            )}>
                                {isGroup ? groupDisplayName : otherParticipant.displayName}
                            </span>
                            {!isGroup && (otherParticipant as any).isVerified && (
                                <BsPatchCheckFill className="text-blue-500 flex-shrink-0" size={13} />
                            )}
                        </div>
                        {hasChatted && (
                            <span className="text-[12px] text-[#647990] dark:text-[#a5b2c5] flex-shrink-0 leading-[20px]">
                                {formatPostDate(conversation.lastMessage!.createdAt || conversation.createdAt)}
                            </span>
                        )}
                    </div>

                    {/* Row 2: last message or handle */}
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                        {hasChatted ? (
                            <p className={cn(
                                "text-[13.1px] truncate flex-1 leading-[17px]",
                                hasUnread
                                    ? "font-semibold text-gray-900 dark:text-dark-text"
                                    : "text-[#647990] dark:text-[#a5b2c5]"
                            )}>
                                {lastMessageText}
                            </p>
                        ) : (
                            <p className="text-[12px] text-[#647990] dark:text-[#a5b2c5] truncate flex-1 leading-[17px]">
                                @{otherParticipant.handle || otherParticipant.username}
                            </p>
                        )}
                        {/* Unread dot */}
                        {hasUnread && (
                            <div
                                className="min-w-[10px] h-[10px] bg-primary-500 rounded-full flex-shrink-0"
                                title={`${conversation.unreadCount} unread`}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConversationItem;
