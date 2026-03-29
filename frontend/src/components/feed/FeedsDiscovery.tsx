import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiSettings, FiSearch } from 'react-icons/fi';
import ButterflyLogo from '../common/ButterflyLogo';

interface ShowcaseFeed {
    id: string;
    name: string;
    handle: string;
    description: string;
    likedBy: string;
    icon?: string;
    color: string;
}

const FeedsDiscovery: React.FC = () => {
    const { t } = useTranslation();

    const showcaseFeeds: ShowcaseFeed[] = [
        {
            id: 'discover',
            name: 'Discover',
            handle: '@bsky.app',
            description: 'Trending content from your personal network',
            likedBy: '38,832',
            color: 'bg-blue-500'
        },
        {
            id: 'science',
            name: 'Science',
            handle: '@bossett.social',
            description: 'The Science Feed. A curated feed from Bluesky professional scientists, science communicators, and science/nature photographer/artists.',
            likedBy: '29,239',
            color: 'bg-green-500'
        },
        {
            id: 'artists',
            name: 'Artists: Trending',
            handle: '@bsky.art',
            description: 'General art feed — image posts from artists across Bluesky, sorted by trending.',
            likedBy: '32,659',
            color: 'bg-pink-500'
        },
        {
            id: 'news',
            name: 'News',
            handle: '@aendra.com',
            description: 'Headlines from verified news organisations in reverse-chronological order. Maintained by @aendra.com.',
            likedBy: '23,928',
            color: 'bg-gray-500'
        },
        {
            id: 'blacksky',
            name: 'Blacksky',
            handle: '@rude1.blacksky.team',
            description: 'An algorithm showcasing posts by Black users on the network. Use #AddToBlackSky at least once to add yourself.',
            likedBy: '28,079',
            color: 'bg-purple-500'
        }
    ];

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-dark-bg">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md border-b border-gray-100 dark:border-dark-border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <FiArrowLeft className="text-gray-900 dark:text-dark-text cursor-pointer" size={20} />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {t('feeds.title', { defaultValue: 'Feeds' })}
                    </h2>
                </div>
                <FiSettings className="text-gray-900 dark:text-dark-text cursor-pointer" size={20} />
            </div>

            <div className="p-4 space-y-6">
                {/* Discover Header Section */}
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-blue-500">
                            <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-[20px] font-bold text-gray-900 dark:text-dark-text">
                            {t('feeds.discover_new_feeds', { defaultValue: 'Discover New Feeds' })}
                        </h3>
                        <p className="text-[15px] text-gray-500 dark:text-dark-text-secondary mt-1 max-w-md">
                            Choose your own timeline! Feeds built by the community help you find content you love.
                        </p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <FiSearch className="text-gray-400" size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder={t('feeds.search_feeds', { defaultValue: 'Search feeds' })}
                        className="w-full bg-gray-100 dark:bg-dark-surface border-none rounded-xl py-3 pl-12 pr-4 text-[15px] focus:ring-0 focus:outline-none placeholder-gray-500"
                    />
                </div>

                {/* Feeds List */}
                <div className="space-y-4 divide-y divide-gray-100 dark:divide-dark-border">
                    {showcaseFeeds.map((feed) => (
                        <div key={feed.id} className="pt-4 first:pt-0 group cursor-pointer">
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 ${feed.color} rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-lg`}>
                                    {feed.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 dark:text-dark-text group-hover:underline">
                                        {feed.name}
                                    </h4>
                                    <div className="flex items-center gap-1 text-[13px] text-gray-500 dark:text-dark-text-secondary">
                                        <span>Feed by {feed.handle}</span>
                                    </div>
                                    <p className="text-[14px] text-gray-700 dark:text-dark-text-secondary mt-2 line-clamp-3">
                                        {feed.description}
                                    </p>
                                    <div className="mt-2 text-[13px] font-medium text-gray-500 dark:text-dark-text-secondary">
                                        {t('feeds.liked_by_users', { count: parseInt(feed.likedBy.replace(/,/g, ''), 10) }) || `Liked by ${feed.likedBy} users`}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FeedsDiscovery;
