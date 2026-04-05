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
import RichText from './RichText';
import { BsPatchCheckFill } from 'react-icons/bs';
import { FiUserCheck, FiUserPlus } from 'react-icons/fi';
import { cn } from '../../utils/classNames';
import { formatCount } from '../../utils/formatNumber';
import { API_BASE_URL } from '../../constants';

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

interface FullProfile {
    id: string;
    handle: string;
    displayName: string;
    avatar?: string;
    avatarUrl?: string;
    bio?: string;
    followersCount: number;
    followingCount: number;
    isFollowing: boolean;
    followingReference?: string;
    isVerified?: boolean;
    did?: string;
    isBlocking?: boolean;
    isBlockedBy?: boolean;
    isFollowedBy?: boolean;
}

interface UserHoverCardProps {
    user: HoverCardUser;
    children: React.ReactNode;
    disabled?: boolean;
}

const CARD_WIDTH = 300;
const HOVER_DELAY_MS = 800;
const LEAVE_CLOSE_DELAY_MS = 200;

// Simple in-memory cache so we don't re-fetch for same handle
const profileCache = new Map<string, FullProfile>();

const UserHoverCard: React.FC<UserHoverCardProps> = ({ user, children, disabled = false }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const actionLoading = useAppSelector((state: RootState) => state.user.actionLoading);

    const [visible, setVisible] = useState(false);
    const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});
    const [profile, setProfile] = useState<FullProfile | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const triggerRef = useRef<HTMLDivElement>(null);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isHoveringCard = useRef(false);

    const isOwnProfile = currentUser?.id === user.id ||
        (currentUser?.did && user.did && currentUser.did === user.did);

    const computePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const estimatedHeight = 220;
        const openUpward = (window.innerHeight - rect.bottom) < estimatedHeight && rect.top > estimatedHeight;

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

        let left = rect.left;
        if (left + CARD_WIDTH > window.innerWidth - 12) left = window.innerWidth - CARD_WIDTH - 12;
        if (left < 12) left = 12;
        style.left = left;

        setCardStyle(style);
    }, []);

    const fetchProfile = useCallback(async () => {
        const key = user.handle || user.did || user.id;
        if (!key) return;

        // Check cache
        const cached = profileCache.get(key);
        if (cached) {
            setProfile(cached);
            return;
        }

        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers: HeadersInit = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${API_BASE_URL}/users/profile/${key}`, { headers });
            if (res.ok) {
                const data = await res.json();
                const profileData = data.user;
                const fp: FullProfile = {
                    id: profileData.id || user.id,
                    handle: profileData.handle || user.handle || '',
                    displayName: profileData.displayName || user.displayName || '',
                    avatar: profileData.avatar || profileData.avatarUrl || user.avatar,
                    avatarUrl: profileData.avatarUrl || profileData.avatar || user.avatarUrl,
                    bio: profileData.bio,
                    followersCount: profileData.followersCount ?? 0,
                    followingCount: profileData.followingCount ?? 0,
                    isFollowing: data.isFollowing ?? profileData.isFollowing ?? false,
                    isFollowedBy: data.isFollowedBy ?? profileData.isFollowedBy ?? false,
                    followingReference: profileData.followingReference,
                    isVerified: profileData.isVerified ?? false,
                    did: profileData.did || user.did,
                    isBlocking: data.isBlocking ?? profileData.isBlocking ?? false,
                    isBlockedBy: data.isBlockedBy ?? profileData.isBlockedBy ?? false,
                };
                profileCache.set(key, fp);
                setProfile(fp);
            }
        } catch (_) {
            // Silently fail; card will show with limited data
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const showCard = useCallback(() => {
        if (disabled || isOwnProfile) return;
        computePosition();
        setVisible(true);
        fetchProfile();
    }, [disabled, isOwnProfile, computePosition, fetchProfile]);

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
        closeTimer.current = setTimeout(() => setVisible(false), LEAVE_CLOSE_DELAY_MS);
    }, []);

    useEffect(() => {
        return () => {
            if (hoverTimer.current) clearTimeout(hoverTimer.current);
            if (closeTimer.current) clearTimeout(closeTimer.current);
        };
    }, []);

    // Sync isFollowing from redux actionLoading changes back to local profile
    const followActor = user.did || user.handle || user.id;
    const followIsPending = !!actionLoading[followActor] || !!actionLoading[user.id];

    const handleFollowToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentUser) { dispatch(openAuthWall()); return; }

        const displayProfile = profile;
        try {
            if (displayProfile?.isFollowing) {
                if (!displayProfile.followingReference) {
                    dispatch(showToast({ message: 'Missing follow reference', type: 'error' }));
                    return;
                }
                dispatch(unfollowUserAsync({
                    userId: followActor,
                    followUri: displayProfile.followingReference
                }));
                // Update local cache
                const updated = { ...displayProfile, isFollowing: false, followingReference: undefined, followersCount: Math.max(0, displayProfile.followersCount - 1) };
                setProfile(updated);
                const key = user.handle || user.did || user.id;
                if (key) profileCache.set(key, updated);
            } else {
                dispatch(followUserAsync(followActor));
                if (displayProfile) {
                    const updated = { ...displayProfile, isFollowing: true, followersCount: displayProfile.followersCount + 1 };
                    setProfile(updated);
                    const key = user.handle || user.did || user.id;
                    if (key) profileCache.set(key, updated);
                }
            }
        } catch (err: any) {
            dispatch(showToast({ message: err || 'Failed to update follow status', type: 'error' }));
        }
    };

    const handleNavigate = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/profile/${user.handle || user.did || user.id}`);
        setVisible(false);
    };

    // Use fetched profile if available, otherwise fall back to passed-in user prop
    const displayName = profile?.displayName || user.displayName || user.handle || 'Unknown';
    const handle = profile?.handle || user.handle;
    const avatarSrc = profile?.avatarUrl || profile?.avatar || user.avatarUrl || user.avatar;
    const bio = profile?.bio;
    const followersCount = profile?.followersCount ?? user.followersCount ?? 0;
    const followingCount = profile?.followingCount ?? user.followingCount ?? 0;

    // Prefer fetched profile state when available because it carries the freshest ATProto viewer relationship.
    const isFollowing = profile?.isFollowing ?? user.isFollowing ?? false;

    const isFollowedBy = profile?.isFollowedBy ?? false;
    const followingReference = profile?.followingReference ?? user.followingReference;
    const isVerified = profile?.isVerified ?? user.isVerified ?? false;
    const isBlocking = profile?.isBlocking ?? user.isBlocking ?? false;
    const isBlockedBy = profile?.isBlockedBy ?? user.isBlockedBy ?? false;

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
                        'rounded-2xl shadow-2xl overflow-hidden'
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Top row: avatar + follow button */}
                    <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
                        <button onClick={handleNavigate} className="flex-shrink-0">
                            <Avatar
                                src={avatarSrc}
                                alt={displayName}
                                size="xl"
                            />
                        </button>

                        {!isOwnProfile && currentUser && !isBlocking && !isBlockedBy && (
                            <button
                                onClick={handleFollowToggle}
                                disabled={followIsPending}
                                className={cn(
                                    'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-all mt-1',
                                    'disabled:opacity-60 disabled:cursor-not-allowed',
                                    isFollowing
                                        ? 'bg-transparent border border-gray-300 dark:border-dark-border text-gray-800 dark:text-dark-text hover:border-red-400 hover:text-red-500 group'
                                        : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100'
                                )}
                            >
                                {isFollowing ? (
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
                        <button onClick={handleNavigate} className="text-left w-full">
                            <div className="flex items-center gap-1 flex-wrap">
                                <span className="font-bold text-[15px] text-gray-900 dark:text-dark-text hover:underline leading-tight">
                                    {displayName}
                                </span>
                                {isVerified && <BsPatchCheckFill className="text-blue-500 flex-shrink-0" size={14} />}
                            </div>
                            {handle && (
                                <div className="flex items-center gap-2 mt-0.5">
                                    <div className="text-[14px] text-gray-500 dark:text-dark-text-secondary">
                                        @{handle}
                                    </div>
                                    {isFollowedBy && (
                                        <span className="bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded text-[11px] font-bold">
                                            Follows you
                                        </span>
                                    )}
                                </div>
                            )}
                        </button>
                    </div>

                    {/* Bio */}
                    {isLoading && !bio ? (
                        <div className="px-4 pb-3">
                            <div className="h-3 w-4/5 bg-gray-200 dark:bg-dark-border rounded animate-pulse mb-1.5" />
                            <div className="h-3 w-3/5 bg-gray-200 dark:bg-dark-border rounded animate-pulse" />
                        </div>
                    ) : bio ? (
                        <div className="px-4 pb-3">
                            <RichText
                                content={bio}
                                className="text-[14px] text-gray-800 dark:text-dark-text leading-snug"
                            />
                        </div>
                    ) : null}

                    {/* Followers / Following */}
                    <div className="px-4 pb-4 flex items-center gap-4 text-[13px]">
                        {isLoading && followersCount === 0 ? (
                            <>
                                <div className="h-3 w-20 bg-gray-200 dark:bg-dark-border rounded animate-pulse" />
                                <div className="h-3 w-20 bg-gray-200 dark:bg-dark-border rounded animate-pulse" />
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/${handle}/followers`); setVisible(false); }}
                                    className="hover:underline"
                                >
                                    <span className="font-bold text-gray-900 dark:text-dark-text">{formatCount(followersCount)}</span>{' '}
                                    <span className="text-gray-500 dark:text-dark-text-secondary">followers</span>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/${handle}/following`); setVisible(false); }}
                                    className="hover:underline"
                                >
                                    <span className="font-bold text-gray-900 dark:text-dark-text">{formatCount(followingCount)}</span>{' '}
                                    <span className="text-gray-500 dark:text-dark-text-secondary">following</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default UserHoverCard;
