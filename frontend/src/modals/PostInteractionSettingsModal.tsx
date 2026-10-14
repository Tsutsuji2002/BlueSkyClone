import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/classNames';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { updateInteractionSettings as updateInteractionSettingsThunk } from '../redux/slices/postsSlice';
import { showToast } from '../redux/slices/toastSlice';
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
    postUri?: string; // Optional: if provided, will update the post on the backend
    loading?: boolean;
}

const PostInteractionSettingsModal: React.FC<PostInteractionSettingsModalProps> = ({
    isOpen,
    onClose,
    replyRestriction,
    setReplyRestriction,
    allowQuotes,
    setAllowQuotes,
    postUri,
    loading
}) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const [localReply, setLocalReply] = useState(replyRestriction);
    const [localQuotes, setLocalQuotes] = useState(allowQuotes);
    const [isUpdating, setIsUpdating] = useState(false);
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
                setSelectedLists([]);
            } else {
                setLocalReply('custom');
                setLocalCustomRestrictions(replyRestriction.split(',').filter(r => ['followers', 'following', 'mentioned'].includes(r)));
                const listIds = replyRestriction.split(',').filter(r => r.startsWith('list:'));
                setSelectedLists(listIds.map(l => l.replace('list:', '')));
            }
            setLocalQuotes(allowQuotes);
            setIsUpdating(false);
            fetchLists();
        }
    }, [isOpen, replyRestriction, allowQuotes]);

    const fetchLists = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/Lists/my`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch lists');
            const data = await response.json();
            setMyLists(data);
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

        setIsUpdating(true);

        try {
            if (postUri) {
                // Editing an existing post: update the post using the Redux thunk
                await dispatch(updateInteractionSettingsThunk({
                    postUri,
                    replyRestriction: finalRestriction,
                    allowQuotes: localQuotes
                })).unwrap();

                dispatch(showToast({ message: t('post.interaction_settings_updated', 'Settings updated'), type: 'success' }));
            } else {
                // For new posts (no postUri): settings are applied to composer state
                setReplyRestriction(finalRestriction);
                setAllowQuotes(localQuotes);
            }

            onClose();
        } catch (error: any) {
            dispatch(showToast({ message: error?.message || t('post.failed_to_update_interaction', 'Failed to update settings'), type: 'error' }));
        } finally {
            setIsUpdating(false);
        }
    };

    const toggleCustomRestriction = (key: string) => {
        let newRestrictions = [...localCustomRestrictions];
        if (newRestrictions.includes(key)) {
            newRestrictions = newRestrictions.filter(k => k !== key);
        } else {
            newRestrictions.push(key);
        }
        setLocalCustomRestrictions(newRestrictions);
        if (newRestrictions.length > 0 || selectedLists.length > 0) {
            setLocalReply('custom');
        } else {
            setLocalReply('anyone');
        }
    };

    const toggleListSelection = (listId: string) => {
        let newLists = [...selectedLists];
        if (newLists.includes(listId)) {
            newLists = newLists.filter(id => id !== listId);
        } else {
            newLists.push(listId);
        }
        setSelectedLists(newLists);
        if (newLists.length > 0 || localCustomRestrictions.length > 0) {
            setLocalReply('custom');
        } else {
            setLocalReply('anyone');
        }
    };

    const isCustomSelected = (key: string) => localReply === 'custom' && localCustomRestrictions.includes(key);
    const isListSelected = (id: string) => localReply === 'custom' && selectedLists.includes(id);

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                aria-label="Edit post interaction settings"
                role="dialog"
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-[400px] rounded-[12px] border border-[#c0cad8] dark:border-[#2e4057] bg-white dark:bg-[#161e2e] shadow-[0_0_30px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col cursor-default animate-in zoom-in-95 duration-200"
            >
                <div className="p-6 flex flex-col">
                    {/* Header Title */}
                    <div className="pb-4">
                        <div
                            dir="auto"
                            className="text-[20.6px] leading-[27px] font-bold text-black dark:text-white tracking-[0.25px] font-sans"
                        >
                            {t('post.interaction_settings', 'Post interaction settings')}
                        </div>
                    </div>

                    {/* Close Button Top Right */}
                    <div className="absolute top-3 right-3 z-10">
                        <button
                            type="button"
                            aria-label="Close active dialog"
                            onClick={onClose}
                            className="w-[33px] h-[33px] rounded-full flex items-center justify-center bg-white dark:bg-[#1E293B] hover:bg-gray-100 dark:hover:bg-[#283548] transition-colors cursor-pointer"
                        >
                            <div className="w-[17px] height-[17px] flex items-center justify-center">
                                <svg fill="none" width="18" viewBox="0 0 24 24" height="18" className="text-[#526580] dark:text-[#8798B0] pointer-events-none">
                                    <path
                                        fill="currentColor"
                                        stroke="none"
                                        strokeWidth="0"
                                        strokeLinecap="butt"
                                        strokeLinejoin="miter"
                                        fillRule="evenodd"
                                        clipRule="evenodd"
                                        d="M4.293 4.293a1 1 0 0 1 1.414 0L12 10.586l6.293-6.293a1 1 0 1 1 1.414 1.414L13.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414L12 13.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L10.586 12 4.293 5.707a1 1 0 0 1 0-1.414Z"
                                    />
                                </svg>
                            </div>
                        </button>
                    </div>

                    <div className="flex flex-col gap-4">
                        {/* Section: Who can reply */}
                        <div className="flex flex-col gap-2">
                            <div
                                dir="auto"
                                className="text-[15px] leading-[20px] font-medium text-black dark:text-white tracking-[0.25px]"
                            >
                                {t('post.who_can_reply', 'Who can reply')}
                            </div>

                            {/* Radio Group: Anyone / Nobody */}
                            <div aria-label="Set who can reply to your post" role="radiogroup" className="w-full">
                                <div className="flex flex-row gap-2">
                                    {/* Anyone */}
                                    <div
                                        role="radio"
                                        tabIndex={0}
                                        aria-checked={localReply === 'anyone'}
                                        aria-label="Allow anyone to reply"
                                        onClick={() => { setLocalReply('anyone'); setLocalCustomRestrictions([]); setSelectedLists([]); }}
                                        className="flex-1 cursor-pointer"
                                    >
                                        <div className={cn(
                                            "w-full flex flex-row items-center gap-2 p-3 min-h-[48px] rounded-[12px] transition-colors",
                                            localReply === 'anyone'
                                                ? "bg-[#E5F0FF] dark:bg-[#1A3358]"
                                                : "bg-[#EFF2F6] dark:bg-[#1E293B] hover:bg-[#E4E8EE] dark:hover:bg-[#283548]"
                                        )}>
                                            <div className={cn(
                                                "w-[25px] h-[25px] rounded-full border flex items-center justify-center transition-all -m-[1px]",
                                                localReply === 'anyone'
                                                    ? "border-[#006AFF] bg-[#006AFF]"
                                                    : "border-[#DCE2EA] dark:border-[#334155] bg-[#F9FAFB] dark:bg-[#0F172A]"
                                            )}>
                                                {localReply === 'anyone' && (
                                                    <div className="w-[12px] h-[12px] rounded-full bg-white" />
                                                )}
                                            </div>
                                            <div
                                                dir="auto"
                                                className={cn(
                                                    "text-[15px] leading-[20px] tracking-[0.25px] flex-1 truncate",
                                                    localReply === 'anyone' ? "font-medium text-black dark:text-white" : "text-[#405168] dark:text-[#8798B0]"
                                                )}
                                            >
                                                {t('post.reply_anyone', 'Anyone')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Nobody */}
                                    <div
                                        role="radio"
                                        tabIndex={0}
                                        aria-checked={localReply === 'nobody'}
                                        aria-label="Disable replies entirely"
                                        onClick={() => { setLocalReply('nobody'); setLocalCustomRestrictions([]); setSelectedLists([]); }}
                                        className="flex-1 cursor-pointer"
                                    >
                                        <div className={cn(
                                            "w-full flex flex-row items-center gap-2 p-3 min-h-[48px] rounded-[12px] transition-colors",
                                            localReply === 'nobody'
                                                ? "bg-[#E5F0FF] dark:bg-[#1A3358]"
                                                : "bg-[#EFF2F6] dark:bg-[#1E293B] hover:bg-[#E4E8EE] dark:hover:bg-[#283548]"
                                        )}>
                                            <div className={cn(
                                                "w-[25px] h-[25px] rounded-full border flex items-center justify-center transition-all -m-[1px]",
                                                localReply === 'nobody'
                                                    ? "border-[#006AFF] bg-[#006AFF]"
                                                    : "border-[#DCE2EA] dark:border-[#334155] bg-[#F9FAFB] dark:bg-[#0F172A]"
                                            )}>
                                                {localReply === 'nobody' && (
                                                    <div className="w-[12px] h-[12px] rounded-full bg-white" />
                                                )}
                                            </div>
                                            <div
                                                dir="auto"
                                                className={cn(
                                                    "text-[15px] leading-[20px] tracking-[0.25px] flex-1 truncate",
                                                    localReply === 'nobody' ? "font-medium text-black dark:text-white" : "text-[#405168] dark:text-[#8798B0]"
                                                )}
                                            >
                                                {t('post.reply_nobody', 'Nobody')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Combined Rules Box (followers, following, mentioned, lists) */}
                            <div className="w-full">
                                <div className="w-full flex flex-col gap-[2px]">
                                    {/* Your followers */}
                                    <div
                                        role="checkbox"
                                        tabIndex={0}
                                        aria-checked={isCustomSelected('followers')}
                                        aria-label="Allow your followers to reply"
                                        onClick={() => toggleCustomRestriction('followers')}
                                        className="w-full cursor-pointer"
                                    >
                                        <div className={cn(
                                            "w-full flex flex-row items-center gap-2 p-3 min-h-[48px] rounded-t-[12px] rounded-b-[4px] transition-colors",
                                            isCustomSelected('followers')
                                                ? "bg-[#E5F0FF] dark:bg-[#1A3358]"
                                                : "bg-[#EFF2F6] dark:bg-[#1E293B] hover:bg-[#E4E8EE] dark:hover:bg-[#283548]"
                                        )}>
                                            <div className={cn(
                                                "w-[24px] h-[24px] rounded-[6px] border flex items-center justify-center transition-all",
                                                isCustomSelected('followers')
                                                    ? "border-[#006AFF] bg-[#006AFF]"
                                                    : "border-[#DCE2EA] dark:border-[#334155] bg-[#F9FAFB] dark:bg-[#0F172A]"
                                            )}>
                                                {isCustomSelected('followers') && (
                                                    <svg fill="none" viewBox="0 0 24 24" width="16" height="16">
                                                        <path fill="#ffffff" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M20.707 5.293a1 1 0 0 1 0 1.414l-11 11a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L9 15.586 19.293 5.293a1 1 0 0 1 1.414 0Z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div
                                                dir="auto"
                                                className={cn(
                                                    "text-[15px] leading-[20px] tracking-[0.25px] flex-1",
                                                    isCustomSelected('followers') ? "font-medium text-black dark:text-white" : "text-[#405168] dark:text-[#8798B0]"
                                                )}
                                            >
                                                {t('post.reply_followers', 'Your followers')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* People you follow */}
                                    <div
                                        role="checkbox"
                                        tabIndex={0}
                                        aria-checked={isCustomSelected('following')}
                                        aria-label="Allow people you follow to reply"
                                        onClick={() => toggleCustomRestriction('following')}
                                        className="w-full cursor-pointer"
                                    >
                                        <div className={cn(
                                            "w-full flex flex-row items-center gap-2 p-3 min-h-[48px] rounded-[4px] transition-colors",
                                            isCustomSelected('following')
                                                ? "bg-[#E5F0FF] dark:bg-[#1A3358]"
                                                : "bg-[#EFF2F6] dark:bg-[#1E293B] hover:bg-[#E4E8EE] dark:hover:bg-[#283548]"
                                        )}>
                                            <div className={cn(
                                                "w-[24px] h-[24px] rounded-[6px] border flex items-center justify-center transition-all",
                                                isCustomSelected('following')
                                                    ? "border-[#006AFF] bg-[#006AFF]"
                                                    : "border-[#DCE2EA] dark:border-[#334155] bg-[#F9FAFB] dark:bg-[#0F172A]"
                                            )}>
                                                {isCustomSelected('following') && (
                                                    <svg fill="none" viewBox="0 0 24 24" width="16" height="16">
                                                        <path fill="#ffffff" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M20.707 5.293a1 1 0 0 1 0 1.414l-11 11a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L9 15.586 19.293 5.293a1 1 0 0 1 1.414 0Z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div
                                                dir="auto"
                                                className={cn(
                                                    "text-[15px] leading-[20px] tracking-[0.25px] flex-1",
                                                    isCustomSelected('following') ? "font-medium text-black dark:text-white" : "text-[#405168] dark:text-[#8798B0]"
                                                )}
                                            >
                                                {t('post.reply_following', 'People you follow')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* People you mention */}
                                    <div
                                        role="checkbox"
                                        tabIndex={0}
                                        aria-checked={isCustomSelected('mentioned')}
                                        aria-label="Allow people you mention to reply"
                                        onClick={() => toggleCustomRestriction('mentioned')}
                                        className="w-full cursor-pointer"
                                    >
                                        <div className={cn(
                                            "w-full flex flex-row items-center gap-2 p-3 min-h-[48px] rounded-[4px] transition-colors",
                                            isCustomSelected('mentioned')
                                                ? "bg-[#E5F0FF] dark:bg-[#1A3358]"
                                                : "bg-[#EFF2F6] dark:bg-[#1E293B] hover:bg-[#E4E8EE] dark:hover:bg-[#283548]"
                                        )}>
                                            <div className={cn(
                                                "w-[24px] h-[24px] rounded-[6px] border flex items-center justify-center transition-all",
                                                isCustomSelected('mentioned')
                                                    ? "border-[#006AFF] bg-[#006AFF]"
                                                    : "border-[#DCE2EA] dark:border-[#334155] bg-[#F9FAFB] dark:bg-[#0F172A]"
                                            )}>
                                                {isCustomSelected('mentioned') && (
                                                    <svg fill="none" viewBox="0 0 24 24" width="16" height="16">
                                                        <path fill="#ffffff" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M20.707 5.293a1 1 0 0 1 0 1.414l-11 11a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L9 15.586 19.293 5.293a1 1 0 0 1 1.414 0Z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div
                                                dir="auto"
                                                className={cn(
                                                    "text-[15px] leading-[20px] tracking-[0.25px] flex-1",
                                                    isCustomSelected('mentioned') ? "font-medium text-black dark:text-white" : "text-[#405168] dark:text-[#8798B0]"
                                                )}
                                            >
                                                {t('post.reply_mentioned', 'People you mention')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Select from your lists */}
                                    <button
                                        type="button"
                                        aria-label="Show lists of users to select from"
                                        aria-pressed={isListsOpen}
                                        onClick={() => setIsListsOpen(!isListsOpen)}
                                        className="w-full text-left cursor-pointer"
                                    >
                                        <div className={cn(
                                            "w-full flex flex-row items-center justify-between gap-2 p-3 min-h-[48px] rounded-t-[4px] rounded-b-[12px] transition-colors",
                                            selectedLists.length > 0
                                                ? "bg-[#E5F0FF] dark:bg-[#1A3358]"
                                                : "bg-[#EFF2F6] dark:bg-[#1E293B] hover:bg-[#E4E8EE] dark:hover:bg-[#283548]"
                                        )}>
                                            <div
                                                dir="auto"
                                                className={cn(
                                                    "text-[15px] leading-[20px] tracking-[0.25px] flex-1",
                                                    selectedLists.length > 0 ? "font-medium text-black dark:text-white" : "text-[#405168] dark:text-[#8798B0]"
                                                )}
                                            >
                                                {selectedLists.length > 0
                                                    ? `${t('post.select_from_lists', 'Select from your lists')} (${selectedLists.length})`
                                                    : t('post.select_from_lists', 'Select from your lists')}
                                            </div>
                                            <svg
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                width="20"
                                                height="20"
                                                className={cn("text-[#405168] dark:text-[#8798B0] flex-shrink-0 transition-transform duration-200", isListsOpen && "rotate-180")}
                                            >
                                                <path
                                                    fill="currentColor"
                                                    stroke="none"
                                                    strokeWidth="0"
                                                    strokeLinecap="butt"
                                                    strokeLinejoin="miter"
                                                    fillRule="evenodd"
                                                    clipRule="evenodd"
                                                    d="M3.293 8.293a1 1 0 0 1 1.414 0L12 15.586l7.293-7.293a1 1 0 1 1 1.414 1.414l-8 8a1 1 0 0 1-1.414 0l-8-8a1 1 0 0 1 0-1.414Z"
                                                />
                                            </svg>
                                        </div>
                                    </button>

                                    {/* Expanded List Options */}
                                    {isListsOpen && (
                                        <div className="p-2 space-y-1 bg-[#F9FAFB] dark:bg-[#111827] rounded-[12px] border border-[#DCE2EA] dark:border-[#334155] mt-1 max-h-48 overflow-y-auto">
                                            {myLists.length === 0 ? (
                                                <div className="p-3 text-center text-[13px] text-gray-500">
                                                    {t('post.no_lists', "You haven't created any lists yet.")}
                                                </div>
                                            ) : (
                                                myLists.map(list => (
                                                    <div
                                                        key={list.id}
                                                        onClick={() => toggleListSelection(list.id)}
                                                        className="w-full flex items-center gap-3 p-2.5 rounded-[8px] hover:bg-[#EFF2F6] dark:hover:bg-[#1E293B] cursor-pointer transition-colors"
                                                    >
                                                        <div className={cn(
                                                            "w-[22px] h-[22px] rounded-[6px] border flex items-center justify-center transition-all",
                                                            isListSelected(list.id) ? "border-[#006AFF] bg-[#006AFF]" : "border-[#DCE2EA] dark:border-[#334155] bg-white dark:bg-[#0F172A]"
                                                        )}>
                                                            {isListSelected(list.id) && (
                                                                <svg fill="none" viewBox="0 0 24 24" width="14" height="14">
                                                                    <path fill="#ffffff" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M20.707 5.293a1 1 0 0 1 0 1.414l-11 11a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L9 15.586 19.293 5.293a1 1 0 0 1 1.414 0Z" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <span className={cn(
                                                            "text-[14px] truncate flex-1",
                                                            isListSelected(list.id) ? "font-medium text-black dark:text-white" : "text-[#405168] dark:text-[#8798B0]"
                                                        )}>
                                                            {list.name}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section: Allow quote posts */}
                        <div
                            role="checkbox"
                            tabIndex={0}
                            aria-checked={localQuotes}
                            aria-label={localQuotes ? "Disable quote posts of this post" : "Allow quote posts of this post"}
                            onClick={() => setLocalQuotes(!localQuotes)}
                            className="w-full cursor-pointer"
                        >
                            <div className={cn(
                                "w-full flex flex-row items-center justify-between gap-2 p-3 min-h-[48px] rounded-[12px] transition-colors",
                                localQuotes
                                    ? "bg-[#E5F0FF] dark:bg-[#1A3358]"
                                    : "bg-[#EFF2F6] dark:bg-[#1E293B] hover:bg-[#E4E8EE] dark:hover:bg-[#283548]"
                            )}>
                                <div className="flex flex-row items-center gap-1 flex-1">
                                    <svg
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        width="20"
                                        height="20"
                                        className={cn("flex-shrink-0 transition-colors mr-1", localQuotes ? "text-black dark:text-white" : "text-[#405168] dark:text-[#8798B0]")}
                                    >
                                        <path
                                            fill="currentColor"
                                            stroke="none"
                                            strokeWidth="0"
                                            strokeLinecap="butt"
                                            strokeLinejoin="miter"
                                            fillRule="evenodd"
                                            clipRule="evenodd"
                                            d="M2.003 5.999a2 2 0 0 1 2-1.999h5c1.104 0 2 .893 2 1.999V13c0 2.585-1.16 4.335-2.315 5.417-.571.536-1.14.91-1.569 1.15a7.01 7.01 0 0 1-.738.36l-.016.006-.006.002h-.002l-.001.001L6.004 19l.351.936a1 1 0 0 1-1.351-.935L5 14H4a2 2 0 0 1-2-2.001l.002-6Zm5 11.236L7 12.999A1 1 0 0 0 6 12H4l.003-6h5v7c0 1.915-.837 3.165-1.683 3.958-.106.1-.213.192-.317.277Zm6-11.235a2 2 0 0 1 2-2h5c1.104 0 2 .893 2 1.999V13c0 2.585-1.16 4.335-2.315 5.417-.571.536-1.14.91-1.569 1.15a7.018 7.018 0 0 1-.738.36l-.016.006-.006.002h-.002l-.001.001-.352-.936.351.936A1 1 0 0 1 16.004 19v-5h-1a2 2 0 0 1-2-2V6Zm7 0h-5v6h2a1 1 0 0 1 1 1v4.234c.105-.085.211-.177.317-.276.846-.793 1.684-2.043 1.684-3.958V6Z"
                                        />
                                    </svg>
                                    <div
                                        dir="auto"
                                        className={cn(
                                            "text-[15px] leading-[20px] tracking-[0.25px] flex-1",
                                            localQuotes ? "font-medium text-black dark:text-white" : "text-[#405168] dark:text-[#8798B0]"
                                        )}
                                    >
                                        {t('post.allow_quotes', 'Allow quote posts')}
                                    </div>
                                </div>
                                {/* Toggle switch: 48px width, 28px height, 3px padding, rounded-full, 22px circle */}
                                <div className={cn(
                                    "relative rounded-full h-[28px] w-[48px] p-[3px] transition-colors flex items-center",
                                    localQuotes ? "bg-[#006AFF] justify-end" : "bg-[#DCE2EA] dark:bg-[#334155] justify-start"
                                )}>
                                    <div className="rounded-full bg-white h-[22px] w-[22px] shadow-sm transition-transform" />
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            type="button"
                            aria-label="Save"
                            disabled={isUpdating || loading}
                            onClick={handleSave}
                            className="w-full flex flex-row items-center justify-center bg-[#006AFF] hover:bg-[#005CE6] active:opacity-90 disabled:opacity-50 text-white rounded-full py-3 px-6 gap-1.5 transition-colors cursor-pointer"
                        >
                            <div
                                dir="auto"
                                className="text-[15px] leading-[20px] font-medium tracking-[0.25px] text-center text-white"
                            >
                                {isUpdating || loading ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostInteractionSettingsModal;
