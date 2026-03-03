import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiCheck, FiUsers, FiUserCheck, FiAtSign, FiMessageSquare, FiRepeat, FiChevronDown, FiList } from 'react-icons/fi';
import Button from '../components/common/Button';
import { cn } from '../utils/classNames';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { updateNotificationSettings } from '../redux/slices/authSlice';
import axios from 'axios';
import { API_BASE_URL } from '../constants';

interface List {
    id: string;
    name: string;
    description: string;
    avatarUrl?: string;
}

interface PostInteractionSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    replyRestriction: string;
    setReplyRestriction: (val: string) => void;
    allowQuotes: boolean;
    setAllowQuotes: (val: boolean) => void;
    postId?: string; // Optional: if provided, will update the post on the backend
}

const PostInteractionSettingsModal: React.FC<PostInteractionSettingsModalProps> = ({
    isOpen,
    onClose,
    replyRestriction,
    setReplyRestriction,
    allowQuotes,
    setAllowQuotes,
    postId
}) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const authSettings = useAppSelector((state) => state.auth.settings);
    const token = localStorage.getItem('token');

    const [localReply, setLocalReply] = useState(replyRestriction);
    const [localQuotes, setLocalQuotes] = useState(allowQuotes);
    const [saveForNextTime, setSaveForNextTime] = useState(false);
    const [isListsOpen, setIsListsOpen] = useState(false);
    const [myLists, setMyLists] = useState<List[]>([]);
    const [selectedLists, setSelectedLists] = useState<string[]>([]);
    const [localCustomRestrictions, setLocalCustomRestrictions] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            // Parse existing restriction
            if (replyRestriction === 'anyone' || replyRestriction === 'nobody') {
                setLocalReply(replyRestriction);
                setLocalCustomRestrictions([]);
            } else {
                setLocalReply('custom');
                setLocalCustomRestrictions(replyRestriction.split(',').filter(r => ['followers', 'following', 'mentioned'].includes(r)));
                const listIds = replyRestriction.split(',').filter(r => r.startsWith('list:'));
                setSelectedLists(listIds.map(l => l.replace('list:', '')));
            }
            setLocalQuotes(allowQuotes);
            setSaveForNextTime(false);
            fetchLists();
        }
    }, [isOpen, replyRestriction, allowQuotes]);

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

    if (!isOpen) return null;

    const handleSave = async () => {
        let finalRestriction = localReply;
        if (localReply === 'custom') {
            const parts = [...localCustomRestrictions];
            selectedLists.forEach(id => parts.push(`list:${id}`));
            finalRestriction = parts.join(',') || 'anyone';
        }

        if (postId) {
            try {
                await axios.post(`${API_BASE_URL}/posts/${postId}/interaction-settings`, {
                    replyRestriction: finalRestriction,
                    allowQuotes: localQuotes
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                console.error('Failed to update post interaction settings', error);
            }
        }

        setReplyRestriction(finalRestriction);
        setAllowQuotes(localQuotes);

        if (saveForNextTime) {
            await dispatch(updateNotificationSettings({
                defaultReplyRestriction: finalRestriction,
                defaultAllowQuotes: localQuotes
            }));
        }

        onClose();
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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#000000] border border-gray-800 rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5">
                    <h2 className="text-[20px] font-bold text-white tracking-tight">{t('post.interaction_settings', 'Post interaction settings')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <FiX size={24} />
                    </button>
                </div>

                <div className="px-6 pb-6 space-y-5 overflow-y-auto max-h-[75vh]">
                    {/* Who can reply Section */}
                    <div className="space-y-4">
                        <h3 className="text-[15px] font-bold text-white">
                            {t('post.who_can_reply', 'Who can reply')}
                        </h3>

                        {/* Radio Options: Anyone / Nobody */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setLocalReply('anyone'); setLocalCustomRestrictions([]); setSelectedLists([]); }}
                                className={cn(
                                    "flex-1 flex items-center gap-3 p-4 rounded-2xl transition-all border-2",
                                    localReply === 'anyone'
                                        ? "bg-[#001933] border-[#0085FF]"
                                        : "bg-[#161618] border-transparent hover:bg-[#202022]"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                    localReply === 'anyone' ? "border-[#0085FF] bg-[#0085FF]" : "border-gray-600"
                                )}>
                                    {localReply === 'anyone' && <div className="w-2 h-2 bg-white rounded-full shadow-sm" />}
                                </div>
                                <span className={cn("font-bold text-[16px]", localReply === 'anyone' ? "text-white" : "text-gray-400")}>
                                    {t('post.reply_anyone', 'Anyone')}
                                </span>
                            </button>

                            <button
                                onClick={() => { setLocalReply('nobody'); setLocalCustomRestrictions([]); setSelectedLists([]); }}
                                className={cn(
                                    "flex-1 flex items-center gap-3 p-4 rounded-2xl transition-all border-2",
                                    localReply === 'nobody'
                                        ? "bg-[#001933] border-[#0085FF]"
                                        : "bg-[#161618] border-transparent hover:bg-[#202022]"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                    localReply === 'nobody' ? "border-[#0085FF] bg-[#0085FF]" : "border-gray-600"
                                )}>
                                    {localReply === 'nobody' && <div className="w-2 h-2 bg-white rounded-full shadow-sm" />}
                                </div>
                                <span className={cn("font-bold text-[16px]", localReply === 'nobody' ? "text-white" : "text-gray-400")}>
                                    {t('post.reply_nobody', 'Nobody')}
                                </span>
                            </button>
                        </div>

                        {/* Checkbox Options */}
                        <div className="space-y-2">
                            {[
                                { id: 'followers', label: t('post.reply_followers', 'Your followers') },
                                { id: 'following', label: t('post.reply_following', 'People you follow') },
                                { id: 'mentioned', label: t('post.reply_mentioned', 'People you mention') },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => toggleCustomRestriction(opt.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-4 rounded-2xl transition-all border-2",
                                        isCustomSelected(opt.id)
                                            ? "bg-[#001933] border-[#0085FF]"
                                            : "bg-[#161618] border-transparent hover:bg-[#202022]"
                                    )}
                                >
                                    <div className={cn(
                                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                        isCustomSelected(opt.id) ? "bg-[#0085FF] border-[#0085FF]" : "border-gray-600"
                                    )}>
                                        {isCustomSelected(opt.id) && <FiCheck className="text-white" size={14} strokeWidth={4} />}
                                    </div>
                                    <span className={cn("font-bold text-[16px]", isCustomSelected(opt.id) ? "text-white" : "text-gray-400")}>
                                        {opt.label}
                                    </span>
                                </button>
                            ))}

                            {/* List Dropdown / Accordion */}
                            <div className="space-y-2">
                                <button
                                    onClick={() => setIsListsOpen(!isListsOpen)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-4 rounded-2xl transition-all border-2",
                                        selectedLists.length > 0
                                            ? "bg-[#001933] border-[#0085FF]"
                                            : "bg-[#161618] border-transparent hover:bg-[#202022]"
                                    )}
                                >
                                    <span className={cn("font-bold text-[16px]", selectedLists.length > 0 ? "text-white" : "text-gray-400")}>
                                        {t('post.select_from_lists', 'Select from your lists')}
                                    </span>
                                    <FiChevronDown className={cn("text-gray-400 transition-transform", isListsOpen && "rotate-180")} size={20} />
                                </button>

                                {isListsOpen && (
                                    <div className="px-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                        {myLists.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-gray-500">
                                                {t('post.no_lists', "You haven't created any lists yet.")}
                                            </div>
                                        ) : (
                                            myLists.map(list => (
                                                <button
                                                    key={list.id}
                                                    onClick={() => toggleListSelection(list.id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                                                        isListSelected(list.id) ? "bg-primary-500/10" : "hover:bg-[#161618]"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                                        isListSelected(list.id) ? "bg-[#0085FF] border-[#0085FF]" : "border-gray-600"
                                                    )}>
                                                        {isListSelected(list.id) && <FiCheck className="text-white" size={12} strokeWidth={4} />}
                                                    </div>
                                                    <div className="w-8 h-8 rounded-lg bg-[#0085FF] flex items-center justify-center text-white">
                                                        <FiUsers size={16} />
                                                    </div>
                                                    <span className={cn("font-bold text-[15px]", isListSelected(list.id) ? "text-white" : "text-gray-400")}>
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

                    {/* Allow Quotes Switch */}
                    <button
                        onClick={() => setLocalQuotes(!localQuotes)}
                        className="w-full flex items-center justify-between p-4 rounded-3xl bg-[#001933] border border-[#0085FF]/30 transition-all hover:bg-[#002850]"
                    >
                        <div className="flex items-center gap-3">
                            <FiRepeat className="text-white" size={20} />
                            <span className="font-bold text-[16px] text-white underline decoration-[#0085FF]/50 underline-offset-4">
                                {t('post.allow_quotes', 'Allow quote posts')}
                            </span>
                        </div>
                        <div className={cn(
                            "w-14 h-8 rounded-full transition-colors relative flex items-center px-1",
                            localQuotes ? "bg-[#0085FF]" : "bg-gray-700"
                        )}>
                            <div className={cn(
                                "w-6 h-6 bg-white rounded-full transition-transform shadow-lg",
                                localQuotes ? "translate-x-6" : "translate-x-0"
                            )} />
                        </div>
                    </button>

                    {/* Save Defaults Checkbox */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={saveForNextTime}
                                onChange={(e) => setSaveForNextTime(e.target.checked)}
                            />
                            <div className={cn(
                                "w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center",
                                saveForNextTime
                                    ? "bg-[#202022] border-[#202022]"
                                    : "border-gray-700 bg-[#161618] group-hover:border-gray-500"
                            )}>
                                {saveForNextTime && <FiCheck size={16} className="text-white" strokeWidth={3} />}
                            </div>
                        </div>
                        <span className="text-[15px] font-bold text-gray-300">
                            {t('post.save_defaults', 'Save these options for next time')}
                        </span>
                    </label>

                    {/* Submit Button */}
                    <div className="pt-2">
                        <Button
                            variant="primary"
                            fullWidth
                            onClick={handleSave}
                            className="bg-[#0085FF] hover:bg-[#0077E6] text-white rounded-full font-bold py-4 text-[17px] shadow-lg shadow-[#0085FF]/20 active:scale-[0.98] transition-all"
                        >
                            {t('common.save', 'Save')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostInteractionSettingsModal;
