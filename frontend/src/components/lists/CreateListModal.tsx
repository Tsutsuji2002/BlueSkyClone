import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FiCamera, FiX } from 'react-icons/fi';
import { uploadImage } from '../../services/mediaService';
import { CreateListDto, ListDto } from '../../types';

interface CreateListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateListDto) => Promise<void>;
    initialData?: ListDto | null;
    isEditing?: boolean;
}

const CreateListModal: React.FC<CreateListModalProps> = ({ isOpen, onClose, onSubmit, initialData, isEditing }) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialData && isEditing) {
                setName(initialData.name);
                setDescription(initialData.description || '');
                setPreview(initialData.avatarUrl || null);
            } else {
                setName('');
                setDescription('');
                setPreview(null);
                setImage(null);
            }
        }
    }, [isOpen, initialData, isEditing]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let avatarUrl = initialData?.avatarUrl;
            if (image) {
                avatarUrl = await uploadImage(image, 'lists');
            }

            await onSubmit({
                name,
                description,
                avatar: avatarUrl || undefined,
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-dark-elem w-full max-w-md rounded-xl shadow-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        {t('lists.cancel')}
                    </button>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text">
                        {isEditing ? t('lists.edit_title') : t('lists.create_title')}
                    </h2>
                    <button
                        onClick={handleSubmit}
                        disabled={!name.trim() || loading}
                        className="text-primary-500 font-bold hover:text-primary-600 disabled:opacity-50"
                    >
                        {loading ? '...' : t('lists.save')}
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('lists.list_avatar')}
                        </label>
                        <div
                            className="relative w-20 h-20 rounded-xl bg-blue-500 flex items-center justify-center cursor-pointer group overflow-hidden"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {preview ? (
                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <FiCamera size={24} className="text-white" />
                            )}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <FiCamera size={24} className="text-white" />
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('lists.list_name')}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('lists.list_name_placeholder')}
                            className="w-full p-3 bg-gray-100 dark:bg-dark-bg rounded-lg border-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('lists.list_description')}
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('lists.list_description_placeholder')}
                            rows={3}
                            className="w-full p-3 bg-gray-100 dark:bg-dark-bg rounded-lg border-none focus:ring-2 focus:ring-primary-500 dark:text-white resize-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateListModal;
