import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiInfo, FiGlobe, FiUsers, FiAtSign, FiXCircle, FiCheck, FiChevronDown, FiRepeat, FiUserCheck } from 'react-icons/fi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cn } from '../utils/classNames';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { updateNotificationSettings } from '../redux/slices/authSlice';
import { RootState } from '../redux/store';
import Button from '../components/common/Button';
import axios from 'axios';
import { API_BASE_URL } from '../constants';

interface List {
    id: string;
    name: string;
    description: string;
    avatarUrl?: string;
}

const ModerationInteractionPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const settings = useAppSelector((state: RootState) => state.auth.settings);
    const token = localStorage.getItem('token');

    // Local state
    const [localReply, setLocalReply] = useState<string>('anyone');
    const [localCustomRestrictions, setLocalCustomRestrictions] = useState<string[]>([]);
    const [selectedLists, setSelectedLists] = useState<string[]>([]);
    const [allowQuote, setAllowQuote] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isListsOpen, setIsListsOpen] = useState(false);
    const [myLists, setMyLists] = useState<List[]>([]);

    useEffect(() => {
        if (settings) {
            const restriction = settings.defaultReplyRestriction || 'anyone';
            if (restriction === 'anyone' || restriction === 'nobody') {
                setLocalReply(restriction);
                setLocalCustomRestrictions([]);
                setSelectedLists([]);
            } else {
                setLocalReply('custom');
                setLocalCustomRestrictions(restriction.split(',').filter(r => ['followers', 'following', 'mentioned'].includes(r)));
                const listIds = restriction.split(',').filter(r => r.startsWith('list:'));
                setSelectedLists(listIds.map(l => l.replace('list:', '')));
            }
            setAllowQuote(settings.defaultAllowQuotes ?? true);
        }
        fetchLists();
    }, [settings]);

    const fetchLists = async () => {
        try {
            const resp = await axios.get(`${API_BASE_URL}/Lists/my`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMyLists(resp.data);
        } catch (error) {
            console.error('Failed to fetch lists', error);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        let finalRestriction = localReply;
        if (localReply === 'custom') {
            const parts = [...localCustomRestrictions];
            selectedLists.forEach(id => parts.push(`list:${id}`));
            finalRestriction = parts.join(',') || 'anyone';
        }

        try {
            await dispatch(updateNotificationSettings({
                defaultReplyRestriction: finalRestriction,
                defaultAllowQuotes: allowQuote
            })).unwrap();
        } catch (error) {
            console.error("Failed to save settings", error);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleCustomRestriction = (key: string) => {
        setLocalReply('custom');
        setLocalCustomRestrictions(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const toggleListSelection = (listId: string) => {
        setLocalReply('custom');
        setSelectedLists(prev =>
            prev.includes(listId) ? prev.filter(id => id !== listId) : [...prev, listId]
        );
    };

    const isCustomSelected = (key: string) => localReply === 'custom' && localCustomRestrictions.includes(key);
    const isListSelected = (id: string) => localReply === 'custom' && selectedLists.includes(id);

    useDocumentTitle(t('moderation.interaction_settings'));

    return (
        <div className="min-h-screen border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border p-4 flex items-center gap-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                    >
                        <FiArrowLeft size={20} className="dark:text-dark-text" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {t('moderation.interaction_settings')}
                    </h1>
                </div>

                <div className="p-6 max-w-xl mx-auto space-y-8">
                    {/* Info Banner */}
                    <div className="bg-blue-50 dark:bg-[#001933] border border-blue-200 dark:border-[#0085FF]/30 rounded-2xl p-4 flex gap-3">
                        <FiInfo className="text-blue-500 shrink-0 mt-0.5" size={20} />
                        <p className="text-[15px] text-gray-800 dark:text-blue-100 leading-snug">
                            {t('moderation.interaction_info')}
                        </p>
                    </div>

                    {/* Who can reply section */}
                    <div className="space-y-4">
                        <h2 className="font-bold text-gray-900 dark:text-dark-text text-lg">
                            {t('moderation.who_can_reply')}
                        </h2>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => { setLocalReply('anyone'); setLocalCustomRestrictions([]); setSelectedLists([]); }}
                                className={cn(
                                    "flex items-center gap-3 p-4 rounded-2xl transition-all border-2",
                                    localReply === 'anyone'
                                        ? "bg-blue-50 dark:bg-[#001933] border-blue-500 dark:border-[#0085FF]"
                                        : "bg-white dark:bg-dark-surface border-gray-100 dark:border-transparent hover:border-gray-300 dark:hover:bg-[#202022]"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                    localReply === 'anyone' ? "border-blue-500 bg-blue-500" : "border-gray-400 dark:border-gray-600"
                                )}>
                                    {localReply === 'anyone' && <div className="w-2 h-2 bg-white rounded-full shadow-sm" />}
                                </div>
                                <span className={cn("font-bold text-[16px]", localReply === 'anyone' ? "text-blue-600 dark:text-white" : "text-gray-500 dark:text-gray-400")}>
                                    {t('post.reply_anyone', 'Anyone')}
                                </span>
                            </button>

                            <button
                                onClick={() => { setLocalReply('nobody'); setLocalCustomRestrictions([]); setSelectedLists([]); }}
                                className={cn(
                                    "flex items-center gap-3 p-4 rounded-2xl transition-all border-2",
                                    localReply === 'nobody'
                                        ? "bg-blue-50 dark:bg-[#001933] border-blue-500 dark:border-[#0085FF]"
                                        : "bg-white dark:bg-dark-surface border-gray-100 dark:border-transparent hover:border-gray-300 dark:hover:bg-[#202022]"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                    localReply === 'nobody' ? "border-blue-500 bg-blue-500" : "border-gray-400 dark:border-gray-600"
                                )}>
                                    {localReply === 'nobody' && <div className="w-2 h-2 bg-white rounded-full shadow-sm" />}
                                </div>
                                <span className={cn("font-bold text-[16px]", localReply === 'nobody' ? "text-blue-600 dark:text-white" : "text-gray-500 dark:text-gray-400")}>
                                    {t('post.reply_nobody', 'Nobody')}
                                </span>
                            </button>
                        </div>

                        <div className="space-y-2">
                            {[
                                { id: 'followers', label: t('post.reply_followers', 'Your followers'), icon: <FiUsers size={18} /> },
                                { id: 'following', label: t('post.reply_following', 'People you follow'), icon: <FiUserCheck size={18} /> },
                                { id: 'mentioned', label: t('post.reply_mentioned', 'People you mention'), icon: <FiAtSign size={18} /> },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => toggleCustomRestriction(opt.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-4 rounded-2xl transition-all border-2",
                                        isCustomSelected(opt.id)
                                            ? "bg-blue-50 dark:bg-[#001933] border-blue-500 dark:border-[#0085FF]"
                                            : "bg-white dark:bg-dark-surface border-gray-100 dark:border-transparent hover:border-gray-300 dark:hover:bg-[#202022]"
                                    )}
                                >
                                    <div className={cn(
                                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                        isCustomSelected(opt.id) ? "bg-blue-500 border-blue-500" : "border-gray-400 dark:border-gray-600"
                                    )}>
                                        {isCustomSelected(opt.id) && <FiCheck className="text-white" size={14} strokeWidth={4} />}
                                    </div>
                                    <span className={cn("font-bold text-[16px]", isCustomSelected(opt.id) ? "text-blue-600 dark:text-white" : "text-gray-500 dark:text-gray-400")}>
                                        {opt.label}
                                    </span>
                                </button>
                            ))}

                            <div className="space-y-2">
                                <button
                                    onClick={() => setIsListsOpen(!isListsOpen)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-4 rounded-2xl transition-all border-2",
                                        selectedLists.length > 0
                                            ? "bg-blue-50 dark:bg-[#001933] border-blue-500 dark:border-[#0085FF]"
                                            : "bg-white dark:bg-dark-surface border-gray-100 dark:border-transparent hover:border-gray-300 dark:hover:bg-[#202022]"
                                    )}
                                >
                                    <span className={cn("font-bold text-[16px]", selectedLists.length > 0 ? "text-blue-600 dark:text-white" : "text-gray-500 dark:text-gray-400")}>
                                        {t('post.select_from_lists', 'Select from your lists')}
                                    </span>
                                    <FiChevronDown className={cn("text-gray-400 transition-transform", isListsOpen && "rotate-180")} size={20} />
                                </button>

                                {isListsOpen && (
                                    <div className="px-2 py-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                        {myLists.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-gray-500 italic">
                                                {t('post.no_lists', "You haven't created any lists yet.")}
                                            </div>
                                        ) : (
                                            myLists.map(list => (
                                                <button
                                                    key={list.id}
                                                    onClick={() => toggleListSelection(list.id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                                                        isListSelected(list.id) ? "bg-blue-500/10" : "hover:bg-gray-100 dark:hover:bg-[#161618]"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                                        isListSelected(list.id) ? "bg-blue-500 border-blue-500" : "border-gray-400 dark:border-gray-600"
                                                    )}>
                                                        {isListSelected(list.id) && <FiCheck className="text-white" size={12} strokeWidth={4} />}
                                                    </div>
                                                    <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white shrink-0">
                                                        <FiUsers size={16} />
                                                    </div>
                                                    <span className={cn("font-bold text-[15px] truncate text-left", isListSelected(list.id) ? "text-blue-600 dark:text-white" : "text-gray-600 dark:text-gray-400")}>
                                                        {list.name}
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                        </div>
                    </div>
                </div>

                    {/* Allow Quotes Section */}
                    <div className="space-y-4">
                        <h2 className="font-bold text-gray-900 dark:text-dark-text text-lg">
                            {t('moderation.quote_posts')}
                        </h2>
                        <button
                            onClick={() => setAllowQuote(!allowQuote)}
                            className="w-full flex items-center justify-between p-5 rounded-3xl bg-blue-50/30 dark:bg-[#001933] border border-blue-200 dark:border-[#0085FF]/30 transition-all hover:bg-blue-50 dark:hover:bg-[#002850]"
                        >
                            <div className="flex items-center gap-4 text-left">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <FiRepeat className="text-blue-500" size={22} />
                                </div>
                                <div>
                                    <span className="font-bold text-[16px] text-gray-900 dark:text-white block mb-0.5">
                                        {t('post.allow_quotes', 'Allow quote posts')}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        Other users can quote and react to your posts
                                    </span>
                                </div>
                            </div>
                            <div className={cn(
                                "w-14 h-8 rounded-full transition-colors relative flex items-center px-1 shrink-0",
                                allowQuote ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                            )}>
                                <div className={cn(
                                    "w-6 h-6 bg-white rounded-full transition-transform shadow-lg",
                                    allowQuote ? "translate-x-6" : "translate-x-0"
                                )} />
                            </div>
                        </button>
                    </div>

                    {/* Save Button */}
                    <div className="pt-4">
                        <Button
                            variant="primary"
                            fullWidth
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold py-4 text-[17px] shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {isSaving ? t('common.saving') : t('moderation.save')}
                        </Button>
                    </div>
                </div>
            </div>
    );
};

export default ModerationInteractionPage;
