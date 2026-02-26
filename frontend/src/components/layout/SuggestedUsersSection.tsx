import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiX, FiUserPlus } from 'react-icons/fi';
import Button from '../common/Button';
import { setActiveTab } from '../../redux/slices/feedsSlice';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';

const SuggestedUsersSection: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { user } = useAppSelector((state: RootState) => state.auth);
    const { feeds, pinnedFeedIds } = useAppSelector((state: RootState) => state.feeds);
    const [isHidden, setIsHidden] = React.useState(false);

    if (isHidden || (user && user.followingCount > 10)) {
        return null;
    }

    const handleFeedClick = (feedId: string) => {
        dispatch(setActiveTab(feedId));
        navigate('/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const sidebarTabs = pinnedFeedIds.slice(0, 5).map(id => {
        const feed = feeds.find(f => f.id === id);
        return feed ? { id: feed.id, label: feed.name } : null;
    }).filter(Boolean) as { id: string; label: string }[];

    return (
        <div className="bg-gray-50 dark:bg-dark-surface rounded-2xl overflow-hidden">
            <div className="p-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text uppercase text-[13px] tracking-wider">
                    {t('sidebar.start_header', { defaultValue: 'BẮT ĐẦU' })}
                </h2>
                <button
                    onClick={() => setIsHidden(true)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <FiX size={18} />
                </button>
            </div>

            <div className="px-4 pb-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full border-2 border-primary-500 border-t-transparent animate-spin flex-shrink-0" />
                    <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-900 dark:text-dark-text truncate">
                            {t('sidebar.follow_ten', { defaultValue: 'Theo dõi 10 tài khoản' })}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary truncate">
                            {t('sidebar.bluesky_better', { defaultValue: 'Bluesky cùng bạn bè sẽ vui hơn!' })}
                        </p>
                    </div>
                </div>

                <Button
                    variant="primary"
                    fullWidth
                    onClick={() => navigate('/explore')}
                    className="rounded-full font-bold flex items-center justify-center gap-2 py-2.5"
                >
                    <FiUserPlus size={18} />
                    {t('sidebar.find_people', { defaultValue: 'Tìm người để theo dõi' })}
                </Button>
            </div>

            <div className="flex flex-col border-t border-gray-100 dark:border-dark-border">
                {sidebarTabs.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleFeedClick(item.id)}
                        className="px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors text-[15px] font-medium text-gray-700 dark:text-dark-text"
                    >
                        {item.label}
                    </button>
                ))}
                <button
                    onClick={() => navigate('/feeds')}
                    className="px-4 py-3 text-left text-primary-500 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors text-[15px] font-bold"
                >
                    Other feeds
                </button>
            </div>
        </div>
    );
};

export default SuggestedUsersSection;
