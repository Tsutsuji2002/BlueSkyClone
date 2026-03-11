import React, { useState } from 'react';
import { Notification } from '../../types';
import Avatar from '../common/Avatar';
import { formatPostDate } from '../../utils/formatDate';
import { FiHeart, FiUserPlus, FiRepeat, FiMessageCircle, FiAtSign, FiBell, FiList, FiCheck, FiX } from 'react-icons/fi';
import { BsPatchCheckFill } from 'react-icons/bs';
import { cn } from '../../utils/classNames';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
// import listsService from '../../services/listsService'; // Removed legacy service

interface NotificationItemProps {
    notification: Notification;
    onClick?: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClick }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [responded, setResponded] = useState<'accepted' | 'rejected' | null>(null);
    const [loading, setLoading] = useState(false);

    // invitationStatus removed from Notification type

    const handleProfileClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (notification.sender.handle) {
            navigate(`/profile/${notification.sender.handle}`);
        }
    };

    const handleNotificationClick = (e: React.MouseEvent) => {
        if (onClick) onClick();

        if (notification.type === 'follow') {
            navigate(`/profile/${notification.sender.handle}`);
        } else if (notification.postId && notification.sender.handle) {
            // Navigate to the post detail page
            navigate(`/profile/${notification.sender.handle}/post/${notification.uri}`);
        }
    };

    const handleAccept = async (e: React.MouseEvent) => {
        // AT Protocol doesn't have a direct "accept invitation" in the same way.
        // Usually, you just follow the list or it's a different mechanism.
        // For now, let's just mark as responded.
        e.stopPropagation();
        setResponded('accepted');
    };

    const handleReject = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setResponded('rejected');
    };

    const getIcon = () => {
        switch (notification.reason) {
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
            case 'quote':
                return <FiRepeat className="text-indigo-500" size={18} />;
            case 'system':
                return <FiBell className="text-primary-500" size={18} />;
            default:
                return null;
        }
    };

    const getMessage = () => {
        switch (notification.reason) {
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
            case 'quote':
                return t('notifications.quoted_post');
            case 'system':
                return notification.title || t('notifications.system_announcement', 'System Announcement');
            default:
                return '';
        }
    };

    return (
        <div
            className={cn(
                "flex gap-3 p-4 border-b border-gray-100 dark:border-dark-border cursor-pointer transition-colors",
                notification.isRead || responded ? "bg-white dark:bg-dark-bg" : "bg-primary-50/30 dark:bg-primary-900/10"
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
                                className="font-bold text-gray-900 dark:text-dark-text hover:underline cursor-pointer flex items-center gap-0.5"
                                onClick={handleProfileClick}
                            >
                                {notification.sender.displayName}
                                {(notification.sender as any).isVerified && (
                                    <BsPatchCheckFill className="text-blue-500 flex-shrink-0" size={13} />
                                )}
                            </span>
                            <span
                                className="text-gray-500 dark:text-dark-text-secondary ml-1 cursor-pointer hover:underline"
                                onClick={handleProfileClick}
                            >
                                @{notification.sender.handle}
                            </span>
                            <span className="text-gray-900 dark:text-dark-text ml-1">
                                {getMessage()}
                            </span>
                        </div>

                        {notification.content && (
                            <div className="mt-1 text-sm text-gray-700 dark:text-dark-text-secondary whitespace-pre-wrap">
                                {notification.content}
                            </div>
                        )}

                        {/* list_invitation removed */}

                        {responded && (
                            <div className="mt-2 text-sm font-medium italic text-gray-500 dark:text-dark-text-secondary">
                                {responded === 'accepted' ? t('lists.invitation_accepted', 'Invitation accepted') : t('lists.invitation_rejected', 'Invitation declined')}
                            </div>
                        )}

                        <p className="text-xs text-gray-400 dark:text-dark-text-secondary mt-1">
                            {formatPostDate(notification.createdAt)}
                        </p>
                    </div>
                </div>
            </div>

            {!notification.isRead && !responded && (
                <div className="flex-shrink-0 pt-2">
                    <div className="w-2.5 h-2.5 bg-primary-500 rounded-full" />
                </div>
            )}
        </div>
    );
};

export default NotificationItem;
