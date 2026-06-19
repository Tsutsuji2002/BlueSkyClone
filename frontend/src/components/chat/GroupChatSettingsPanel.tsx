import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiBell, FiBellOff, FiEdit3, FiLink, FiLock, FiUnlock, FiLogOut } from 'react-icons/fi';
import GroupAvatar from '../messages/GroupAvatar';
import Avatar from '../common/Avatar';
import { Conversation, User } from '../../types';
import { format } from 'date-fns';
import EditGroupNameModal from '../modals/EditGroupNameModal';
import InviteLinkModal from '../modals/InviteLinkModal';
import ConfirmModal from '../common/ConfirmModal';

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
    const [isEditNameOpen, setIsEditNameOpen] = useState(false);
    const [isInviteLinkOpen, setIsInviteLinkOpen] = useState(false);
    const [isLockConfirmOpen, setIsLockConfirmOpen] = useState(false);
    const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

    const otherParticipants = conversation.participants.filter(p => 
        (p.did && currentUser?.did) ? p.did !== currentUser.did : (p.id !== currentUser?.id && p.handle !== currentUser?.handle)
    );

    const groupDisplayName = conversation.groupName || 
        otherParticipants.map(p => p.handle ? `@${p.handle}` : (p.displayName || p.did)).join(', ');

    const createdDate = conversation.createdAt ? format(new Date(conversation.createdAt), 'MMMM d, yyyy') : '';

    const handleMuteClick = () => {
        setIsMuted(!isMuted);
        onMuteToggle();
    };

    const handleLockClick = () => {
        if (!isLocked) {
            setIsLockConfirmOpen(true);
        } else {
            setIsLocked(false);
            onLockToggle(false);
        }
    };

    const confirmLock = () => {
        setIsLocked(true);
        onLockToggle(true);
        setIsLockConfirmOpen(false);
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
                            {/* Mute Button */}
                            <div className="flex flex-col items-center">
                                <button
                                    onClick={handleMuteClick}
                                    className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
                                    aria-label={isMuted ? t('messages.unmute') : t('messages.mute')}
                                >
                                    {isMuted ? <FiBellOff size={20} /> : <FiBell size={20} />}
                                </button>
                                <span className="text-xs font-medium mt-1 text-gray-900 dark:text-dark-text">
                                    {t('messages.mute', 'Mute')}
                                </span>
                            </div>

                            {/* Edit Name Button */}
                            <div className="flex flex-col items-center">
                                <button
                                    onClick={() => setIsEditNameOpen(true)}
                                    className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
                                    aria-label={t('messages.edit_name')}
                                >
                                    <FiEdit3 size={20} />
                                </button>
                                <span className="text-xs font-medium mt-1 text-gray-900 dark:text-dark-text">
                                    {t('messages.edit_name', 'Edit name')}
                                </span>
                            </div>

                            {/* Invite Link Button */}
                            <div className="flex flex-col items-center">
                                <button
                                    onClick={() => setIsInviteLinkOpen(true)}
                                    className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
                                    aria-label={t('messages.invite_link')}
                                >
                                    <FiLink size={20} />
                                </button>
                                <span className="text-xs font-medium mt-1 text-gray-900 dark:text-dark-text">
                                    {t('messages.invite_link', 'Invite link')}
                                </span>
                            </div>

                            {/* Lock Button */}
                            <div className="flex flex-col items-center">
                                <button
                                    onClick={handleLockClick}
                                    className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
                                    aria-label={isLocked ? t('messages.unlock') : t('messages.lock')}
                                >
                                    {isLocked ? <FiUnlock size={20} /> : <FiLock size={20} />}
                                </button>
                                <span className="text-xs font-medium mt-1 text-gray-900 dark:text-dark-text">
                                    {t('messages.lock', 'Lock')}
                                </span>
                            </div>

                            {/* Leave Button */}
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

                                return (
                                    <div
                                        key={participant.did || participant.id}
                                        className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <Avatar
                                                src={participant.avatarUrl || participant.avatar}
                                                alt={participant.displayName || participant.handle}
                                                size="md"
                                            />
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="font-semibold text-gray-900 dark:text-dark-text truncate">
                                                    {participant.displayName || participant.handle}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                                                    @{participant.handle}
                                                </span>
                                                {!isCurrentUser && (
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
                                            {!isCurrentUser && !participant.isFollowing && (
                                                <button className="text-sm font-medium text-primary hover:underline">
                                                    {t('common.follow', 'Follow')}
                                                </button>
                                            )}
                                            {!isCurrentUser && (
                                                <button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-surface transition-colors">
                                                    <svg className="w-5 h-5 text-gray-500 dark:text-dark-text-secondary" fill="currentColor" viewBox="0 0 24 24">
                                                        <path fillRule="evenodd" d="M2 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm16 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm-6-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
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
                currentName={conversation.groupName || ''}
            />

            <InviteLinkModal
                isOpen={isInviteLinkOpen}
                onClose={() => setIsInviteLinkOpen(false)}
                conversationId={conversation.id}
                participants={conversation.participants}
                convoName={conversation.groupName}
                existingLink={conversation.joinLink}
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
