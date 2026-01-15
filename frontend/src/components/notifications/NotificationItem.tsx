import React from 'react';
import { Notification } from '../../types';
import Avatar from '../common/Avatar';
import { formatPostDate } from '../../utils/formatDate';
import { FiHeart, FiUserPlus, FiRepeat, FiMessageCircle, FiAtSign } from 'react-icons/fi';
import { cn } from '../../utils/classNames';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface NotificationItemProps {
    notification: Notification;
    onClick?: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClick }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleProfileClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/profile/${notification.sender.username}`);
    };

    const handleNotificationClick = (e: React.MouseEvent) => {
        if (onClick) onClick();

        if (notification.type === 'follow') {
            navigate(`/profile/${notification.sender.username}`);
        } else if (notification.postId) {
            // Navigate to the post detail page
            navigate(`/profile/${notification.sender.username}/post/${notification.postId}`);
        }
    };

    const getIcon = () => {
        switch (notification.type) {
            case 'like':
                return <FiHeart className="text-red-500 fill-red-500" size={18} />;
            case 'follow':
                return <FiUserPlus className="text-primary-500" size={18} />;
            case 'repost':
                return <FiRepeat className="text-green-500" size={18} />;
            case 'reply':
                return <FiMessageCircle className="text-blue-500" size={18} />;
            case 'mention':
                return <FiAtSign className="text-purple-500" size={18} />;
            default:
                return null;
        }
    };

    const getMessage = () => {
        switch (notification.type) {
            case 'like':
                return t('notifications.liked_post');
            case 'follow':
                return t('notifications.followed_you');
            case 'repost':
                return t('notifications.reposted_post');
            case 'reply':
                return t('notifications.replied_post');
            case 'mention':
                return t('notifications.mentioned_you');
            default:
                return '';
        }
    };

    return (
        <div
            className={cn(
                "flex gap-3 p-4 border-b border-gray-100 dark:border-dark-border cursor-pointer transition-colors",
                notification.isRead ? "bg-white dark:bg-dark-bg" : "bg-primary-50/30 dark:bg-primary-900/10"
            )}
            onClick={handleNotificationClick}
        >
            <div className="flex-shrink-0 pt-1">
                {getIcon()}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                    <div
                        onClick={handleProfileClick}
                        className="hover:opacity-90 transition-opacity"
                    >
                        <Avatar
                            src={notification.sender.avatarUrl || (notification.sender as any).avatar}
                            alt={notification.sender.displayName}
                            size="sm"
                        />
                    </div>
                    <div className="flex-1">
                        <div className="text-sm">
                            <span
                                className="font-bold text-gray-900 dark:text-dark-text hover:underline cursor-pointer"
                                onClick={handleProfileClick}
                            >
                                {notification.sender.displayName}
                            </span>
                            <span
                                className="text-gray-500 dark:text-dark-text-secondary ml-1 cursor-pointer hover:underline"
                                onClick={handleProfileClick}
                            >
                                @{notification.sender.username}
                            </span>
                            <span className="text-gray-900 dark:text-dark-text ml-1">
                                {getMessage()}
                            </span>
                        </div>

                        <p className="text-xs text-gray-400 dark:text-dark-text-secondary mt-1">
                            {formatPostDate(notification.createdAt)}
                        </p>
                    </div>
                </div>
            </div>

            {!notification.isRead && (
                <div className="flex-shrink-0 pt-2">
                    <div className="w-2.5 h-2.5 bg-primary-500 rounded-full" />
                </div>
            )}
        </div>
    );
};

export default NotificationItem;
