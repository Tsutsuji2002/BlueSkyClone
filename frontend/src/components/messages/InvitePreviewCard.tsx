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

    // If no name, generate one based on participants, ensuring we don't show raw DIDs
    const cleanHandle = (u: User) => {
        if (!u.handle || u.handle.includes(':')) {
            return u.displayName || 'User';
        }
        return u.handle;
    };

    const displayName = name || (participants.length > 0 
        ? `Group with ${participants.map(cleanHandle).join(', ')}`.slice(0, 45) + (participants.length > 2 ? '...' : '')
        : 'Invite to group chat');

    return (
        <div className="w-full bg-white dark:bg-dark-surface border border-[#A5B2C7] rounded-[16px] overflow-hidden p-4 flex flex-col gap-[16px] shadow-sm relative">
            <div className="flex flex-row gap-[12px] items-center">
                {/* Group Avatar with 3 visible in preview as per sample */}
                <div className="flex-shrink-0 p-[2px] w-[56px] h-[56px]">
                    <div className="transform scale-[0.466667] origin-top-left -mt-[2px] -ml-[2px]">
                        <GroupAvatar 
                            users={participants} 
                            size="md" 
                            maxVisible={3}
                        />
                    </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-[2px]">
                    <h3 className="text-[16.9px] font-[700] text-black dark:text-white leading-[22px] tracking-[0.25px] line-clamp-1">
                        {displayName}
                    </h3>
                    <div className="flex flex-row items-center gap-[8px]">
                        <span className="text-[9.4px] font-[500] text-[#232E3E] dark:text-gray-400 leading-[12px] tracking-[0.25px]">
                            {t('messages.group_chat', 'Group chat')}
                        </span>
                        <span className="text-[9.4px] font-[500] text-[#232E3E] dark:text-gray-400 leading-[11px] tracking-[0.25px]">
                            {memberCount > 0 ? `${memberCount}/${maxMembers} members` : `3/${maxMembers} members`}
                        </span>
                    </div>
                    {(creator || participants[0]) && (
                        <div className="flex flex-row items-center gap-[4px] mt-[2px]">
                            <span className="text-[13.1px] font-[500] text-black dark:text-white leading-[17px] tracking-[0.25px]">
                                By <span className="hover:underline cursor-pointer">{creator?.displayName || creator?.handle || participants[0]?.displayName || participants[0]?.handle}</span>
                            </span>
                            <span className="text-[13.1px] text-[#405168] dark:text-gray-500 leading-[17px] tracking-[0.25px] truncate">
                                @{creator?.handle || participants[0]?.handle}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <button 
                className="w-full bg-[rgb(0,106,255)] hover:opacity-90 py-[9px] px-[28px] rounded-full flex items-center justify-center gap-[5px] text-white font-[500] text-[13.1px] leading-[17px] tracking-[0.25px] transition-colors"
                disabled
                type="button"
            >
                <span className="flex-1 text-center">{t('messages.open_chat', 'Open chat')}</span>
                <div className="w-[17px] h-[17px] flex items-center justify-center -mr-[2px]">
                    <FiArrowRight size={16} />
                </div>
            </button>
        </div>
    );
};

export default InvitePreviewCard;
