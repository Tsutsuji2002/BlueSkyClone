import React from 'react';
import { User } from '../../types';
import GroupAvatar from './GroupAvatar';
import { FiArrowRight } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

interface InvitePreviewCardProps {
    participants: User[];
    name?: string;
    creator?: User;
    memberCount?: number;
    maxMembers?: number;
    inviteLink: string;
    isDark?: boolean;
}

const InvitePreviewCard: React.FC<InvitePreviewCardProps> = ({
    participants,
    name,
    creator,
    memberCount = 0,
    maxMembers = 50,
    inviteLink,
    isDark = false
}) => {
    const { t } = useTranslation();

    // If no name, generate one based on participants
    const displayName = name || (participants.length > 0 
        ? `Group with ${participants.map(p => p.handle).join(', ')}`.slice(0, 45) + (participants.length > 2 ? '...' : '')
        : 'Invite to group chat');

    return (
        <div className="w-full bg-white dark:bg-dark-surface border border-[#A5B2C7]/50 rounded-[16px] overflow-hidden p-4 flex flex-col gap-4 shadow-sm">
            <div className="flex flex-row gap-3 items-center">
                {/* Group Avatar with 3 visible in preview as per sample */}
                <div className="flex-shrink-0">
                    <GroupAvatar 
                        users={participants} 
                        size="md" 
                        maxVisible={3}
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-[16.9px] font-bold text-black dark:text-white leading-tight truncate">
                        {displayName}
                    </h3>
                    <div className="flex flex-row items-center gap-2 mt-0.5">
                        <span className="text-[9.4px] font-bold text-[#405168] dark:text-gray-400 uppercase tracking-tight">
                            {t('messages.group_chat', 'Group chat')}
                        </span>
                        <span className="text-[9.4px] font-bold text-[#405168] dark:text-gray-400 uppercase tracking-tight">
                            {memberCount}/{maxMembers} members
                        </span>
                    </div>
                    {creator && (
                        <div className="flex flex-row items-center gap-1 mt-1">
                            <span className="text-[13.1px] text-[#405168] dark:text-gray-400">
                                By {creator.displayName}
                            </span>
                            <span className="text-[13.1px] text-[#405168]/60 dark:text-gray-500 truncate">
                                @{creator.handle}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <button 
                className="w-full bg-[#006AFF] hover:bg-[#0052cc] py-2.5 rounded-full flex items-center justify-center gap-2 text-white font-bold text-[13.1px] transition-colors"
                disabled
            >
                {t('messages.open_chat', 'Open chat')}
                <FiArrowRight size={16} />
            </button>
        </div>
    );
};

export default InvitePreviewCard;
