import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { showToast } from '../../redux/slices/toastSlice';

const API_URL = process.env.REACT_APP_API_URL || '/api';

interface EditGroupNameModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: string;
    currentName: string;
}

const EditGroupNameModal: React.FC<EditGroupNameModalProps> = ({
    isOpen,
    onClose,
    conversationId,
    currentName
}) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [groupName, setGroupName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setGroupName(currentName);
        }
    }, [isOpen, currentName]);

    const handleSave = async () => {
        if (!groupName.trim()) {
            dispatch(showToast({ 
                message: t('messages.group_name_required', 'Group name is required'), 
                type: 'error' 
            }));
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/chat/conversations/${conversationId}/name`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: groupName.trim() })
            });

            if (!response.ok) {
                throw new Error('Failed to update group name');
            }

            dispatch(showToast({ 
                message: t('messages.group_name_updated', 'Group name updated'), 
                type: 'success' 
            }));
            onClose();
            
            // Refresh to update UI
            window.location.reload();
        } catch (error) {
            console.error('Error updating group name:', error);
            dispatch(showToast({ 
                message: t('messages.group_name_update_failed', 'Failed to update group name'), 
                type: 'error' 
            }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (groupName.trim()) {
                handleSave();
            }
        }
    };

    if (!isOpen) return null;

    const hasContent = groupName.trim().length > 0;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" 
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                        {t('messages.edit_group_name', 'Edit group name')}
                    </h2>
                </div>

                {/* Input */}
                <div className="px-6 py-4">
                    <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('messages.enter_group_name', 'Enter group name')}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                        maxLength={100}
                        autoFocus
                        disabled={isLoading}
                    />
                </div>

                {/* Footer with dynamic button */}
                <div className="px-6 py-4">
                    {hasContent ? (
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="w-full py-2.5 rounded-full font-semibold text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            {isLoading ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="w-full py-2.5 rounded-full font-semibold text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors text-sm"
                        >
                            {t('common.cancel', 'Cancel')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditGroupNameModal;
