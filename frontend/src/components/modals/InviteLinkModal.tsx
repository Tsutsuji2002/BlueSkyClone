import React, { useState, useEffect } from 'react';
import { FiX, FiLink, FiCopy, FiEdit, FiTrash2, FiShare2, FiArrowRight } from 'react-icons/fi';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { createInviteLink, updateInviteLink, disableInviteLink, fetchInviteLink } from '../../redux/slices/messagesSlice';

interface InviteLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: string;
    existingLink?: {
        id: string;
        link: string | null;
        requireApproval: boolean;
        joinRule: string;
        createdAt?: string;
        disabled?: boolean;
    } | null;
}

type Step = 'intro' | 'generate' | 'active' | 'confirmDisable' | 'disabled';

const InviteLinkModal: React.FC<InviteLinkModalProps> = ({ isOpen, onClose, conversationId, existingLink }) => {
    const dispatch = useAppDispatch();
    const [step, setStep] = useState<Step>('intro');
    const [rule, setRule] = useState<string>('anyone');
    const [requireApproval, setRequireApproval] = useState<boolean>(false);
    // Track original settings when entering edit mode to detect changes
    const [originalRule, setOriginalRule] = useState<string>('anyone');
    const [originalRequireApproval, setOriginalRequireApproval] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);
    const [shareCopySuccess, setShareCopySuccess] = useState(false);
    const [fetchedLink, setFetchedLink] = useState<typeof existingLink>(null);

    useEffect(() => {
        if (isOpen) {
            setFetchedLink(null);
            setError(null);
            // If existingLink is already passed via props, use it directly
            if (existingLink) {
                setFetchedLink(existingLink);
                setRule(existingLink.joinRule);
                setRequireApproval(existingLink.requireApproval);
                setStep(existingLink.disabled ? 'disabled' : 'active');
                return;
            }
            // Otherwise, fetch from server to detect pre-existing links
            const hasSeenIntro = localStorage.getItem(`group_invite_intro_seen_${conversationId}`);
            setIsFetching(true);
            dispatch(fetchInviteLink(conversationId) as any).then((result: any) => {
                setIsFetching(false);
                if (fetchInviteLink.fulfilled.match(result) && result.payload) {
                    const link = result.payload;
                    setFetchedLink(link);
                    setRule(link.joinRule || 'anyone');
                    setRequireApproval(link.requireApproval || false);
                    setStep(link.disabled ? 'disabled' : 'active');
                } else {
                    // No link exists yet â€” go to intro or generate
                    setStep(hasSeenIntro ? 'generate' : 'intro');
                }
            });
        } else {
            setError(null);
            setFetchedLink(null);
        }
    }, [isOpen, conversationId, existingLink]);

    // When navigating to the edit/generate screen, snapshot original settings
    const goToEditRules = () => {
        setOriginalRule(rule);
        setOriginalRequireApproval(requireApproval);
        setError(null);
        setStep('generate');
    };

    const handleGetStarted = () => {
        localStorage.setItem(`group_invite_intro_seen_${conversationId}`, 'true');
        setStep('generate');
    };

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        try {
            const resultAction = await dispatch(createInviteLink({ 
                conversationId, 
                requireApproval, 
                joinRule: rule 
            }) as any);
            
            if (createInviteLink.fulfilled.match(resultAction)) {
                setFetchedLink(resultAction.payload);
                setStep('active');
            } else {
                const errMsg: string = resultAction.payload as string || '';
                // If already exists, fall back to editing the existing link
                if (errMsg.toLowerCase().includes('already') || errMsg.toLowerCase().includes('exists')) {
                    const updateResult = await dispatch(updateInviteLink({ conversationId, requireApproval, joinRule: rule }) as any);
                    if (updateInviteLink.fulfilled.match(updateResult)) {
                        setFetchedLink(updateResult.payload);
                        setStep('active');
                    } else {
                        setError(updateResult.payload as string || 'Failed to sync invite link');
                    }
                } else {
                    setError(errMsg || 'Failed to generate link');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        setLoading(true);
        setError(null);
        try {
            const resultAction = await dispatch(updateInviteLink({ 
                conversationId, 
                requireApproval, 
                joinRule: rule 
            }) as any);
            
            if (updateInviteLink.fulfilled.match(resultAction)) {
                setFetchedLink(resultAction.payload);
                setStep('active');
            } else {
                setError(resultAction.payload as string || 'Failed to update link');
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async () => {
        setLoading(true);
        try {
            await dispatch(disableInviteLink(conversationId) as any);
            setStep('disabled');
        } catch (err: any) {
            setError(err.message || 'Failed to disable link');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        const activeLink = fetchedLink || existingLink;
        if (activeLink?.link) {
            navigator.clipboard.writeText(activeLink.link);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    // Share always copies to clipboard and shows confirmation
    const handleShare = () => {
        const activeLink = fetchedLink || existingLink;
        if (activeLink?.link) {
            navigator.clipboard.writeText(activeLink.link);
            setShareCopySuccess(true);
            setTimeout(() => setShareCopySuccess(false), 2500);
        }
    };

    if (!isOpen) return null;

    if (isFetching) {
        return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                <div className="relative w-full max-w-[400px] bg-white dark:bg-black rounded-2xl shadow-2xl p-12 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-[#006AFF] border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-gray-500">Loading link info...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Use fetched link if available, otherwise fall back to prop
    const activeLink = fetchedLink || existingLink;

    const renderIntro = () => (
        <div className="flex flex-col h-full animate-fadeIn">
            <div className="px-6 pt-5">
                <div className="relative overflow-hidden rounded-xl mb-4 w-full aspect-[1.689/1] bg-gray-100 flex items-center justify-center">
                    <img 
                        src="https://web-cdn.bsky.app/static/media/chat-invite-friends.bf948a05c6b3621ab98b.webp" 
                        alt="Invite friends"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                </div>
                <h2 className="text-[20.6px] font-bold text-black dark:text-white leading-[27px] mb-2 font-sans">
                    Invite link
                </h2>
                <div className="absolute top-3 right-3">
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                        <FiX size={18} className="text-[#526580]" />
                    </button>
                </div>
            </div>
            
            <div className="px-6 pb-6 flex-1">
                <div className="flex flex-col gap-4 text-[15px] leading-[20px] text-black dark:text-gray-300">
                    <p>An invite link lets people join this group chat without being added directly. You control who can join the chat. You can disable the link at any time.</p>
                    <p>Group chats can only have a maximum of 50 people.</p>
                    <p>Your name, avatar, the name of the group chat, and the number of members will be visible to everyone.</p>
                </div>
                
                <div className="mt-8">
                    <button 
                        onClick={handleGetStarted}
                        className="w-full flex flex-row items-center justify-center gap-1.5 bg-[#006AFF] hover:bg-[#0052cc] py-3 rounded-full text-white font-medium text-[15px] transition-colors"
                    >
                        Get started
                        <FiArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderRules = (isEdit: boolean) => {
        const options = [
            { id: 'anyone_instant', label: 'Anyone can join instantly', rule: 'anyone', approval: false },
            { id: 'anyone_request', label: 'Anyone can request to join', rule: 'anyone', approval: true },
            { id: 'followed_instant', label: 'People I follow can join instantly', rule: 'followedByOwner', approval: false },
            { id: 'followed_request', label: 'People I follow can request to join', rule: 'followedByOwner', approval: true },
        ];

        // Determine if the user has changed anything from original
        const hasChanged = isEdit && (rule !== originalRule || requireApproval !== originalRequireApproval);

        return (
            <div className="flex flex-col h-full animate-fadeIn">
                <div className="px-6 pt-5">
                    <h2 className="text-[20.6px] font-bold text-black dark:text-white leading-[27px] mb-2 font-sans">
                        {isEdit ? 'Edit invite link' : 'Generate invite link'}
                    </h2>
                    <div className="absolute top-3 right-3">
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                            <FiX size={18} className="text-[#526580]" />
                        </button>
                    </div>
                    <p className="text-[15px] leading-[20px] text-black dark:text-gray-300 mb-4">
                        Choose who can join this group chat and how.
                    </p>
                </div>
                
                <div className="px-6 pb-6 flex-1">
                    <div className="flex flex-col gap-1">
                        {options.map((opt) => {
                            const isSelected = rule === opt.rule && requireApproval === opt.approval;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => {
                                        setRule(opt.rule);
                                        setRequireApproval(opt.approval);
                                    }}
                                    className={`flex items-center gap-3 py-3 px-3 rounded-full text-left transition-colors ${isSelected ? 'bg-[#E5F0FF] dark:bg-[#006AFF]/20' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                >
                                    <div className={`w-[25px] h-[25px] rounded-full border shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#006AFF] border-[#006AFF]' : 'bg-[#F9FAFB] dark:bg-white/5 border-[#DCE2EA] dark:border-dark-border'}`}>
                                        {isSelected && <div className="w-3 h-3 bg-white rounded-full" />}
                                    </div>
                                    <span className={`text-[15px] font-medium leading-[17px] ${isSelected ? 'text-black dark:text-white' : 'text-[#232E3E] dark:text-gray-300'}`}>
                                        {opt.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {error && <p className="mt-2 text-red-500 text-xs text-center">{error}</p>}
                    
                    <div className="mt-8">
                        {isEdit ? (
                            hasChanged ? (
                                // Settings changed â€” show active Update button
                                <button
                                    onClick={handleUpdate}
                                    disabled={loading}
                                    className="w-full flex flex-row items-center justify-center gap-2 bg-[#006AFF] hover:bg-[#0052cc] py-3 rounded-full text-white font-medium text-[15px] transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Updating...' : 'Update invite link â†’'}
                                </button>
                            ) : (
                                // Nothing changed â€” show grey Back button
                                <button
                                    onClick={() => setStep('active')}
                                    className="w-full flex flex-row items-center justify-center gap-2 bg-[#EFF2F6] dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-white/10 py-3 rounded-full text-[#405168] dark:text-white font-medium text-[15px] transition-colors"
                                >
                                    Back
                                </button>
                            )
                        ) : (
                            <button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="w-full flex flex-row items-center justify-center bg-[#006AFF] hover:bg-[#0052cc] py-3 rounded-full text-white font-medium text-[15px] transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Generating...' : 'Generate invite link'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderActive = () => {
        const activeLink = fetchedLink || existingLink;
        // Fallback link construction if server returns null but we have an ID
        const link = activeLink?.link || (activeLink?.id ? `https://bsky.app/messages/join/${activeLink.id}` : 'https://bsky.app/chat/...');
        const dateStr = activeLink?.createdAt ? new Date(activeLink.createdAt).toLocaleString() : 'Just now';
        
        const currentRuleLabel = 
            rule === 'anyone' ? (requireApproval ? 'Anyone can request to join' : 'Anyone can join instantly') :
            rule === 'followedByOwner' ? (requireApproval ? 'People I follow can request to join' : 'People I follow can join instantly') :
            'Custom rule';

        return (
            <div className="flex flex-col h-full animate-fadeIn">
                <div className="px-6 pt-5">
                    <h2 className="text-[20.6px] font-bold text-black dark:text-white leading-[27px] mb-2 font-sans">
                        Invite link
                    </h2>
                    <div className="absolute top-3 right-3">
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                            <FiX size={18} className="text-[#526580]" />
                        </button>
                    </div>
                </div>
                
                <div className="px-6 pb-6 flex-1">
                    <div className="flex flex-col gap-1">
                        <div className="relative group">
                            <button 
                                onClick={handleCopy}
                                className="w-full flex flex-row items-center justify-between bg-[#EFF2F6] dark:bg-dark-surface p-3 rounded-[10px] text-left hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                            >
                                <span className="text-[15px] text-black dark:text-white truncate flex-1 mr-2">{link}</span>
                                <FiCopy className="text-[#405168] dark:text-gray-400 shrink-0" size={17} />
                            </button>
                            {copySuccess && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs py-1.5 px-3 rounded-full animate-fadeIn">
                                    Link copied!
                                </div>
                            )}
                        </div>
                        <p className="text-[11.3px] text-[#526580] dark:text-gray-400 mt-1">Created {dateStr}</p>
                    </div>

                    <div className="mt-4">
                        <button 
                            onClick={goToEditRules}
                            className="w-full flex flex-row items-center justify-between border border-[#DCE2EA] dark:border-dark-border bg-white dark:bg-black p-2 pl-4 rounded-full hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                        >
                            <span className="text-[13.1px] text-black dark:text-white flex-1 truncate">{currentRuleLabel}</span>
                            <div className="bg-[#EFF2F6] dark:bg-dark-surface py-2 px-2.5 rounded-full text-[11.3px] font-bold text-[#232E3E] dark:text-white shrink-0 ml-2">
                                Edit
                            </div>
                        </button>
                    </div>

                    <div className="mt-4 flex flex-row justify-between gap-2 text-center">
                        <button 
                            onClick={() => setStep('confirmDisable')}
                            disabled={loading}
                            className="flex-1 flex flex-col items-center justify-center gap-1 bg-[#FEE7EC] dark:bg-red-950 p-2 py-4 rounded-[20px] transition-colors hover:bg-red-100 dark:hover:bg-red-900"
                        >
                            <div className="p-1 rounded-full"><svg fill="none" width="24" viewBox="0 0 24 24" height="24"><path fill="#CA123D" fillRule="evenodd" clipRule="evenodd" d="M14.3 23v-1.1a1 1 0 0 1 2 0V23a1 1 0 1 1-2 0Zm5.243-3.457a1 1 0 0 1 1.414 0l1.1 1.1a1 1 0 1 1-1.414 1.414l-1.1-1.1a1 1 0 0 1 0-1.414ZM4.788 9.298a1 1 0 0 1 1.424 1.404l-.742.752-.004.005a5.003 5.003 0 1 0 7.075 7.075l.005-.004.752-.742a1 1 0 0 1 1.404 1.424l-.747.736a7.003 7.003 0 1 1-9.904-9.904l.737-.746ZM23 14.3a1 1 0 0 1 0 2h-1.1a1 1 0 1 1 0-2H23ZM10.044 4.05a7.005 7.005 0 0 1 9.905 9.906h0l-.737.746a1 1 0 0 1-1.424-1.404l.742-.752.004-.005a5.003 5.003 0 1 0-7.075-7.075l-.005.004-.752.742a1 1 0 0 1-1.404-1.424l.746-.737ZM2.1 7.7a1 1 0 1 1 0 2H1a1 1 0 0 1 0-2h1.1Zm-.157-5.757a1 1 0 0 1 1.414 0l1.1 1.1a1 1 0 1 1-1.414 1.414l-1.1-1.1a1 1 0 0 1 0-1.414ZM7.7 2.1V1a1 1 0 1 1 2 0v1.1a1 1 0 0 1-2 0Z"></path></svg></div>
                            <span className="text-[11.3px] font-bold text-[#CA123D]">Disable</span>
                        </button>
                        
                        <button className="flex-1 flex flex-col items-center justify-center gap-1 bg-[#E5F0FF] dark:bg-[#006AFF]/20 p-2 py-4 rounded-[20px] transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30">
                            <div className="p-1 rounded-full"><svg fill="none" width="24" viewBox="0 0 24 24" height="24"><path fill="#0059D6" fillRule="evenodd" clipRule="evenodd" d="M3 16.8V7.2c0-.544-.001-1.011.03-1.395.033-.395.104-.789.297-1.167a3 3 0 0 1 1.31-1.31c.379-.193.772-.265 1.168-.297C6.188 2.999 6.657 3 7.2 3H11a1 1 0 1 1 0 2H7.2c-.576 0-.949 0-1.232.023-.272.022-.373.06-.422.085a1 1 0 0 0-.437.437c-.025.05-.062.15-.085.422C5.001 6.251 5 6.623 5 7.2v9.6c0 .577.001.95.024 1.232.023.272.06.373.085.422a1 1 0 0 0 .437.437c.05.025.15.063.422.085.283.023.656.024 1.232.024h9.6c.576 0 .949-.001 1.232-.024.272-.022.373-.06.422-.085a1 1 0 0 0 .437-.437c.025-.049.062-.15.085-.422.023-.283.024-.655.024-1.232V13a1 1 0 1 1 2 0v3.8c0 .543.001 1.011-.03 1.395-.033.395-.104.788-.297 1.167a3 3 0 0 1-1.31 1.311c-.379.193-.772.264-1.168.296-.383.031-.852.031-1.395.031H7.2c-.543 0-1.012 0-1.395-.031-.396-.032-.789-.103-1.167-.296a3 3 0 0 1-1.31-1.311c-.194-.379-.265-.772-.298-1.167C3 17.81 3 17.343 3 16.8M16.629 2.957a3 3 0 0 1 4.242 0l.172.171a3 3 0 0 1 0 4.243L13 15.414a2 2 0 0 1-1.414.586H9a1 1 0 0 1-1-1v-2.586A2 2 0 0 1 8.586 11zM10 14h1.586l8.043-8.043a1 1 0 0 0 0-1.414l-.172-.172a1 1 0 0 0-1.414 0L10 12.414z"></path></svg></div>
                            <span className="text-[11.3px] font-bold text-[#0059D6]">Post link</span>
                        </button>
                        
                        <button 
                            onClick={handleShare}
                            className="flex-1 flex flex-col items-center justify-center gap-1 bg-[#E5F0FF] dark:bg-[#006AFF]/20 p-2 py-4 rounded-[20px] transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        >
                            <div className="p-1 rounded-full"><svg fill="none" width="24" viewBox="0 0 24 24" height="24"><path fill="#0059D6" fillRule="evenodd" clipRule="evenodd" d="M11.839 4.744c0-1.488 1.724-2.277 2.846-1.364l.107.094 7.66 7.256.128.134c.558.652.558 1.62 0 2.272l-.128.135-7.66 7.255c-1.115 1.057-2.953.267-2.953-1.27v-2.748c-3.503.055-5.417.41-6.592.97-.997.474-1.525 1.122-2.084 2.14l-.243.46c-.558 1.088-2.09.583-2.08-.515l.015-.748c.111-3.68.777-6.5 2.546-8.415 1.83-1.98 4.63-2.771 8.438-2.884V4.744Zm2 3.256c0 .79-.604 1.41-1.341 1.494l-.149.01c-3.9.057-6.147.813-7.48 2.254-.963 1.043-1.562 2.566-1.842 4.79.38-.327.826-.622 1.361-.877 1.656-.788 4.08-1.14 7.938-1.169l.153.007c.754.071 1.36.704 1.36 1.491v2.675L20.884 12l-7045-6.676V8Z"></path></svg></div>
                            {shareCopySuccess ? <span className="text-[11.3px] font-bold text-[#0059D6]">Copied!</span> : <span className="text-[11.3px] font-bold text-[#0059D6]">Share</span>}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderConfirmDisable = () => (
        <div className="flex flex-col h-full animate-fadeIn p-6">
            <div className="absolute top-3 right-3">
                <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                    <FiX size={18} className="text-[#526580]" />
                </button>
            </div>
            
            <div className="flex flex-col items-center justify-center pt-4 mb-4">
                <svg fill="none" viewBox="0 0 24 24" width="48" height="48">
                    <path fill="#E91646" fillRule="evenodd" clipRule="evenodd" d="M14.3 23v-1.1a1 1 0 0 1 2 0V23a1 1 0 1 1-2 0Zm5.243-3.457a1 1 0 0 1 1.414 0l1.1 1.1a1 1 0 1 1-1.414 1.414l-1.1-1.1a1 1 0 0 1 0-1.414ZM4.788 9.298a1 1 0 0 1 1.424 1.404l-.742.752-.004.005a5.003 5.003 0 1 0 7.075 7.075l.005-.004.752-.742a1 1 0 0 1 1.404 1.424l-.747.736a7.003 7.003 0 1 1-9.904-9.904l.737-.746ZM23 14.3a1 1 0 0 1 0 2h-1.1a1 1 0 1 1 0-2H23ZM10.044 4.05a7.005 7.005 0 0 1 9.905 9.906h0l-.737.746a1 1 0 0 1-1.424-1.404l.742-.752.004-.005a5.003 5.003 0 1 0-7.075-7.075l-.005.004-.752.742a1 1 0 0 1-1.404-1.424l.746-.737ZM2.1 7.7a1 1 0 1 1 0 2H1a1 1 0 0 1 0-2h1.1Zm-.157-5.757a1 1 0 0 1 1.414 0l1.1 1.1a1 1 0 1 1-1.414 1.414l-1.1-1.1a1 1 0 0 1 0-1.414ZM7.7 2.1V1a1 1 0 1 1 2 0v1.1a1 1 0 0 1-2 0Z"></path>
                </svg>
            </div>

            <h2 className="text-[16.9px] font-bold text-black dark:text-white leading-[22px] text-center mb-2 px-4">
                Disable this invite link?
            </h2>
            
            <p className="text-[13.1px] leading-[17px] text-black dark:text-gray-300 text-center mb-6 px-4">
                Anyone who has it will no longer be able to join or request to join. You can always create a new one.
            </p>

            <div className="flex flex-col gap-3">
                <button 
                    onClick={handleDisable}
                    disabled={loading}
                    className="w-full bg-[#E91646] hover:bg-[#CA123D] py-3 rounded-full text-white font-medium text-[15px] transition-colors disabled:opacity-50"
                >
                    {loading ? 'Disabling...' : 'Disable link'}
                </button>
                <button 
                    onClick={() => setStep('active')}
                    className="w-full bg-[#EFF2F6] dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-white/10 py-3 rounded-full text-[#405168] dark:text-white font-medium text-[15px] transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );

    const renderDisabled = () => {
        const link = existingLink?.link || 'https://bsky.app/chat/...';
        const dateStr = existingLink?.createdAt ? new Date(existingLink.createdAt).toLocaleString() : 'Just now';

        return (
            <div className="flex flex-col h-full animate-fadeIn p-6">
                <div className="absolute top-3 right-3">
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                        <FiX size={18} className="text-[#526580]" />
                    </button>
                </div>

                <h2 className="text-[20.6px] font-bold text-black dark:text-white leading-[27px] mb-4">
                    Invite link disabled
                </h2>

                <div className="mb-4">
                    <div className="w-full bg-[#EFF2F6] dark:bg-dark-surface p-3 rounded-[10px] text-[15px] text-black/40 dark:text-white/40 truncate">
                        {link}
                    </div>
                    <p className="text-[11.3px] text-[#526580] dark:text-gray-400 mt-1">Created {dateStr}</p>
                </div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={handleUpdate} // Re-enable by saving settings again
                        className="w-full bg-[#006AFF] hover:bg-[#0052cc] py-3 rounded-full text-white font-medium text-[15px] transition-colors"
                    >
                        Re-enable link
                    </button>
                    <button 
                        onClick={() => {
                            // Logic to clear and move to generate would go here, 
                            // but for now re-use generate path
                            setStep('generate');
                        }}
                        className="w-full bg-[#EFF2F6] dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-white/10 py-3 rounded-full text-[#405168] dark:text-white font-medium text-[15px] transition-colors"
                    >
                        Generate new link
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-start lg:items-center justify-center pt-0 lg:pt-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-[400px] bg-white dark:bg-black rounded-none lg:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full lg:h-auto max-h-[100vh] lg:max-h-[85vh] lg:min-h-[200px] animate-zoomIn">
                {step === 'intro' && renderIntro()}
                {step === 'generate' && renderRules(existingLink !== null && existingLink !== undefined)}
                {step === 'active' && renderActive()}
                {step === 'confirmDisable' && renderConfirmDisable()}
                {step === 'disabled' && renderDisabled()}
            </div>
        </div>
    );
};

export default InviteLinkModal;

