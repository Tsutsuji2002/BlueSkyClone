import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import { followUserAsync, unfollowUserAsync } from '../../redux/slices/userSlice';
import { openAuthWall } from '../../redux/slices/modalsSlice';
import { showToast } from '../../redux/slices/toastSlice';
import Avatar from './Avatar';
import { BsPatchCheckFill } from 'react-icons/bs';
import { FiUserCheck, FiUserPlus } from 'react-icons/fi';
import { cn } from '../../utils/classNames';
import { formatCount } from '../../utils/formatNumber';
import { User } from '../../types';

interface HoverCardUser {
    id: string;
    handle?: string;
    displayName?: string;
    avatar?: string;
    avatarUrl?: string;
    bio?: string;
    followersCount?: number;
    followingCount?: number;
    isFollowing?: boolean;
    followingReference?: string;
    isVerified?: boolean;
    did?: string;
    isBlockedBy?: boolean;
    isBlocking?: boolean;
}

interface UserHoverCardProps {
    user: HoverCardUser;
    children: React.ReactNode;
    disabled?: boolean; // e.g. own profile or blocked
}

const CARD_WIDTH = 300;
const CARD_HEIGHT_ESTIMATE = 200;
const HOVER_DELAY_MS = 800;
const LEAVE_CLOSE_DELAY_MS = 150;

const UserHoverCard: React.FC<UserHoverCardProps> = ({ user, children, disabled = false }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const actionLoading = useAppSelector((state: RootState) => state.user.actionLoading);

    const [visible, setVisible] = useState(false);
    const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});
    const triggerRef = useRef<HTMLDivElement>(null);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isHoveringCard = useRef(false);

    const isOwnProfile = currentUser?.id === user.id ||
        (currentUser?.did && user.did && currentUser.did === user.did);

    const computePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceRight = window.innerWidth - rect.left;
        const openUpward = spaceBelow < CARD_HEIGHT_ESTIMATE && rect.top > CARD_HEIGHT_ESTIMATE;

        const style: React.CSSProperties = {
            position: 'fixed',
            width: `${CARD_WIDTH}px`,
            zIndex: 99999,
        };

        if (openUpward) {
            style.bottom = window.innerHeight - rect.top + 6;
        } else {
            style.top = rect.bottom + 6;
        }

        // Horizontal positioning: prefer left-aligned with the trigger
        let left = rect.left;
        if (left + CARD_WIDTH > window.innerWidth - 12) {
            left = window.innerWidth - CARD_WIDTH - 12;
        }
        if (left < 12) left = 12;
        style.left = left;

        setCardStyle(style);
    }, []);

    const showCard = useCallback(() => {
        if (disabled || isOwnProfile) return;
        computePosition();
        setVisible(true);
    }, [disabled, isOwnProfile, computePosition]);

    const handleMouseEnter = useCallback(() => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        hoverTimer.current = setTimeout(showCard, HOVER_DELAY_MS);
    }, [showCard]);

    const handleMouseLeave = useCallback(() => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        closeTimer.current = setTimeout(() => {
            if (!isHoveringCard.current) setVisible(false);
        }, LEAVE_CLOSE_DELAY_MS);
    }, []);

    const handleCardMouseEnter = useCallback(() => {
        isHoveringCard.current = true;
        if (closeTimer.current) clearTimeout(closeTimer.current);
    }, []);

    const handleCardMouseLeave = useCallback(() => {
        isHoveringCard.current = false;
        closeTimer.current = setTimeout(() => {
            setVisible(false);
        }, LEAVE_CLOSE_DELAY_MS);
    }, []);

    useEffect(() => {
        return () => {
            if (hoverTimer.current) clearTimeout(hoverTimer.current);
            if (closeTimer.current) clearTimeout(closeTimer.current);
        };
    }, []);

    const handleFollowToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentUser) {
            dispatch(openAuthWall());
            return;
        }
        try {
            if (user.isFollowing) {
                if (!user.followingReference) {
                    dispatch(showToast({ message: 'Missing follow reference', type: 'error' }));
                    return;
                }
                await dispatch(unfollowUserAsync({
                    userId: user.id,
                    followUri: user.followingReference
                })).unwrap();
            } else {
                await dispatch(followUserAsync(user.id)).unwrap();
            }
        } catch (err: any) {
            dispatch(showToast({ message: err || 'Failed to update follow status', type: 'error' }));
        }
    };

    const handleNavigate = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const target = user.handle || user.did || user.id;
        navigate(`/profile/${target}`);
        setVisible(false);
    };

    const isLoading = actionLoading[user.id];

    return (
        <div
            ref={triggerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="inline-block"
        >
            {children}

            {visible && createPortal(
                <div
                    style={cardStyle}
                    onMouseEnter={handleCardMouseEnter}
                    onMouseLeave={handleCardMouseLeave}
                    className={cn(
                        'bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border',
                        'rounded-2xl shadow-2xl overflow-hidden',
                        'animate-in fade-in zoom-in-95 duration-150'
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Top row: avatar + follow button */}
                    <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
                        <button onClick={handleNavigate} className="flex-shrink-0">
                            <Avatar
                                src={user.avatarUrl || user.avatar}
                                alt={user.displayName || user.handle || '?'}
                                size="xl"
                            />
                        </button>

                        {!isOwnProfile && currentUser && !user.isBlocking && !user.isBlockedBy && (
                            <button
                                onClick={handleFollowToggle}
                                disabled={!!isLoading}
                                className={cn(
                                    'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-all mt-1',
                                    'disabled:opacity-60 disabled:cursor-not-allowed',
                                    user.isFollowing
                                        ? 'bg-transparent border border-gray-300 dark:border-dark-border text-gray-800 dark:text-dark-text hover:border-red-400 hover:text-red-500 group'
                                        : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100'
                                )}
                            >
                                {user.isFollowing ? (
                                    <>
                                        <FiUserCheck size={14} className="group-hover:hidden" />
                                        <FiUserPlus size={14} className="hidden group-hover:block" />
                                        <span className="group-hover:hidden">Following</span>
                                        <span className="hidden group-hover:inline">Unfollow</span>
                                    </>
                                ) : (
                                    <>
                                        <FiUserPlus size={14} />
                                        <span>Follow</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Name + handle */}
                    <div className="px-4 pb-2">
                        <button
                            onClick={handleNavigate}
                            className="text-left w-full"
                        >
                            <div className="flex items-center gap-1 flex-wrap">
                                <span className="font-bold text-[15px] text-gray-900 dark:text-dark-text hover:underline">
                                    {user.displayName || user.handle || 'Unknown'}
                                </span>
                                {user.isVerified && (
                                    <BsPatchCheckFill className="text-blue-500" size={14} />
                                )}
                            </div>
                            <div className="text-[13px] text-gray-500 dark:text-dark-text-secondary">
                                @{user.handle}
                            </div>
                        </button>
                    </div>

                    {/* Bio */}
                    {user.bio && (
                        <div className="px-4 pb-3">
                            <p className="text-[14px] text-gray-800 dark:text-dark-text line-clamp-3 leading-snug">
                                {user.bio}
                            </p>
                        </div>
                    )}

                    {/* Followers / Following */}
                    <div className="px-4 pb-4 flex items-center gap-4 text-[13px]">
                        <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${user.handle}/followers`); setVisible(false); }}
                            className="hover:underline"
                        >
                            <span className="font-bold text-gray-900 dark:text-dark-text">
                                {formatCount(user.followersCount ?? 0)}
                            </span>{' '}
                            <span className="text-gray-500 dark:text-dark-text-secondary">followers</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${user.handle}/following`); setVisible(false); }}
                            className="hover:underline"
                        >
                            <span className="font-bold text-gray-900 dark:text-dark-text">
                                {formatCount(user.followingCount ?? 0)}
                            </span>{' '}
                            <span className="text-gray-500 dark:text-dark-text-secondary">following</span>
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default UserHoverCard;
