import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiMessageSquare, FiCheck } from 'react-icons/fi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import LoadingScreen from '../components/common/LoadingScreen';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchChatSettings, updateChatSettings } from '../redux/slices/messagesSlice';

const ChatSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [allowIncoming, setAllowIncoming] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useDocumentTitle(t('chat_settings.title'));

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const result = await dispatch(fetchChatSettings()).unwrap();
                setAllowIncoming(result || 'all');
            } catch (error) {
                console.error('Failed to fetch chat settings:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, [dispatch]);

    const handleUpdateSettings = async (value: string) => {
        if (isSaving || value === allowIncoming) return;
        
        setIsSaving(true);
        // Optimistic update
        const previousValue = allowIncoming;
        setAllowIncoming(value);

        try {
            await dispatch(updateChatSettings(value)).unwrap();
        } catch (error) {
            console.error('Failed to update chat settings:', error);
            setAllowIncoming(previousValue);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <LoadingScreen />;
    }

    const options = [
        { id: 'all', label: t('chat_settings.everyone') },
        { id: 'following', label: t('chat_settings.followers') },
        { id: 'none', label: t('chat_settings.none') }
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border px-4 py-3 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                >
                    <FiArrowLeft size={20} className="dark:text-dark-text" />
                </button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                    {t('chat_settings.title')}
                </h1>
            </div>

            <div className="flex flex-col p-4">
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <FiMessageSquare size={22} className="text-gray-900 dark:text-dark-text opacity-80" />
                        <h2 className="text-[17px] font-bold text-gray-900 dark:text-dark-text">
                            {t('chat_settings.allow_messages_from')}
                        </h2>
                    </div>
                    <p className="text-[14px] text-gray-500 dark:text-dark-text-secondary leading-relaxed">
                        {t('chat_settings.allow_messages_from_desc')}
                    </p>
                </div>

                <div className="space-y-2">
                    {options.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => handleUpdateSettings(option.id)}
                            disabled={isSaving}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                                allowIncoming === option.id
                                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                                    : 'border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/50'
                            }`}
                        >
                            <span className={`text-[15px] font-medium ${
                                allowIncoming === option.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-dark-text'
                            }`}>
                                {option.label}
                            </span>
                            {allowIncoming === option.id && (
                                <FiCheck size={20} className="text-blue-500" />
                            )}
                        </button>
                    ))}
                </div>

                {isSaving && (
                    <div className="mt-4 text-center">
                        <span className="text-sm text-gray-500 dark:text-dark-text-secondary animate-pulse">
                            {t('common.saving', 'Saving...')}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatSettingsPage;
