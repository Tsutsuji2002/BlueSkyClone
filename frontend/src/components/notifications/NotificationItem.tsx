import React, { useState } from 'react';
import { Notification } from '../../types';
import Avatar from '../common/Avatar';
import { formatPostDate } from '../../utils/formatDate';
import { FiHeart, FiUserPlus, FiRepeat, FiMessageCircle, FiAtSign, FiBell, FiList, FiCheck, FiX } from 'react-icons/fi';
import { cn } from '../../utils/classNames';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import listsService from '../../services/listsService';

interface NotificationItemProps {
    notification: Notification;
    onClick?: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClick }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [responded, setResponded] = useState<'accepted' | 'rejected' | null>(
        notification.invitationStatus === 1 ? 'accepted' :
            notification.invitationStatus === 2 ? 'rejected' : null
    );
    const [loading, setLoading] = useState(false);

    // Sync state with props if they update (e.g. after a refresh or parent re-render)
    React.useEffect(() => {
        if (notification.invitationStatus === 1) {
            setResponded('accepted');
        } else if (notification.invitationStatus === 2) {
            setResponded('rejected');
        } else {
            setResponded(null);
        }
    }, [notification.invitationStatus]);

    const handleProfileClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/profile/${notification.sender.username}`);
    };

    const handleNotificationClick = (e: React.MouseEvent) => {
        if (notification.type === 'list_invitation') return; // Don't navigate on list invitation click (buttons only)

        if (onClick) onClick();

        if (notification.type === 'follow') {
            navigate(`/profile/${notification.sender.username}`);
        } else if (notification.postId) {
            // Navigate to the post detail page
            navigate(`/profile/${notification.sender.username}/post/${notification.postId}`);
        }
    };

    const handleAccept = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!notification.listId || loading) return;
        setLoading(true);
        try {
            await listsService.acceptInvitation(notification.listId);
            setResponded('accepted');
        } catch (error) {
            console.error('Failed to accept invitation', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!notification.listId || loading) return;
        setLoading(true);
        try {
            await listsService.rejectInvitation(notification.listId);
            setResponded('rejected');
        } catch (error) {
            console.error('Failed to reject invitation', error);
        } finally {
            setLoading(false);
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
            case 'quote':
                return <FiRepeat className="text-indigo-500" size={18} />;
            case 'list_invitation':
                return <FiList className="text-primary-500" size={18} />;
            case 'system':
            case 'System':
                return <FiBell className="text-primary-500" size={18} />;
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
            case 'quote':
                return t('notifications.quoted_post');
            case 'list_invitation':
                return t('notifications.list_invitation', 'invited you to a list');
            case 'system':
            case 'System':
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

                        {notification.content && (
                            <div className="mt-1 text-sm text-gray-700 dark:text-dark-text-secondary whitespace-pre-wrap">
                                {notification.content}
                            </div>
                        )}

                        {notification.type === 'list_invitation' && !responded && (
                            <div className="mt-3 flex items-center gap-2">
                                <button
                                    onClick={handleAccept}
                                    disabled={loading}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-full text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
                                >
                                    <FiCheck size={16} />
                                    {t('common.accept', 'Accept')}
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={loading}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-dark-hover dark:hover:bg-dark-elem text-gray-900 dark:text-white rounded-full text-sm font-bold transition-colors disabled:opacity-50"
                                >
                                    <FiX size={16} />
                                    {t('common.decline', 'Decline')}
                                </button>
                            </div>
                        )}

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
