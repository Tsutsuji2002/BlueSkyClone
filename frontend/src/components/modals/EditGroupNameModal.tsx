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
    const [groupName, setGroupName] = useState(currentName || '');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setGroupName(currentName || '');
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

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" 
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-dark-surface rounded-[36px] shadow-xl w-full max-w-[320px] border border-gray-300 dark:border-dark-border" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    {/* Title */}
                    <div className="pb-2">
                        <h2 className="text-[20.6px] font-semibold text-gray-900 dark:text-dark-text leading-[27px] pb-1">
                            {t('messages.edit_group_name', 'Edit group name')}
                        </h2>
                        
                        {/* Input wrapper */}
                        <div className="mt-2 mb-2">
                            <div className="relative flex items-center w-full px-3">
                                {/* Background */}
                                <div className="absolute inset-0 bg-gray-100 dark:bg-dark-surface rounded-[10px] border border-transparent" />
                                
                                {/* Input */}
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={t('messages.group_name', 'Group name')}
                                    className="relative z-20 flex-1 text-[15px] text-gray-900 dark:text-dark-text py-[11px] px-1 leading-[18px] min-w-0 bg-transparent border-none outline-none placeholder-gray-500 dark:placeholder-gray-400"
                                    maxLength={100}
                                    autoFocus
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="w-full flex flex-col gap-2 justify-end">
                        <button
                            onClick={handleSave}
                            disabled={isLoading || !groupName.trim()}
                            className="flex items-center justify-center bg-primary rounded-full px-6 py-3 gap-1.5 hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="text-[15px] text-white leading-5 text-center font-medium">
                                {isLoading ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
                            </span>
                        </button>
                        
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex items-center justify-center bg-gray-100 dark:bg-dark-surface rounded-full px-6 py-3 gap-1.5 hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
                        >
                            <span className="text-[15px] text-gray-700 dark:text-gray-400 leading-5 text-center font-medium">
                                {t('common.cancel', 'Cancel')}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditGroupNameModal;
