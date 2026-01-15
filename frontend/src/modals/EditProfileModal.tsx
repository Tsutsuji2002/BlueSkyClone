import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCamera } from 'react-icons/fi';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { closeEditProfile } from '../redux/slices/modalsSlice';
import { updateUserProfile } from '../redux/slices/authSlice';
import { updateProfileLocal } from '../redux/slices/userSlice';
import { useTranslation } from 'react-i18next';
import Dropdown from '../components/common/Dropdown';
import { API_BASE_URL, AVATAR_PLACEHOLDER, COVER_PLACEHOLDER } from '../constants';
import { RootState } from '../redux/store';

const EditProfileModal: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { createPost: _, editProfile } = useAppSelector((state: RootState) => state.modals);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);

    const [displayName, setDisplayName] = useState('');
    const [description, setDescription] = useState('');
    const [coverImage, setCoverImage] = useState('');
    const [avatarImage, setAvatarImage] = useState('');
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [removeCover, setRemoveCover] = useState(false);
    const [removeAvatar, setRemoveAvatar] = useState(false);

    useEffect(() => {
        if (editProfile && currentUser) {
            setDisplayName(currentUser.displayName || '');
            setDescription(currentUser.bio || '');
            setAvatarImage(currentUser.avatarUrl || currentUser.avatar || '');
            setCoverImage(currentUser.coverImage || '');
            setRemoveCover(false);
            setRemoveAvatar(false);
            setCoverFile(null);
            setAvatarFile(null);
        }
    }, [currentUser, editProfile]);

    const coverInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'avatar') => {
        const file = event.target.files?.[0];
        if (file) {
            if (type === 'cover') setCoverFile(file);
            if (type === 'avatar') setAvatarFile(file);

            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'cover') setCoverImage(reader.result as string);
                if (type === 'avatar') setAvatarImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveCover = () => {
        setCoverImage('');
        setCoverFile(null);
        setRemoveCover(true);
    };

    const handleRemoveAvatar = () => {
        setAvatarImage('');
        setAvatarFile(null);
        setRemoveAvatar(true);
    };

    const handleSave = async () => {
        const formData = new FormData();
        formData.append('DisplayName', displayName);
        formData.append('Bio', description);

        if (avatarFile) {
            formData.append('Avatar', avatarFile);
        } else if (removeAvatar) {
            formData.append('RemoveAvatar', 'true');
        }

        if (coverFile) {
            formData.append('CoverImage', coverFile);
        } else if (removeCover) {
            formData.append('RemoveCoverImage', 'true');
        }

        try {
            const updatedUser = await dispatch(updateUserProfile(formData)).unwrap();
            // Also update the viewing profile if it's the same user
            dispatch(updateProfileLocal(updatedUser));
            dispatch(closeEditProfile());
        } catch (error) {
            console.error('Failed to update profile:', error);
        }
    };

    if (!editProfile) return null;

    const getFullUrl = (url: string, placeholder: string) => {
        const target = url || placeholder;
        if (!target) return '';
        if (target.startsWith('data:') || target.startsWith('http')) return target;
        const base = API_BASE_URL.replace('/api', '');
        return `${base}${target.startsWith('/') ? '' : '/'}${target}`;
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <input
                type="file"
                ref={coverInputRef}
                className="absolute w-0 h-0 opacity-0 pointer-events-none"
                accept="image/*"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileChange(e, 'cover')}
            />
            <input
                type="file"
                ref={avatarInputRef}
                className="absolute w-0 h-0 opacity-0 pointer-events-none"
                accept="image/*"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileChange(e, 'avatar')}
            />

            <div className="bg-white dark:bg-dark-bg w-full max-w-[600px] rounded-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-dark-border">
                    <button
                        onClick={() => dispatch(closeEditProfile())}
                        className="text-gray-900 dark:text-dark-text font-bold hover:opacity-70 transition-opacity px-2 py-1"
                    >
                        {t('common.cancel')}
                    </button>
                    <h2 className="text-[17px] font-black text-gray-900 dark:text-dark-text">
                        {t('profile.edit_profile_title')}
                    </h2>
                    <button
                        // The provided snippet for `tabs.map` is syntactically incorrect for a button prop.
                        // Assuming the intent was to keep the original onClick and the `tabs.map` was a misplaced
                        // attempt to add type information or was intended for a different part of the code.
                        // Reverting to the original `onClick` to maintain functionality and valid syntax.
                        onClick={() => {
                            void handleSave();
                        }}
                        className="bg-primary-500 text-white rounded-full px-4 py-1.5 font-bold hover:bg-primary-600 transition-colors"
                    >
                        {t('settings.save')}
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 pb-10">
                    <div className="relative h-36 sm:h-44 bg-gray-200 dark:bg-dark-surface group">
                        <img
                            src={getFullUrl(coverImage, COVER_PLACEHOLDER)}
                            alt="Cover"
                            className="w-full h-full object-cover transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Dropdown
                                trigger={
                                    <div className="bg-black/40 p-3 rounded-full text-white backdrop-blur-sm cursor-pointer hover:bg-black/50 transition-colors">
                                        <FiCamera size={24} />
                                    </div>
                                }
                                items={[
                                    { id: 'upload_cover', label: t('profile.upload_from_files'), icon: <FiCamera size={18} />, onClick: () => coverInputRef.current?.click(), hasDivider: true },
                                    { id: 'remove_cover', label: t('profile.remove_cover'), icon: <FiX size={18} />, onClick: handleRemoveCover, danger: true },
                                ]}
                                align="center" // Changed to center alignment if supported or fallback to right/left
                                className="z-50"
                            />
                        </div>
                    </div>

                    <div className="px-5 relative mb-2">
                        <div className="absolute -top-14 sm:-top-16 left-4 rounded-full w-[100px] h-[100px] bg-white dark:bg-dark-bg p-[3px]">
                            <div className="w-full h-full relative bg-gray-100 dark:bg-dark-surface rounded-full overflow-hidden group">
                                <img
                                    src={getFullUrl(avatarImage, AVATAR_PLACEHOLDER)}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <Dropdown
                                        trigger={
                                            <div className="bg-black/40 p-2 rounded-full text-white backdrop-blur-sm cursor-pointer hover:bg-black/50 transition-colors">
                                                <FiCamera size={20} />
                                            </div>
                                        }
                                        items={[
                                            { id: 'upload_avatar', label: t('profile.upload_from_files'), icon: <FiCamera size={18} />, onClick: () => avatarInputRef.current?.click(), hasDivider: true },
                                            { id: 'remove_avatar', label: t('profile.remove_photo'), icon: <FiX size={18} />, onClick: handleRemoveAvatar, danger: true },
                                        ]}
                                        align="left"
                                        className="z-50"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-5 pt-12 sm:pt-14 space-y-6">
                        <div>
                            <label className="block text-[13px] font-bold text-gray-500 dark:text-dark-text-secondary mb-[6px]">
                                {t('profile.display_name')}
                            </label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-gray-900 dark:text-dark-text text-[15px] transition-all"
                                placeholder={t('profile.display_name')}
                            />
                        </div>

                        <div>
                            <label className="block text-[13px] font-bold text-gray-500 dark:text-dark-text-secondary mb-[6px]">
                                {t('profile.description')}
                            </label>
                            <textarea
                                value={description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none text-gray-900 dark:text-dark-text text-[15px] transition-all min-h-[120px] resize-none"
                                placeholder={t('profile.description')}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EditProfileModal;
