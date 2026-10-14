import React, { useState, useEffect } from 'react';
import { Notification } from '../../types';
import Avatar from '../common/Avatar';
import UserHoverCard from '../common/UserHoverCard';
import { formatPostDate } from '../../utils/formatDate';
import { FiCheck, FiX, FiPlus, FiAtSign, FiBell, FiList } from 'react-icons/fi';
import { BsPatchCheckFill } from 'react-icons/bs';
import { cn } from '../../utils/classNames';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import listsService from '../../services/listsService';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { RootState } from '../../redux/store';
import { followUserAsync, unfollowUserAsync } from '../../redux/slices/userSlice';
import { openAuthWall } from '../../redux/slices/modalsSlice';

interface NotificationItemProps {
    notification: Notification;
    onClick?: () => void;
}

// In-memory cache for remote post preview (text and thumbnail)
const postPreviewCache = new Map<string, { text?: string; image?: string }>();

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClick }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const currentUser = useAppSelector((state: RootState) => state.auth.user);

    const [responded, setResponded] = useState<'accepted' | 'rejected' | null>(
        notification.invitationStatus === 1 ? 'accepted' : 
        notification.invitationStatus === 2 ? 'rejected' : null
    );
    const [loading, setLoading] = useState(false);

    // Follow back state
    const [isFollowing, setIsFollowing] = useState<boolean>(!!notification.sender.isFollowing);
    const [followingRef, setFollowingRef] = useState<string | undefined>(notification.sender.followingReference);
    const [followLoading, setFollowLoading] = useState(false);

    useEffect(() => {
        setIsFollowing(!!notification.sender.isFollowing);
        setFollowingRef(notification.sender.followingReference);
    }, [notification.sender.isFollowing, notification.sender.followingReference]);

    useEffect(() => {
        if (notification.invitationStatus === 1) setResponded('accepted');
        else if (notification.invitationStatus === 2) setResponded('rejected');
    }, [notification.invitationStatus]);

    // Dynamic post preview resolution for like/repost/quote
    const initialText = notification.postText || notification.content || (notification.record as any)?.text;
    const initialImage = notification.postImage;
    const [previewText, setPreviewText] = useState<string | undefined>(initialText);
    const [previewImage, setPreviewImage] = useState<string | undefined>(initialImage);

    const targetSubjectUri = notification.reasonSubject || notification.subjectUri;

    useEffect(() => {
        if (initialText || initialImage) {
            setPreviewText(initialText);
            setPreviewImage(initialImage);
            return;
        }

        if (!targetSubjectUri) return;

        const cached = postPreviewCache.get(targetSubjectUri);
        if (cached) {
            setPreviewText(cached.text);
            setPreviewImage(cached.image);
            return;
        }

        // Fetch post preview from XRPC
        let isMounted = true;
        fetch(`/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(targetSubjectUri)}&depth=0`, {
            credentials: 'include'
        })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (!isMounted || !data) return;
                const post = data.thread?.post;
                if (post) {
                    const text = post.record?.text;
                    const image = post.embed?.images?.[0]?.thumb ||
                                  post.embed?.media?.images?.[0]?.thumb ||
                                  post.embed?.thumbnail ||
                                  (post.images && post.images[0]?.url);
                    postPreviewCache.set(targetSubjectUri, { text, image });
                    setPreviewText(text);
                    setPreviewImage(image);
                }
            })
            .catch(() => {});

        return () => {
            isMounted = false;
        };
    }, [targetSubjectUri, initialText, initialImage]);

    const handleProfileClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (notification.sender.handle) {
            navigate(`/profile/${notification.sender.handle}`);
        }
    };

    const handleFollowToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!currentUser) {
            dispatch(openAuthWall());
            return;
        }

        const actor = notification.sender.did || notification.sender.handle || notification.sender.id;
        if (!actor) return;

        setFollowLoading(true);
        try {
            if (isFollowing) {
                await dispatch(unfollowUserAsync({
                    userId: actor,
                    followUri: followingRef || ''
                })).unwrap();
                setIsFollowing(false);
                setFollowingRef(undefined);
            } else {
                const res: any = await dispatch(followUserAsync(actor)).unwrap();
                setIsFollowing(true);
                if (res?.uri) {
                    setFollowingRef(res.uri);
                }
            }
        } catch (err) {
            console.error('Failed to toggle follow', err);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleNotificationClick = (e: React.MouseEvent) => {
        // Don't navigate if clicking a button
        if ((e.target as HTMLElement).closest('button')) {
            return;
        }

        // Don't navigate if it's a list invitation that needs a response
        if (notification.type === 'list_invitation' && !responded) {
            return;
        }

        if (onClick) onClick();
        
        const reason = notification.reason;
        
        if (reason === 'follow') {
            navigate(`/profile/${notification.sender.handle}`);
        } else if (reason === 'list_invitation' && notification.listId) {
            navigate(`/lists/${notification.listId}`);
        } else if (['like', 'repost', 'reply', 'mention', 'quote'].includes(reason)) {
            const targetHandle = notification.postAuthorHandle || currentUser?.handle || notification.sender.handle;
            const targetPostId = notification.tid || 
                                 notification.postId || 
                                 notification.subjectUri?.split('/').pop() || 
                                 notification.uri.split('/').pop();

            if (targetPostId) {
                navigate(`/profile/${targetHandle}/post/${targetPostId}`);
            }
        }
    };

    const handleAccept = async (e: React.MouseEvent) => {
        if (!notification.listId || loading) return;
        e.stopPropagation();
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
        if (!notification.listId || loading) return;
        e.stopPropagation();
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
        switch (notification.reason) {
            case 'follow':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#006AFF" className="flex-shrink-0">
                        <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                );
            case 'like':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#FF2B75" className="flex-shrink-0">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                );
            case 'repost':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                        <path d="m17 2 4 4-4 4" />
                        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                        <path d="m7 22-4-4 4-4" />
                        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                    </svg>
                );
            case 'reply':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#006AFF" className="flex-shrink-0">
                        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                    </svg>
                );
            case 'mention':
                return <FiAtSign className="text-[#8B5CF6] flex-shrink-0" size={24} />;
            case 'quote':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                    </svg>
                );
            case 'system':
                return <FiBell className="text-[#006AFF] flex-shrink-0" size={24} />;
            case 'list_invitation':
                return <FiList className="text-[#006AFF] flex-shrink-0" size={24} />;
            default:
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#006AFF" className="flex-shrink-0">
                        <circle cx="12" cy="12" r="10" />
                    </svg>
                );
        }
    };

    const getActionMessage = () => {
        switch (notification.reason) {
            case 'like':
                return t('notifications.liked_post', 'liked your post');
            case 'follow':
                return isFollowing
                    ? t('notifications.followed_you_back', 'followed you back')
                    : t('notifications.followed_you', 'followed you');
            case 'repost':
                return t('notifications.reposted_post', 'reposted your post');
            case 'reply':
                return t('notifications.replied_post', 'replied to your post');
            case 'mention':
                return t('notifications.mentioned_you', 'mentioned you');
            case 'quote':
                return t('notifications.quoted_post', 'quoted your post');
            case 'system':
                return notification.title || t('notifications.system_announcement', 'System Announcement');
            case 'list_invitation':
                return notification.content || t('lists.invited_to_join', 'invited you to join a list');
            default:
                return '';
        }
    };

    const isOwnProfile = currentUser?.id === notification.sender.id || 
                         (currentUser?.did && notification.sender.did && currentUser.did === notification.sender.did);

    return (
        <div
            className={cn(
                "flex gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-dark-border cursor-pointer transition-colors",
                notification.isRead || responded ? "bg-white dark:bg-dark-bg hover:bg-gray-50/60 dark:hover:bg-dark-surface/50" : "bg-blue-50/20 dark:bg-blue-900/10 hover:bg-blue-50/40 dark:hover:bg-blue-900/20"
            )}
            onClick={handleNotificationClick}
        >
            {/* Left Column: Notification Type Icon */}
            <div className="w-8 sm:w-9 flex justify-end flex-shrink-0 pt-0.5">
                {getIcon()}
            </div>

            {/* Main Column */}
            <div className="flex-1 min-w-0">
                {/* Row 1: Sender Avatar with Hover Card */}
                <div className="flex items-center gap-2">
                    <UserHoverCard user={notification.sender}>
                        <div
                            onClick={handleProfileClick}
                            className="cursor-pointer hover:opacity-90 transition-opacity"
                        >
                            <Avatar
                                src={notification.sender.avatarUrl || (notification.sender as any).avatar}
                                alt={notification.sender.displayName}
                                size="sm"
                            />
                        </div>
                    </UserHoverCard>
                </div>

                {/* Row 2: Sender Display Name + Reason Text + Time */}
                <div className="flex flex-wrap items-baseline gap-x-1.5 mt-1.5 text-[15px] leading-snug">
                    <UserHoverCard user={notification.sender}>
                        <span
                            onClick={handleProfileClick}
                            className="font-bold text-gray-900 dark:text-dark-text hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                            {notification.sender.displayName || notification.sender.handle}
                            {(notification.sender as any).isVerified && (
                                <BsPatchCheckFill className="text-blue-500 flex-shrink-0" size={13} />
                            )}
                        </span>
                    </UserHoverCard>
                    <span className="text-[#405168] dark:text-[#8798B0]">
                        {getActionMessage()}
                    </span>
                    <span className="text-gray-400 dark:text-dark-text-secondary select-none">
                        ·
                    </span>
                    <span className="text-gray-500 dark:text-dark-text-secondary text-[14px]">
                        {formatPostDate(notification.createdAt)}
                    </span>
                </div>

                {/* Row 3: Follow Back Button (for follow notifications) */}
                {notification.reason === 'follow' && !isOwnProfile && (
                    <div className="mt-2.5">
                        <button
                            type="button"
                            onClick={handleFollowToggle}
                            disabled={followLoading}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all inline-flex items-center gap-1.5",
                                "disabled:opacity-60 disabled:cursor-not-allowed",
                                isFollowing
                                    ? "bg-[#EAEAEA] dark:bg-[#20242D] hover:bg-[#E0E0E0] dark:hover:bg-[#2A303C] text-black dark:text-white"
                                    : "bg-[#006AFF] hover:bg-[#005AD4] text-white"
                            )}
                        >
                            {isFollowing ? (
                                <>
                                    <FiCheck size={14} className="stroke-[2.5]" />
                                    <span>{t('profile.following_btn', 'Following')}</span>
                                </>
                            ) : (
                                <>
                                    <FiPlus size={14} className="stroke-[2.5]" />
                                    <span>{t('profile.follow_back', 'Follow back')}</span>
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Row 3: Post Preview (for like, repost, reply, quote, mention) */}
                {notification.reason !== 'follow' && notification.reason !== 'list_invitation' && (
                    <>
                        {previewText && (
                            <p className="mt-1 text-[14px] text-gray-500 dark:text-dark-text-secondary line-clamp-2 break-all">
                                {previewText}
                            </p>
                        )}

                        {previewImage && (
                            <div className="mt-2">
                                <img
                                    src={previewImage}
                                    alt="Post attachment"
                                    className="w-20 h-20 rounded-lg object-cover border border-gray-100 dark:border-dark-border"
                                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                            </div>
                        )}
                    </>
                )}

                {/* Row 3: List Invitation actions */}
                {notification.type === 'list_invitation' && !responded && (
                    <div className="mt-3 flex gap-2">
                        <button
                            onClick={handleAccept}
                            disabled={loading}
                            className="px-4 py-1.5 bg-[#006AFF] hover:bg-[#005AD4] text-white rounded-full text-sm font-semibold transition-colors flex items-center gap-1"
                        >
                            {loading ? <div className="animate-spin w-3 h-3 border-2 border-white rounded-full border-t-transparent" /> : <FiCheck size={14} />}
                            {t('common.accept', 'Accept')}
                        </button>
                        <button
                            onClick={handleReject}
                            disabled={loading}
                            className="px-4 py-1.5 bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-dark-text rounded-full text-sm font-semibold hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors flex items-center gap-1"
                        >
                            <FiX size={14} />
                            {t('common.reject', 'Reject')}
                        </button>
                    </div>
                )}

                {responded && (
                    <div className="mt-2 text-sm font-medium italic text-gray-500 dark:text-dark-text-secondary">
                        {responded === 'accepted' ? t('lists.invitation_accepted', 'Invitation accepted') : t('lists.invitation_rejected', 'Invitation declined')}
                    </div>
                )}
            </div>

            {/* Unread indicator */}
            {!notification.isRead && !responded && (
                <div className="flex-shrink-0 pt-2 pr-1">
                    <div className="w-2 h-2 bg-[#006AFF] rounded-full" />
                </div>
            )}
        </div>
    );
};

export default NotificationItem;
