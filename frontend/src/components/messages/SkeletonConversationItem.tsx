import React from 'react';
import { cn } from '../../utils/classNames';

const SkeletonConversationItem: React.FC = () => {
    return (
        <div className="relative bg-white dark:bg-black mx-2 my-0.5 rounded-lg border border-transparent">
            <div className="flex flex-row items-center gap-3 p-3 animate-pulse">
                {/* Avatar Placeholder */}
                <div className="flex-shrink-0 w-10 h-10 bg-gray-200 dark:bg-dark-surface rounded-full" />
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                        {/* Name Placeholder */}
                        <div className="h-4 w-1/3 bg-gray-200 dark:bg-dark-surface rounded" />
                        {/* Date Placeholder */}
                        <div className="h-3 w-12 bg-gray-100 dark:bg-dark-surface/50 rounded" />
                    </div>
                    {/* Handle Placeholder */}
                    <div className="h-3 w-1/4 bg-gray-100 dark:bg-dark-surface/50 rounded mb-2" />
                    {/* Message Placeholder */}
                    <div className="h-3 w-2/3 bg-gray-100 dark:bg-dark-surface/50 rounded" />
                </div>
            </div>
        </div>
    );
};

export default SkeletonConversationItem;
