import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useGetStarterPackQuery, useFollowAllMembersMutation } from '../redux/api/starterPackApi';
import { useAppDispatch } from '../redux/hooks';
import { showToast } from '../redux/slices/toastSlice';

export const StarterPackDetailPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const starterPackUri = searchParams.get('uri');

    const { data, isLoading, error } = useGetStarterPackQuery(
        { starterPack: starterPackUri || '' },
        { skip: !starterPackUri }
    );

    const [followAllMembers, { isLoading: isFollowingAll }] = useFollowAllMembersMutation();
    const [followedDids, setFollowedDids] = useState<Set<string>>(new Set());

    if (!starterPackUri) {
        return (
            <div className="p-8 text-center text-gray-500">No starter pack URI provided.</div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-2 text-sm text-gray-500">Loading starter pack...</p>
            </div>
        );
    }

    if (error || !data?.starterPack) {
        return (
            <div className="p-8 text-center text-red-500">
                Failed to load starter pack. Please try again.
            </div>
        );
    }

    const starterPack = data.starterPack;
    const { record, creator, listItemsSample, feeds, list } = starterPack;
    const members = listItemsSample || [];
    const targetDids = members.map(m => m.subject.did).filter(Boolean);

    const handleFollowAll = async () => {
        if (!targetDids.length) return;
        try {
            const res = await followAllMembers({ targetDids }).unwrap();
            setFollowedDids(new Set(targetDids));
            dispatch(showToast({ message: `Successfully followed ${res.successCount} people!`, type: 'success' }));
        } catch {
            dispatch(showToast({ message: 'Failed to follow members', type: 'error' }));
        }
    };

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            dispatch(showToast({ message: 'Starter pack link copied to clipboard', type: 'success' }));
        } catch {
            dispatch(showToast({ message: 'Failed to copy link', type: 'error' }));
        }
    };

    return (
        <div className="max-w-2xl mx-auto border-x border-gray-200 dark:border-gray-800 min-h-screen pb-12">
                {/* Header */}
                <div className="sticky top-0 z-20 flex items-center gap-4 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                            {record?.name || 'Starter Pack'}
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {members.length} {members.length === 1 ? 'member' : 'members'}
                        </p>
                    </div>
                </div>

                {/* Banner Card */}
                <div className="p-6 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleShare}
                                className="p-2.5 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors"
                                title="Share starter pack"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                            </button>
                            <button
                                onClick={handleFollowAll}
                                disabled={isFollowingAll || targetDids.length === 0}
                                className="px-5 py-2.5 rounded-full font-bold text-sm bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                            >
                                {isFollowingAll ? 'Following...' : 'Follow All'}
                            </button>
                        </div>
                    </div>

                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                        {record?.name || 'Starter Pack'}
                    </h2>

                    {creator && (
                        <div
                            onClick={() => navigate(`/profile/${creator.handle}`)}
                            className="inline-flex items-center gap-2 mb-3 cursor-pointer group"
                        >
                            {creator.avatar && (
                                <img
                                    src={creator.avatar}
                                    alt={creator.handle}
                                    className="w-6 h-6 rounded-full object-cover"
                                />
                            )}
                            <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:underline">
                                Created by <strong className="text-gray-900 dark:text-white">{creator.displayName || `@${creator.handle}`}</strong>
                            </span>
                        </div>
                    )}

                    {record?.description && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {record.description}
                        </p>
                    )}
                </div>

                {/* Included Feeds Section */}
                {feeds && feeds.length > 0 && (
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                            Included Custom Feeds ({feeds.length})
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {feeds.map((feed, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40"
                                >
                                    {feed.avatar ? (
                                        <img src={feed.avatar} alt={feed.displayName} className="w-9 h-9 rounded-lg object-cover" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold">
                                            #
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                            {feed.displayName}
                                        </h4>
                                        {feed.likeCount !== undefined && (
                                            <p className="text-xs text-gray-500">❤️ {feed.likeCount} likes</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Member List */}
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            People in this Pack ({members.length})
                        </h3>
                    </div>

                    {members.map((item, idx) => {
                        const subject = item.subject;
                        const isFollowing = followedDids.has(subject.did) || Boolean(subject.viewer?.following);

                        return (
                            <div
                                key={idx}
                                className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                            >
                                <div
                                    onClick={() => navigate(`/profile/${subject.handle}`)}
                                    className="flex items-center gap-3 min-w-0 cursor-pointer group flex-1"
                                >
                                    {subject.avatar ? (
                                        <img
                                            src={subject.avatar}
                                            alt={subject.handle}
                                            className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-11 h-11 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-600 dark:text-gray-300 flex-shrink-0">
                                            {(subject.displayName || subject.handle)[0].toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:underline truncate">
                                            {subject.displayName || subject.handle}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            @{subject.handle}
                                        </p>
                                        {subject.description && (
                                            <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1 mt-1">
                                                {subject.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setFollowedDids(prev => {
                                            const next = new Set(prev);
                                            if (next.has(subject.did)) next.delete(subject.did);
                                            else next.add(subject.did);
                                            return next;
                                        });
                                    }}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                                        isFollowing
                                            ? 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-red-500/10 hover:text-red-500'
                                            : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
                                    }`}
                                >
                                    {isFollowing ? 'Following' : 'Follow'}
                                </button>
                            </div>
                        );
                    })}
                </div>
        </div>
    );
};

export default StarterPackDetailPage;
