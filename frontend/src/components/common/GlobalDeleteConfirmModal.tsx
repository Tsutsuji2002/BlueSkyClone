import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { closeDeleteConfirm } from '../../redux/slices/modalsSlice';
import { deletePost } from '../../redux/slices/postsSlice';
import { showToast } from '../../redux/slices/toastSlice';
import ConfirmModal from './ConfirmModal';

const GlobalDeleteConfirmModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const deleteConfirm = useAppSelector((state: any) => state.modals.deleteConfirm);

    if (!deleteConfirm) return null;

    const { isOpen, postUri, isListRemoval, onConfirm } = deleteConfirm;

    const handleConfirm = async () => {
        if (isListRemoval && onConfirm) {
            onConfirm();
        } else if (postUri) {
            try {
                await dispatch(deletePost(postUri)).unwrap();
                dispatch(showToast({ message: t('common.post_deleted'), type: 'success' }));
            } catch (error: any) {
                dispatch(showToast({ message: error || t('common.failed_to_delete'), type: 'error' }));
            }
        }
        dispatch(closeDeleteConfirm());
    };

    if (isListRemoval) {
        return (
            <ConfirmModal
                isOpen={isOpen}
                onClose={() => dispatch(closeDeleteConfirm())}
                onConfirm={handleConfirm}
                title={t('lists.remove_from_list')}
                message={t('lists.confirm_remove_post', 'Remove this post from the list?')}
                variant="danger"
            />
        );
    }

    return (
        <ConfirmModal
            isOpen={isOpen}
            onClose={() => dispatch(closeDeleteConfirm())}
            onConfirm={handleConfirm}
            title={t('common.delete_post_confirm_title', { defaultValue: 'Delete post?' })}
            message={t('common.delete_post_confirm_message', { defaultValue: 'This cannot be undone. The post will be removed from your profile, the timeline of any accounts that follow you, and from search results.' })}
            confirmLabel={t('common.delete', { defaultValue: 'Delete' })}
            variant="danger"
        />
    );
};

export default GlobalDeleteConfirmModal;
