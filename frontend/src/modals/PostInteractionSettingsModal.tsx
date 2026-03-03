import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiCheck, FiUsers, FiUserCheck, FiAtSign, FiMessageSquare, FiRepeat } from 'react-icons/fi';
import Button from '../components/common/Button';
import { cn } from '../utils/classNames';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { updateNotificationSettings } from '../redux/slices/authSlice';

interface PostInteractionSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    replyRestriction: string;
    setReplyRestriction: (val: string) => void;
    allowQuotes: boolean;
    setAllowQuotes: (val: boolean) => void;
}

const PostInteractionSettingsModal: React.FC<PostInteractionSettingsModalProps> = ({
    isOpen,
    onClose,
    replyRestriction,
    setReplyRestriction,
    allowQuotes,
    setAllowQuotes
}) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const authSettings = useAppSelector((state) => state.auth.settings);

    const [localReply, setLocalReply] = useState(replyRestriction);
    const [localQuotes, setLocalQuotes] = useState(allowQuotes);
    const [saveForNextTime, setSaveForNextTime] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLocalReply(replyRestriction);
            setLocalQuotes(allowQuotes);
            setSaveForNextTime(false);
        }
    }, [isOpen, replyRestriction, allowQuotes]);

    if (!isOpen) return null;

    const hasChangesFromDefaults = authSettings && (
        localReply !== authSettings.defaultReplyRestriction ||
        localQuotes !== authSettings.defaultAllowQuotes
    );

    const handleSave = async () => {
        setReplyRestriction(localReply);
        setAllowQuotes(localQuotes);

        if (saveForNextTime) {
            await dispatch(updateNotificationSettings({
                defaultReplyRestriction: localReply,
                defaultAllowQuotes: localQuotes
            }));
        }

        onClose();
    };

    const replyOptions = [
        { id: 'anyone', icon: <FiMessageSquare size={20} />, label: t('post.reply_anyone', 'Everyone') },
        { id: 'nobody', icon: <FiX size={20} />, label: t('post.reply_nobody', 'Nobody') },
        { id: 'following', icon: <FiUserCheck size={20} />, label: t('post.reply_following', 'People you follow') },
        { id: 'followers', icon: <FiUsers size={20} />, label: t('post.reply_followers', 'Followers') },
        { id: 'mentioned', icon: <FiAtSign size={20} />, label: t('post.reply_mentioned', 'People you mention') },
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-dark-surface rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-dark-border">
                    <h2 className="text-xl font-bold dark:text-dark-text">{t('post.interaction_settings', 'Interaction settings')}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full transition-colors">
                        <FiX size={24} className="text-gray-600 dark:text-dark-text-secondary" />
                    </button>
                </div>

                <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh]">
                    {/* Who can reply */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                            {t('post.who_can_reply', 'Who can reply')}
                        </h3>
                        <div className="space-y-2">
                            {replyOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setLocalReply(opt.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-4 rounded-2xl transition-all border-2",
                                        localReply === opt.id
                                            ? "border-primary-500 bg-primary-500/5"
                                            : "border-transparent hover:bg-gray-50 dark:hover:bg-dark-hover"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "p-2 rounded-xl",
                                            localReply === opt.id ? "text-primary-500 bg-white dark:bg-dark-surface shadow-sm" : "bg-gray-100 dark:bg-dark-bg text-gray-500 dark:text-dark-text-secondary"
                                        )}>
                                            {opt.icon}
                                        </div>
                                        <span className={cn(
                                            "font-semibold",
                                            localReply === opt.id ? "text-primary-500" : "text-gray-900 dark:text-dark-text"
                                        )}>
                                            {opt.label}
                                        </span>
                                    </div>
                                    {localReply === opt.id && <FiCheck size={20} className="text-primary-500" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Allow Quotes */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                            {t('post.interaction_options', 'Options')}
                        </h3>
                        <div
                            onClick={() => setLocalQuotes(!localQuotes)}
                            className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-dark-bg cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white dark:bg-dark-surface rounded-xl shadow-sm text-gray-700 dark:text-dark-text">
                                    <FiRepeat size={20} />
                                </div>
                                <span className="font-semibold dark:text-dark-text">{t('post.allow_quotes', 'Allow quote posts')}</span>
                            </div>
                            <div className={cn(
                                "w-12 h-6 rounded-full transition-colors relative",
                                localQuotes ? "bg-primary-500" : "bg-gray-300 dark:bg-dark-border"
                            )}>
                                <div className={cn(
                                    "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                                    localQuotes ? "translate-x-6" : "translate-x-0"
                                )} />
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary leading-relaxed">
                        {t('post.interaction_help', 'Control who can reply to your post. These settings will not affect mentions or other interaction types.')}
                    </p>

                    {hasChangesFromDefaults && (
                        <div className="pt-4 border-t border-gray-100 dark:border-dark-border">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={saveForNextTime}
                                        onChange={(e) => setSaveForNextTime(e.target.checked)}
                                    />
                                    <div className={cn(
                                        "w-5 h-5 rounded border-2 transition-all flex items-center justify-center",
                                        saveForNextTime
                                            ? "bg-primary-500 border-primary-500"
                                            : "border-gray-300 dark:border-dark-border group-hover:border-primary-500"
                                    )}>
                                        {saveForNextTime && <FiCheck size={14} className="text-white" />}
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-gray-700 dark:text-dark-text">
                                    {t('post.save_defaults', 'Save these options for next time')}
                                </span>
                            </label>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-dark-bg border-t border-gray-100 dark:border-dark-border">
                    <Button
                        variant="primary"
                        fullWidth
                        onClick={handleSave}
                        className="rounded-2xl font-bold py-3"
                    >
                        {t('common.done', 'Done')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PostInteractionSettingsModal;
