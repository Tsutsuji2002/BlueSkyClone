import React from 'react';
import { cn } from '../../utils/classNames';

const MessageSkeleton: React.FC<{ isMe?: boolean }> = ({ isMe = false }) => {
    return (
        <div className={cn(
            "flex flex-col w-full mb-4 animate-pulse",
            isMe ? "items-end pl-[20%]" : "items-start pr-[20%]"
        )}>
            <div className={cn(
                "h-10 rounded-2xl w-full max-w-[280px]",
                isMe ? "bg-primary-100 dark:bg-primary-900/20 rounded-tr-none" : "bg-gray-100 dark:bg-dark-surface rounded-tl-none"
            )} />
            <div className="mt-1 h-3 w-16 bg-gray-50 dark:bg-dark-surface/30 rounded" />
        </div>
    );
};

export default MessageSkeleton;
