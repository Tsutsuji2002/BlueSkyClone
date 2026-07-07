import React, { useState, useRef, useEffect as useEffectHook } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiBell, FiBellOff, FiEdit3, FiLink, FiLogOut, FiAlertTriangle } from 'react-icons/fi';
import GroupAvatar from '../messages/GroupAvatar';
import Avatar from '../common/Avatar';
import { Conversation, User } from '../../types';
import { format } from 'date-fns';
import EditGroupNameModal from '../modals/EditGroupNameModal';
import InviteLinkModal from '../modals/InviteLinkModal';
import ReportConversationModal from '../modals/ReportConversationModal';
import ConfirmModal from '../common/ConfirmModal';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { showToast } from '../../redux/slices/toastSlice';
import { fetchConversationById } from '../../redux/slices/messagesSlice';

interface GroupChatSettingsPanelProps {
    conversation: Conversation;
    currentUser: User;
    onMuteToggle: () => void;
    onLockToggle: (locked: boolean) => void;
    onLeave: () => void;
    onAddMembers: () => void;
}

const GroupChatSettingsPanel: React.FC<GroupChatSettingsPanelProps> = ({
    conversation,
    currentUser,
    onMuteToggle,
    onLockToggle,
    onLeave,
    onAddMembers
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [isEditNameOpen, setIsEditNameOpen] = useState(false);
    const [isInviteLinkOpen, setIsInviteLinkOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isLockConfirmOpen, setIsLockConfirmOpen] = useState(false);
    const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
    const [isMuted, setIsMuted] = useState(conversation.muted || false);
    const [isLocked, setIsLocked] = useState(conversation.locked || false);
    const [isMuteLoading, setIsMuteLoading] = useState(false);
    const [isLockLoading, setIsLockLoading] = useState(false);
    const [followStatuses, setFollowStatuses] = useState<Record<string, boolean>>({});
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close the dropdown when clicking outside
    useEffectHook(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenuId(null);
            }
        };
        if (openMenuId) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openMenuId]);

    const API_URL = process.env.REACT_APP_API_URL || '/api';

    // Determine if current user is the owner/admin (first participant)
    const isOwner = conversation.participants.length > 0 && 
        ((conversation.participants[0].did && currentUser?.did && conversation.participants[0].did === currentUser.did) ||
         (conversation.participants[0].id === currentUser?.id));

    // Fetch follow statuses for all participants using DID-based AT Protocol lookup.
    // This ensures remote Bluesky follow states (not just local DB) are reflected.
    React.useEffect(() => {
        const fetchFollowStatuses = async () => {
            if (!currentUser?.id) return;
            
            const participantDids = conversation.participants
                .filter(p => p.did !== currentUser?.did && p.id !== currentUser?.id)
                .map(p => p.did)
                .filter((did): did is string => !!did);
            
            if (participantDids.length === 0) return;
            
            try {
                // Use AT Protocol-aware endpoint so follow state is always accurate
                // for remote Bluesky participants (not just local DB users)
                const response = await fetch(`${API_URL}/user/batch-follow-status-by-did`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ dids: participantDids })
                });
                
                if (response.ok) {
                    const data: Record<string, boolean> = await response.json();
                    // Store statuses keyed by DID (lowercase) for consistent lookup
                    const statuses: Record<string, boolean> = {};
                    for (const [did, isFollowing] of Object.entries(data)) {
                        statuses[did.toLowerCase()] = isFollowing;
                    }
                    setFollowStatuses(statuses);
                } else {
                    console.warn('Batch follow status by DID not available');
                }
            } catch (error) {
                console.error('Error fetching follow statuses:', error);
            }
        };
        
        fetchFollowStatuses();
    }, [conversation.participants, currentUser, API_URL]);

    // Update locked state when conversation prop changes
    React.useEffect(() => {
        console.log('[GroupChatSettingsPanel] conversation.locked:', conversation.locked);
        setIsLocked(conversation.locked || false);
    }, [conversation.locked]);

    const otherParticipants = conversation.participants.filter(p => 
        (p.did && currentUser?.did) ? p.did !== currentUser.did : (p.id !== currentUser?.id && p.handle !== currentUser?.handle)
    );

    const groupDisplayName = conversation.groupName || 
        "Group with " + otherParticipants.map(p => p.did || p.handle || p.displayName).join(', ');

    const createdDate = conversation.createdAt ? format(new Date(conversation.createdAt), 'MMMM d, yyyy') : '';

    const handleMuteClick = async () => {
        setIsMuteLoading(true);
        try {
            const endpoint = isMuted ? 'unmute' : 'mute';
            const response = await fetch(`${API_URL}/chat/conversations/${conversation.id}/${endpoint}`, {
                method: 'POST',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`Failed to ${endpoint} conversation`);
            }

            setIsMuted(!isMuted);
            dispatch(showToast({ 
                message: isMuted 
                    ? t('messages.group_chat_unmuted', 'Group chat unmuted') 
                    : t('messages.group_chat_muted', 'Group chat muted'), 
                type: 'success' 
            }));
            onMuteToggle();
        } catch (error) {
            console.error('Error toggling mute:', error);
            dispatch(showToast({ 
                message: t('messages.failed_to_toggle_mute', 'Failed to update mute status'), 
                type: 'error' 
            }));
        } finally {
            setIsMuteLoading(false);
        }
    };

    const handleLockClick = () => {
        if (!isLocked) {
            // Show confirm modal when locking
            setIsLockConfirmOpen(true);
        } else {
            // Unlock directly
            handleUnlock();
        }
    };

    const confirmLock = async () => {
        setIsLockConfirmOpen(false);
        setIsLockLoading(true);
        try {
            const response = await fetch(`${API_URL}/chat/conversations/${conversation.id}/lock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to lock conversation');
            }

            // Refetch conversation to get updated locked status
            await dispatch(fetchConversationById(conversation.id));
            
            dispatch(showToast({ message: 'Group chat locked', type: 'success' }));
            onLockToggle(true);
        } catch (error: any) {
            dispatch(showToast({ message: error.message || 'Failed to lock conversation', type: 'error' }));
        } finally {
            setIsLockLoading(false);
        }
    };

    const handleUnlock = async () => {
        setIsLockLoading(true);
        try {
            const response = await fetch(`${API_URL}/chat/conversations/${conversation.id}/unlock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to unlock conversation');
            }

            // Refetch conversation to get updated locked status
            await dispatch(fetchConversationById(conversation.id));
            
            dispatch(showToast({ message: 'Group chat unlocked', type: 'success' }));
            onLockToggle(false);
        } catch (error: any) {
            dispatch(showToast({ message: error.message || 'Failed to unlock conversation', type: 'error' }));
        } finally {
            setIsLockLoading(false);
        }
    };

    const handleLeaveClick = () => {
        setIsLeaveConfirmOpen(true);
    };

    const confirmLeave = () => {
        onLeave();
        setIsLeaveConfirmOpen(false);
    };

    const handleBack = () => {
        navigate(`/messages/${conversation.id}`);
    };

    return (
        <>
            <div className="flex flex-col h-[100dvh] bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border">
                {/* Header */}
                <div className="p-4 flex items-center gap-3 border-b border-gray-200 dark:border-dark-border">
                    <button 
                        onClick={handleBack}
                        className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                    >
                        <FiArrowLeft size={20} className="text-gray-600 dark:text-dark-text" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {t('messages.group_settings', 'Group chat settings')}
                    </h1>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                    {/* Group Info Section */}
                    <div className="flex flex-col items-center justify-center p-8 border-b border-gray-200 dark:border-dark-border">
                        {/* Group Avatar */}
                        <div className="mb-4">
                            <GroupAvatar 
                                users={otherParticipants}
                                size="xl"
                                maxVisible={2}
                            />
                        </div>

                        {/* Group Name */}
                        <h2 className="text-xl font-bold text-center text-gray-900 dark:text-dark-text mb-1">
                            {groupDisplayName}
                        </h2>

                        {/* Created Date */}
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary text-center mb-6">
                            {t('messages.created_date', 'Created {{date}}', { date: createdDate })}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center justify-center gap-6">
                            {/* Mute Button - Always visible */}
                            <div className="flex flex-col items-center">
                                <button
                                    onClick={handleMuteClick}
                                    disabled={isMuteLoading || isLocked}
                                    className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label={isMuted ? t('messages.unmute') : t('messages.mute')}
                                >
                                    {isMuteLoading ? (
                                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                    ) : isMuted ? (
                                        <FiBellOff size={20} />
                                    ) : (
                                        <FiBell size={20} />
                                    )}
                                </button>
                                <span className="text-xs font-medium mt-1 text-gray-900 dark:text-dark-text">
                                    {t('messages.mute', 'Mute')}
                                </span>
                            </div>

                            {/* Edit Name Button - Owner only */}
                            {isOwner && (
                                <div className="flex flex-col items-center">
                                    <button
                                        onClick={() => setIsEditNameOpen(true)}
                                        disabled={isLocked}
                                        className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label={t('messages.edit_name')}
                                    >
                                        <FiEdit3 size={20} />
                                    </button>
                                    <span className="text-xs font-medium mt-1 text-gray-900 dark:text-dark-text">
                                        {t('messages.edit_name', 'Edit name')}
                                    </span>
                                </div>
                            )}

                            {/* Invite Link Button - Owner only */}
                            {isOwner && (
                                <div className="flex flex-col items-center">
                                    <button
                                        onClick={() => setIsInviteLinkOpen(true)}
                                        disabled={isLocked}
                                        className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label={t('messages.invite_link')}
                                    >
                                        <FiLink size={20} />
                                    </button>
                                    <span className="text-xs font-medium mt-1 text-gray-900 dark:text-dark-text">
                                        {t('messages.invite_link', 'Invite link')}
                                    </span>
                                </div>
                            )}

                            {/* Lock Button - Owner only */}
                            {isOwner && (
                                <div className="flex flex-col items-center">
                                    <button
                                        onClick={handleLockClick}
                                        disabled={isLockLoading}
                                        className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                            isLocked 
                                                ? 'bg-[#FEE7EC] hover:bg-[#FDD8E1]' 
                                                : 'bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-hover'
                                        }`}
                                        aria-label={isLocked ? t('messages.unlock', 'Unlock this group chat') : t('messages.lock', 'Lock')}
                                    >
                                        {isLockLoading ? (
                                            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <svg fill="none" width="18" viewBox="0 0 24 24" height="18" className={isLocked ? 'text-[#CA123D]' : 'text-gray-700 dark:text-gray-300'}>
                                                <path 
                                                    fill="currentColor" 
                                                    fillRule="evenodd" 
                                                    clipRule="evenodd" 
                                                    d="M7 7a5 5 0 0 1 10 0v2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h1V7Zm-1 4v9h12v-9H6Zm9-2H9V7a3 3 0 1 1 6 0v2Zm-3 4a1 1 0 0 1 1 1v3a1 1 0 1 1-2 0v-3a1 1 0 0 1 1-1Z"
                                                />
                                            </svg>
                                        )}
                                    </button>
                                    <span className="text-xs font-medium mt-1 text-gray-900 dark:text-dark-text">
                                        {isLocked ? t('messages.locked', 'Locked') : t('messages.lock', 'Lock')}
                                    </span>
                                </div>
                            )}

                            {/* Report Button - Non-owner only */}
                            {!isOwner && (
                                <div className="flex flex-col items-center">
                                    <button
                                        onClick={() => setIsReportOpen(true)}
                                        className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
                                        aria-label={t('messages.report', 'Report')}
                                    >
                                        <FiAlertTriangle size={20} />
                                    </button>
                                    <span className="text-xs font-medium mt-1 text-gray-900 dark:text-dark-text">
                                        {t('messages.report', 'Report')}
                                    </span>
                                </div>
                            )}

                            {/* Leave Button - Always visible */}
                            <div className="flex flex-col items-center">
                                <button
                                    onClick={handleLeaveClick}
                                    className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
                                    aria-label={t('messages.leave')}
                                >
                                    <FiLogOut size={20} />
                                </button>
                                <span className="text-xs font-medium mt-1 text-gray-900 dark:text-dark-text">
                                    {t('messages.leave', 'Leave')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Members Section */}
                    <div className="flex flex-col">
                        {/* Members Header */}
                        <div className="flex items-center justify-between px-5 py-3">
                            <div className="flex items-center gap-1">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-dark-text">
                                    {t('messages.members', 'Members')}
                                </h3>
                                <span className="text-xs font-medium text-gray-500 dark:text-dark-text-secondary">
                                    {conversation.participants.length}/50
                                </span>
                            </div>
                        </div>

                        {/* Add Members Button */}
                        <button
                            onClick={onAddMembers}
                            className="flex items-center justify-between w-full px-5 py-3 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-surface">
                                    <svg className="w-5 h-5 text-gray-900 dark:text-dark-text" fill="currentColor" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" d="M12 3a1 1 0 0 1 1 1v7h7a1 1 0 1 1 0 2h-7v7a1 1 0 1 1-2 0v-7H4a1 1 0 1 1 0-2h7V4a1 1 0 0 1 1-1Z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <span className="font-semibold text-gray-900 dark:text-dark-text">
                                    {t('messages.add_members', 'Add members')}
                                </span>
                            </div>
                            <svg className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M8.293 3.293a1 1 0 0 1 1.414 0l8 8a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414-1.414L15.586 12 8.293 4.707a1 1 0 0 1 0-1.414Z" clipRule="evenodd" />
                            </svg>
                        </button>

                        {/* Members List */}
                        <div className="flex flex-col">
                            {conversation.participants.map((participant) => {
                                const isCurrentUser = participant.did === currentUser?.did || participant.id === currentUser?.id;
                                const isAdmin = participant.did === conversation.participants[0]?.did;
                                const participantKey = (participant.did || participant.id).toLowerCase();
                                const isFollowing = followStatuses[participantKey] || false;

                                const handleFollowToggle = async () => {
                                    try {
                                        const endpoint = isFollowing ? 'unfollow' : 'follow';
                                        const response = await fetch(`${API_URL}/users/${endpoint}/${participant.handle}`, {
                                            method: 'POST',
                                            credentials: 'include'
                                        });

                                        if (response.ok) {
                                            setFollowStatuses(prev => ({
                                                ...prev,
                                                [participantKey]: !isFollowing
                                            }));
                                            dispatch(showToast({ 
                                                message: isFollowing 
                                                    ? `Unfollowed @${participant.handle}` 
                                                    : `Following @${participant.handle}`, 
                                                type: 'success' 
                                            }));
                                        } else {
                                            throw new Error('Failed to update follow status');
                                        }
                                    } catch (error) {
                                        console.error('Error toggling follow:', error);
                                        dispatch(showToast({ 
                                            message: 'Failed to update follow status', 
                                            type: 'error' 
                                        }));
                                    }
                                };

                                return (
                                    <div
                                        key={participant.did || participant.id}
                                        className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                                    >
                                        <div 
                                            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
                                            onClick={() => navigate(`/profile/${participant.handle}`)}
                                        >
                                            <Avatar
                                                src={participant.avatarUrl || participant.avatar}
                                                alt={participant.displayName || participant.handle}
                                                size="md"
                                            />
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="font-semibold text-gray-900 dark:text-dark-text truncate hover:underline">
                                                    {participant.displayName || participant.handle}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                                                    @{participant.handle}
                                                </span>
                                                {!isCurrentUser && !isAdmin && (
                                                    <span className="text-xs text-gray-500 dark:text-dark-text-secondary">
                                                        {t('messages.added_by', 'Added by {{name}}', { 
                                                            name: conversation.participants[0]?.displayName || conversation.participants[0]?.handle 
                                                        })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isAdmin && (
                                                <span className="px-2 py-1 text-xs font-semibold text-gray-600 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-surface rounded">
                                                    {t('messages.admin', 'Admin')}
                                                </span>
                                            )}
                                            {!isCurrentUser && !isFollowing && (
                                                <button 
                                                    className="text-sm font-medium text-primary hover:underline whitespace-nowrap"
                                                    onClick={handleFollowToggle}
                                                >
                                                    {t('common.follow', 'Follow')}
                                                </button>
                                            )}
                                            {!isCurrentUser && (
                                                <div className="relative" ref={openMenuId === participantKey ? menuRef : undefined}>
                                                    <button
                                                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-surface transition-colors"
                                                        onClick={() => setOpenMenuId(prev => prev === participantKey ? null : participantKey)}
                                                        aria-label={`Open chat member options for ${participant.handle}`}
                                                        aria-expanded={openMenuId === participantKey}
                                                        aria-haspopup="menu"
                                                    >
                                                        <svg className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary" fill="currentColor" viewBox="0 0 24 24">
                                                            <path fillRule="evenodd" d="M2 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm16 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm-6-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>

                                                    {openMenuId === participantKey && (
                                                        <div
                                                            role="menu"
                                                            className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface shadow-xl overflow-hidden"
                                                            style={{ animation: '0.2s cubic-bezier(0.16,1,0.3,1) both zoomIn' }}
                                                        >
                                                            {/* Go to profile */}
                                                            <button
                                                                role="menuitem"
                                                                className="flex items-center gap-4 w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                                                                onClick={() => { setOpenMenuId(null); navigate(`/profile/${participant.handle}`); }}
                                                            >
                                                                <svg fill="none" viewBox="0 0 24 24" width="20" height="20">
                                                                    <path fill="#405168" fillRule="evenodd" clipRule="evenodd" d="M12 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM7.5 6.5a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM12 14c-2.95 0-5.163 1.733-6.08 4.21a.47.47 0 0 0 .09.493.9.9 0 0 0 .687.297h10.606a.9.9 0 0 0 .687-.297.47.47 0 0 0 .09-.493C17.163 15.732 14.95 14 12 14Zm-7.955 3.516C5.235 14.296 8.168 12 12 12s6.765 2.296 7.956 5.516c.34.92.107 1.828-.434 2.473A2.9 2.9 0 0 1 17.303 21H6.697a2.9 2.9 0 0 1-2.219-1.011 2.46 2.46 0 0 1-.433-2.473Z" />
                                                                </svg>
                                                                <span className="text-[13px] font-semibold text-gray-800 dark:text-dark-text">{t('common.go_to_profile', 'Go to profile')}</span>
                                                            </button>

                                                            {/* Message - Owner only */}
                                                            {isOwner && (
                                                            <button
                                                                role="menuitem"
                                                                className="flex items-center gap-4 w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                                                                onClick={() => { setOpenMenuId(null); navigate(`/messages?new=${participant.did || participant.handle}`); }}
                                                            >
                                                                <svg fill="none" viewBox="0 0 24 24" width="20" height="20">
                                                                    <path fill="#405168" fillRule="evenodd" clipRule="evenodd" d="M4 12a8 8 0 1 1 4.445 7.169 1 1 0 0 0-.629-.088l-3.537.662.7-3.415a1 1 0 0 0-.09-.66A7.961 7.961 0 0 1 4 12Zm8-10C6.477 2 2 6.477 2 12c0 1.523.341 2.968.951 4.262l-.93 4.537a1 1 0 0 0 1.163 1.184l4.68-.876A9.968 9.968 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2ZM7.5 13.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm4.5 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm4.5 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
                                                                </svg>
                                                                <span className="text-[13px] font-semibold text-gray-800 dark:text-dark-text">{t('common.message', 'Message')}</span>
                                                            </button>
                                                            )}

                                                            {/* Separator - only shown when owner (so Message option is visible) */}
                                                            {isOwner && <div role="separator" className="my-1 h-px bg-gray-200 dark:bg-dark-border" />}

                                                            {/* Block */}
                                                            <button
                                                                role="menuitem"
                                                                className="flex items-center gap-4 w-full px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                                onClick={async () => {
                                                                    setOpenMenuId(null);
                                                                    try {
                                                                        await fetch(`${API_URL}/users/block/${participant.handle}`, { method: 'POST', credentials: 'include' });
                                                                        dispatch(showToast({ message: `Blocked @${participant.handle}`, type: 'success' }));
                                                                    } catch {
                                                                        dispatch(showToast({ message: 'Failed to block user', type: 'error' }));
                                                                    }
                                                                }}
                                                            >
                                                                <svg fill="none" viewBox="0 0 24 24" width="20" height="20">
                                                                    <path fill="#E91646" fillRule="evenodd" clipRule="evenodd" d="M12 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM7.5 6.5a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM5.679 19c.709-2.902 3.079-5 6.321-5 .302 0 .595.018.878.053a1 1 0 0 0 .243-1.985A9.235 9.235 0 0 0 12 12c-4.3 0-7.447 2.884-8.304 6.696-.29 1.29.767 2.304 1.902 2.304H12a1 1 0 1 0 0-2H5.679Zm9.614-3.707a1 1 0 0 1 1.414 0L18 16.586l1.293-1.293a1 1 0 0 1 1.414 1.414L19.414 18l1.293 1.293a1 1 0 0 1-1.414 1.414L18 19.414l-1.293 1.293a1 1 0 0 1-1.414-1.414L16.586 18l-1.293-1.293a1 1 0 0 1 0-1.414Z" />
                                                                </svg>
                                                                <span className="text-[13px] font-semibold text-[#E91646]">{t('common.block', 'Block')}</span>
                                                            </button>

                                                            {/* Remove from chat (owner only) */}
                                                            {isOwner && (
                                                                <button
                                                                    role="menuitem"
                                                                    className="flex items-center gap-4 w-full px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                                    onClick={async () => {
                                                                        setOpenMenuId(null);
                                                                        try {
                                                                            const res = await fetch(`${API_URL}/chat/conversations/${conversation.id}/members/${participant.did || participant.id}`, { method: 'DELETE', credentials: 'include' });
                                                                            if (res.ok) {
                                                                                dispatch(showToast({ message: `Removed @${participant.handle} from chat`, type: 'success' }));
                                                                                await dispatch(fetchConversationById(conversation.id));
                                                                            } else {
                                                                                throw new Error();
                                                                            }
                                                                        } catch {
                                                                            dispatch(showToast({ message: 'Failed to remove member', type: 'error' }));
                                                                        }
                                                                    }}
                                                                >
                                                                    <svg fill="none" viewBox="0 0 24 24" width="20" height="20">
                                                                        <path fill="#E91646" fillRule="evenodd" clipRule="evenodd" d="M3.293 3.293A1 1 0 0 1 4 3h7.25a1 1 0 1 1 0 2H5v14h6.25a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1V4a1 1 0 0 1 .293-.707Zm11.5 3.5a1 1 0 0 1 1.414 0l4.5 4.5a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414-1.414L17.586 13H8.75a1 1 0 1 1 0-2h8.836l-2.793-2.793a1 1 0 0 1 0-1.414Z" />
                                                                    </svg>
                                                                    <span className="text-[13px] font-semibold text-[#E91646]">{t('common.remove_from_chat', 'Remove from chat')}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <EditGroupNameModal
                isOpen={isEditNameOpen}
                onClose={() => setIsEditNameOpen(false)}
                conversationId={conversation.id}
                currentName={groupDisplayName}
            />

            <InviteLinkModal
                isOpen={isInviteLinkOpen}
                onClose={() => setIsInviteLinkOpen(false)}
                conversationId={conversation.id}
                participants={conversation.participants}
                convoName={conversation.groupName}
                existingLink={conversation.joinLink}
            />

            <ReportConversationModal
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                conversationId={conversation.id}
                conversationName={groupDisplayName}
            />

            <ConfirmModal
                isOpen={isLockConfirmOpen}
                onClose={() => setIsLockConfirmOpen(false)}
                onConfirm={confirmLock}
                title={t('messages.lock_group_chat', 'Lock group chat?')}
                message={t('messages.lock_group_chat_message', "Members can still read chat history but can't send new messages.")}
                confirmLabel={t('messages.lock_group_chat', 'Lock group chat')}
                variant="primary"
            />

            <ConfirmModal
                isOpen={isLeaveConfirmOpen}
                onClose={() => setIsLeaveConfirmOpen(false)}
                onConfirm={confirmLeave}
                title={t('messages.leave_group', 'Are you sure you want to leave {{name}}?', { name: groupDisplayName })}
                message={t('messages.leave_group_message', "Leaving this chat will lock it permanently and you won't be able to rejoin.")}
                confirmLabel={t('messages.leave_group_chat', 'Leave group chat')}
                variant="danger"
            />
        </>
    );
};

export default GroupChatSettingsPanel;
