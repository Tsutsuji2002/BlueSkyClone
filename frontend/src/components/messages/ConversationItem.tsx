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

    return (
        <div
            className={cn(
                "relative bg-white dark:bg-black mx-2 my-0.5 group",
                isActive ? "bg-primary-50 dark:bg-primary-900/10 rounded-lg" : "hover:bg-gray-50 dark:hover:bg-dark-surface/50 rounded-lg"
            )}
            onClick={onClick}
        >
            <div className="flex flex-row items-center gap-3 p-3 cursor-pointer">
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

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                        <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-[15px] text-gray-900 dark:text-dark-text truncate leading-[21px]">
                                    {isGroup ? groupDisplayName : otherParticipant.displayName}
                                </span>
                                {!isGroup && (otherParticipant as any).isVerified && (
                                    <BsPatchCheckFill className="text-blue-500 flex-shrink-0" size={13} />
                                )}
                                <span className="text-[13.1px] text-[#647990] dark:text-[#a5b2c5] leading-[21px] whitespace-nowrap ml-1 font-normal">
                                    {formatPostDate(conversation.lastMessage?.createdAt || conversation.createdAt)}
                                </span>
                            </div>
                            <div className="text-[13.1px] text-[#647990] dark:text-[#a5b2c5] leading-[17px] truncate pb-1">
                                @{otherParticipant.handle || otherParticipant.username}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <p className={cn(
                            "text-[13.1px] truncate flex-1 leading-[17px]",
                            conversation.unreadCount > 0
                                ? "font-medium text-gray-900 dark:text-dark-text"
                                : "text-[#232e3e] dark:text-gray-300"
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
                            <div className="min-w-[12px] h-[12px] bg-primary-500 rounded-full ml-2 self-center flex-shrink-0" title={`${conversation.unreadCount} unread`} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConversationItem;
