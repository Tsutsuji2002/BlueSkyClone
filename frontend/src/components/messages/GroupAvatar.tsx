import React from 'react';
import Avatar from '../common/Avatar';
import { User } from '../../types';
import { cn } from '../../utils/classNames';

interface GroupAvatarProps {
    users: User[];
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
    className?: string;
    maxVisible?: number;
}

const sizeMap: Record<string, number> = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    '2xl': 80,
};

const GroupAvatar: React.FC<GroupAvatarProps> = ({
    users,
    size = 'md',
    className,
    maxVisible,
}) => {
    if (!users || users.length === 0) return null;

    if (users.length === 1) {
        return (
            <Avatar
                src={users[0]?.avatarUrl || users[0]?.avatar}
                alt={users[0]?.displayName || 'User'}
                size={size}
                className={className}
            />
        );
    }

    const containerPx = typeof size === 'number' ? size : (sizeMap[size] || 40);
    const borderClass = 'border-2 border-white dark:border-dark-bg';

    // 2-member group layout (Matches Bluesky official UI / Pic 2)
    // Two diagonally overlapping avatars: top-left (User 0) and bottom-right (User 1)
    if (users.length === 2 || (maxVisible === 2 && users.length >= 2)) {
        const itemSize = Math.max(16, Math.round(containerPx * 0.70));
        return (
            <div
                className={cn('relative flex-shrink-0', className)}
                style={{ width: containerPx, height: containerPx }}
            >
                {/* User 0: Top-left */}
                <div
                    className="absolute top-0 left-0 z-10"
                    style={{ width: itemSize, height: itemSize }}
                >
                    <Avatar
                        src={users[0]?.avatarUrl || users[0]?.avatar}
                        alt={users[0]?.displayName || 'User'}
                        size={itemSize}
                        hasBorder={true}
                        borderColor={borderClass}
                    />
                </div>

                {/* User 1: Bottom-right, overlapping User 0 */}
                <div
                    className="absolute bottom-0 right-0 z-20"
                    style={{ width: itemSize, height: itemSize }}
                >
                    <Avatar
                        src={users[1]?.avatarUrl || users[1]?.avatar}
                        alt={users[1]?.displayName || 'User'}
                        size={itemSize}
                        hasBorder={true}
                        borderColor={borderClass}
                    />
                </div>

                {maxVisible === 2 && users.length > 2 && (
                    <div className="absolute -bottom-1 -right-1 bg-gray-200 dark:bg-dark-surface rounded-full px-1 py-0.2 text-[9px] font-bold z-30 border border-white dark:border-dark-bg">
                        +{users.length - 2}
                    </div>
                )}
            </div>
        );
    }

    // 3-member group layout
    // Triangle layout: Top-center, Bottom-left, Bottom-right
    if (users.length === 3 || (maxVisible === 3 && users.length >= 3)) {
        const itemSize = Math.max(14, Math.round(containerPx * 0.58));
        const topOffset = 0;
        const leftOffsetTop = Math.round((containerPx - itemSize) / 2);

        return (
            <div
                className={cn('relative flex-shrink-0', className)}
                style={{ width: containerPx, height: containerPx }}
            >
                {/* User 0: Top-center */}
                <div
                    className="absolute z-10"
                    style={{ top: topOffset, left: leftOffsetTop, width: itemSize, height: itemSize }}
                >
                    <Avatar
                        src={users[0]?.avatarUrl || users[0]?.avatar}
                        alt={users[0]?.displayName || 'User'}
                        size={itemSize}
                        hasBorder={true}
                        borderColor={borderClass}
                    />
                </div>

                {/* User 1: Bottom-left */}
                <div
                    className="absolute bottom-0 left-0 z-20"
                    style={{ width: itemSize, height: itemSize }}
                >
                    <Avatar
                        src={users[1]?.avatarUrl || users[1]?.avatar}
                        alt={users[1]?.displayName || 'User'}
                        size={itemSize}
                        hasBorder={true}
                        borderColor={borderClass}
                    />
                </div>

                {/* User 2: Bottom-right */}
                <div
                    className="absolute bottom-0 right-0 z-30"
                    style={{ width: itemSize, height: itemSize }}
                >
                    <Avatar
                        src={users[2]?.avatarUrl || users[2]?.avatar}
                        alt={users[2]?.displayName || 'User'}
                        size={itemSize}
                        hasBorder={true}
                        borderColor={borderClass}
                    />
                </div>

                {maxVisible === 3 && users.length > 3 && (
                    <div className="absolute -bottom-1 -right-1 bg-gray-200 dark:bg-dark-surface rounded-full px-1 py-0.2 text-[9px] font-bold z-40 border border-white dark:border-dark-bg">
                        +{users.length - 3}
                    </div>
                )}
            </div>
        );
    }

    // 4 or more members: 2x2 grid / quadrant layout
    const itemSize = Math.max(12, Math.round(containerPx * 0.50));
    const showCountBadge = users.length > 4;
    const visibleUsers = users.slice(0, showCountBadge ? 3 : 4);

    return (
        <div
            className={cn('relative flex-shrink-0', className)}
            style={{ width: containerPx, height: containerPx }}
        >
            {/* User 0: Top-left */}
            <div className="absolute top-0 left-0 z-10" style={{ width: itemSize, height: itemSize }}>
                <Avatar
                    src={visibleUsers[0]?.avatarUrl || visibleUsers[0]?.avatar}
                    alt={visibleUsers[0]?.displayName || 'User'}
                    size={itemSize}
                    hasBorder={true}
                    borderColor={borderClass}
                />
            </div>

            {/* User 1: Top-right */}
            <div className="absolute top-0 right-0 z-10" style={{ width: itemSize, height: itemSize }}>
                <Avatar
                    src={visibleUsers[1]?.avatarUrl || visibleUsers[1]?.avatar}
                    alt={visibleUsers[1]?.displayName || 'User'}
                    size={itemSize}
                    hasBorder={true}
                    borderColor={borderClass}
                />
            </div>

            {/* User 2: Bottom-left */}
            <div className="absolute bottom-0 left-0 z-20" style={{ width: itemSize, height: itemSize }}>
                <Avatar
                    src={visibleUsers[2]?.avatarUrl || visibleUsers[2]?.avatar}
                    alt={visibleUsers[2]?.displayName || 'User'}
                    size={itemSize}
                    hasBorder={true}
                    borderColor={borderClass}
                />
            </div>

            {/* Slot 4: User 3 or +N counter badge */}
            <div className="absolute bottom-0 right-0 z-20" style={{ width: itemSize, height: itemSize }}>
                {showCountBadge ? (
                    <div
                        className="rounded-full bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-hover flex items-center justify-center font-bold text-[10px] text-gray-700 dark:text-dark-text border-2 border-white dark:border-dark-bg shadow-sm"
                        style={{ width: itemSize, height: itemSize }}
                    >
                        +{users.length - 3}
                    </div>
                ) : (
                    <Avatar
                        src={visibleUsers[3]?.avatarUrl || visibleUsers[3]?.avatar}
                        alt={visibleUsers[3]?.displayName || 'User'}
                        size={itemSize}
                        hasBorder={true}
                        borderColor={borderClass}
                    />
                )}
            </div>
        </div>
    );
};

export default GroupAvatar;
