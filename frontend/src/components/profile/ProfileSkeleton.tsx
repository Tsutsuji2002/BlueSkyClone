import React from 'react';
import Skeleton from '../common/Skeleton';

const ProfileSkeleton: React.FC = () => {
    return (
        <div className="flex flex-col bg-white dark:bg-dark-bg w-full">
            {/* Cover Image Skeleton */}
            <div className="h-40 lg:h-48 w-full bg-gray-200 dark:bg-dark-surface animate-pulse" />

            {/* Profile Info & Actions Skeleton */}
            <div className="flex flex-col px-4 lg:px-6 pt-2 pb-1 relative">
                {/* Avatar Overlap Skeleton */}
                <div className="absolute -top-12 lg:-top-16 left-4 lg:left-6 z-20">
                    <Skeleton variant="circular" width={96} height={96} className="border-4 border-white dark:border-dark-bg lg:w-32 lg:h-32" />
                </div>

                {/* Actions Row */}
                <div className="flex justify-end gap-2 mb-1 items-center h-10">
                    <Skeleton variant="rounded" width={100} height={36} className="rounded-full" />
                    <Skeleton variant="circular" width={36} height={36} />
                </div>

                {/* Identity Section */}
                <div className="mt-6 lg:mt-10 mb-1">
                    <Skeleton variant="text" width="60%" height={32} className="mb-2" />
                    <Skeleton variant="text" width="30%" height={20} />
                </div>

                {/* Stats Section */}
                <div className="flex items-center gap-4 mb-3 mt-1.5">
                    <Skeleton variant="text" width={80} height={16} />
                    <Skeleton variant="text" width={80} height={16} />
                    <Skeleton variant="text" width={80} height={16} />
                </div>

                {/* Bio Section */}
                <div className="space-y-2 mb-4">
                    <Skeleton variant="text" width="100%" height={16} />
                    <Skeleton variant="text" width="80%" height={16} />
                </div>
            </div>

            {/* Tabs Skeleton */}
            <div className="border-b border-gray-100 dark:border-dark-border w-full flex px-4">
                <Skeleton variant="rectangular" width={60} height={40} className="mr-4" />
                <Skeleton variant="rectangular" width={60} height={40} className="mr-4" />
                <Skeleton variant="rectangular" width={60} height={40} className="mr-4" />
                <Skeleton variant="rectangular" width={60} height={40} />
            </div>
        </div>
    );
};

export default ProfileSkeleton;
