import React from 'react';
import Avatar from '../common/Avatar';
import { User } from '../../types';
import { cn } from '../../utils/classNames';

interface GroupAvatarProps {
    users: User[];
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    maxVisible?: number;
}

const GroupAvatar: React.FC<GroupAvatarProps> = ({
    users,
    size = 'md',
    className,
    maxVisible = 2
}) => {
    // Debug logging
    console.log('[GroupAvatar] Received users:', users.map(u => ({
        id: u.id,
        handle: u.handle,
        displayName: u.displayName,
        avatar: u.avatar,
        avatarUrl: u.avatarUrl,
        did: u.did
    })));

    const visibleUsers = users.slice(0, maxVisible);
    const hasMore = users.length > maxVisible;

    // Define dimensions based on size
    const containerSizes = {
        xs: 'w-8 h-8',
        sm: 'w-10 h-10',
        md: 'w-12 h-12',
        lg: 'w-14 h-14',
        xl: 'w-20 h-20',
    };

    const avatarSizes = {
        xs: 'xs',
        sm: 'xs',
        md: 'sm',
        lg: 'md',
        xl: 'lg',
    };

    // Correct overlapping offsets to match official sample
    const offsets = {
        2: [
            'top-0 left-0 z-20',
            'bottom-0 right-0 z-10'
        ],
        3: [
            'top-[-2px] left-[-2px] z-30', // P1: Largest, Top Left
            'top-[62px] left-[38px] z-20', // P2: Medium, Bottom Right-ish
            'top-[18px] left-[71px] z-10'  // P3: Smallest, Top Right
        ]
    };

    // Specific sizes for 3-avatar layout to match official sample
    const individualSizes = {
        3: [68, 56, 46]
    };

    if (users.length === 0) return null;
    if (users.length === 1) {
        return (
            <Avatar
                src={users[0].avatarUrl || users[0].avatar}
                alt={users[0].displayName || 'User'}
                size={size}
                className={className}
            />
        );
    }

    return (
        <div className={cn('relative', containerSizes[size], className)}>
            {visibleUsers.map((user, index) => (
                <div 
                    key={user.did || user.id || index}
                    className={cn(
                        'absolute',
                        offsets[visibleUsers.length as keyof typeof offsets]?.[index] || 'static'
                    )}
                >
                    <Avatar
                        src={user.avatarUrl || user.avatar}
                        alt={user.displayName || 'User'}
                        // @ts-ignore
                        size={individualSizes[visibleUsers.length as keyof typeof individualSizes]?.[index] || avatarSizes[size]}
                        hasBorder={true}
                        // Use a specific class for the ring that matches the app background
                        className="ring-2 ring-white dark:ring-black"
                        borderColor="border-none" // We use ring instead of border for cleaner stacking
                    />
                </div>
            ))}
            {hasMore && (
                <div className="absolute bottom-0 right-[-4px] bg-gray-200 dark:bg-dark-surface rounded-full px-1.5 py-0.5 text-[10px] font-bold z-40 border border-white dark:border-black">
                    +{users.length - maxVisible}
                </div>
            )}
        </div>
    );
};

export default GroupAvatar;
