import React from 'react';
import Skeleton from './Skeleton';

interface UserSkeletonProps {
    count?: number;
}

const UserSkeleton: React.FC<UserSkeletonProps> = ({ count = 5 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="px-4 py-4 border-b border-gray-100 dark:border-dark-border"
                >
                    <div className="flex items-start gap-3">
                        {/* Avatar Skeleton */}
                        <Skeleton variant="circular" width={48} height={48} className="shrink-0" />
                        
                        <div className="flex-1 min-w-0">
                            {/* Name and Handle Skeleton */}
                            <div className="space-y-2">
                                <Skeleton variant="text" width="40%" height={20} />
                                <Skeleton variant="text" width="25%" height={14} />
                            </div>
                            
                            {/* Bio Skeleton */}
                            <div className="mt-3 space-y-1.5">
                                <Skeleton variant="text" width="90%" height={14} />
                                <Skeleton variant="text" width="70%" height={14} />
                            </div>
                        </div>
                        
                        {/* Follow Button Skeleton */}
                        <Skeleton variant="rounded" width={80} height={32} className="rounded-full shrink-0" />
                    </div>
                </div>
            ))}
        </>
    );
};

export default UserSkeleton;
