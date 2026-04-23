import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiInfo } from 'react-icons/fi';
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
        console.log('handleUpdateSettings called with:', value, 'current:', allowIncoming, 'isSaving:', isSaving);
        if (isSaving || value === allowIncoming) return;
        
        setIsSaving(true);
        // Optimistic update
        const previousValue = allowIncoming;
        setAllowIncoming(value);

        try {
            console.log('Dispatching updateChatSettings...');
            await dispatch(updateChatSettings(value)).unwrap();
            console.log('Update successful');
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
        <div className="min-h-screen bg-white dark:bg-black border-r border-gray-200 dark:border-dark-border">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border px-4 py-3 flex items-center gap-4">
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

            <div className="p-4 space-y-6">
                <div>
                    <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white mb-4">
                        {t('chat_settings.allow_messages_from')}
                    </h2>
                    
                    <div className="space-y-1">
                        {options.map((option) => (
                            <div
                                key={option.id}
                                onClick={() => {
                                    console.log('Option clicked:', option.id);
                                    handleUpdateSettings(option.id);
                                }}
                                className={`w-full flex items-center justify-between py-3 group cursor-pointer ${
                                    isSaving ? 'opacity-50 pointer-events-none' : ''
                                }`}
                            >
                                <span className="text-[15px] font-semibold text-gray-800 dark:text-[#dce2ea] group-hover:opacity-80 transition-opacity">
                                    {option.label}
                                </span>
                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-200 ${
                                    allowIncoming === option.id 
                                        ? 'bg-blue-600 border-blue-600' 
                                        : 'bg-transparent border-gray-300 dark:border-[#232e3e] dark:bg-[#111822]'
                                }`}>
                                    {allowIncoming === option.id && (
                                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Info Alert Box */}
                <div className="p-4 rounded-xl border border-blue-500 bg-black flex gap-3 items-start">
                    <FiInfo size={20} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-[13px] text-white leading-relaxed">
                            {t('chat_settings.allow_ongoing_desc')}
                        </p>
                    </div>
                </div>

                {isSaving && (
                    <div className="text-center pt-2">
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
