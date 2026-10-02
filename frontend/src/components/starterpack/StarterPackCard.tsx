import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StarterPackView } from '../../redux/api/starterPackApi';

interface StarterPackCardProps {
    starterPack: StarterPackView;
    onSelect?: (pack: StarterPackView) => void;
}

export const StarterPackCard: React.FC<StarterPackCardProps> = ({ starterPack, onSelect }) => {
    const navigate = useNavigate();
    const { record, creator, listItemsSample, list, joinedAllTimeCount } = starterPack;

    const memberCount = list?.listItemCount ?? listItemsSample?.length ?? 0;
    const avatars = (listItemsSample || [])
        .map(item => item.subject?.avatar)
        .filter((url): url is string => Boolean(url))
        .slice(0, 5);

    const handleClick = () => {
        if (onSelect) {
            onSelect(starterPack);
        } else {
            // Encode AT-URI safely
            navigate(`/starter-pack?uri=${encodeURIComponent(starterPack.uri)}`);
        }
    };

    return (
        <div
            onClick={handleClick}
            className="group relative flex flex-col justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
        >
            {/* Top Bar: Icon & Creator */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                            {record?.name || 'Starter Pack'}
                        </h3>
                        {creator && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                By {creator.displayName || `@${creator.handle}`}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Description */}
            {record?.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-4 leading-relaxed">
                    {record.description}
                </p>
            )}

            {/* Footer: Member Avatars Stack & Count */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                {/* Overlapping Avatars */}
                <div className="flex items-center -space-x-2 overflow-hidden py-1">
                    {avatars.length > 0 ? (
                        avatars.map((avatarUrl, idx) => (
                            <img
                                key={idx}
                                src={avatarUrl}
                                alt="Member Avatar"
                                className="inline-block h-7 w-7 rounded-full ring-2 ring-white dark:ring-gray-900 object-cover"
                            />
                        ))
                    ) : (
                        <span className="text-xs text-gray-400 italic">No member preview</span>
                    )}
                </div>

                {/* Member Count Badge */}
                <div className="flex items-center gap-1 font-medium bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full text-gray-700 dark:text-gray-300">
                    <span>{memberCount} {memberCount === 1 ? 'person' : 'people'}</span>
                    {joinedAllTimeCount ? (
                        <span className="text-gray-400 dark:text-gray-500">· {joinedAllTimeCount} joined</span>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default StarterPackCard;
