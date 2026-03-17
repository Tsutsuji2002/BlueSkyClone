import React from 'react';
import Skeleton from '../common/Skeleton';

const PostSkeleton: React.FC = () => {
    return (
        <div className="p-4 border-b border-gray-100 dark:border-dark-border w-full">
            <div className="flex space-x-3">
                {/* Avatar */}
                <Skeleton variant="circular" width={48} height={48} className="flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                        {/* Display Name */}
                        <Skeleton variant="text" width="40%" height={16} />
                        {/* Handle */}
                        <Skeleton variant="text" width="20%" height={14} />
                    </div>
                    
                    {/* Content Lines */}
                    <div className="space-y-2 mb-4">
                        <Skeleton variant="text" width="100%" height={14} />
                        <Skeleton variant="text" width="90%" height={14} />
                        <Skeleton variant="text" width="60%" height={14} />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between max-w-sm mt-4">
                        <Skeleton variant="circular" width={20} height={20} />
                        <Skeleton variant="circular" width={20} height={20} />
                        <Skeleton variant="circular" width={20} height={20} />
                        <Skeleton variant="circular" width={20} height={20} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PostFeedSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
    return (
        <div className="w-full">
            {Array.from({ length: count }).map((_, i) => (
                <PostSkeleton key={i} />
            ))}
        </div>
    );
};

export default PostSkeleton;
