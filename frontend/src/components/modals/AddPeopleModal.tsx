import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiSearch, FiCheck } from 'react-icons/fi';
import Avatar from '../common/Avatar';
import LoadingIndicator from '../common/LoadingIndicator';
import api from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { addMembers } from '../../redux/slices/messagesSlice';

interface AddPeopleModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: string;
    existingParticipants?: any[];
}

const AddPeopleModal: React.FC<AddPeopleModalProps> = ({ 
    isOpen, 
    onClose, 
    conversationId,
    existingParticipants = [] 
}) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        } else {
            setSearchQuery('');
            setResults([]);
            setSelectedUsers([]);
            setError(null);
        }
    }, [isOpen]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                setLoading(true);
                try {
                    const response = await api.search.users(searchQuery);
                    setResults(response.data || []);
                } catch (err) {
                    console.error('Failed to search users:', err);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const isAlreadyMember = (user: any) => {
        return existingParticipants.some(p => (p.did || (p as any).id) === (user.did || (user as any).id));
    };

    const handleToggleUser = (user: any) => {
        if (isAlreadyMember(user)) return;
        
        const isSelected = selectedUsers.some(u => (u.did || (u as any).id) === (user.did || (user as any).id));
        if (isSelected) {
            setSelectedUsers(prev => prev.filter(u => (u.did || (u as any).id) !== (user.did || (user as any).id)));
        } else {
            setSelectedUsers(prev => [...prev, user]);
        }
    };

    const handleAddPeople = async () => {
        if (selectedUsers.length === 0) return;

        setLoading(true);
        setError(null);
        try {
            const memberIds = selectedUsers.map(u => u.did || u.id);
            const resultAction = await dispatch(addMembers({ conversationId, members: memberIds }) as any);
            
            if (addMembers.fulfilled.match(resultAction)) {
                onClose();
            } else {
                setError(resultAction.payload as string || 'Failed to add members');
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const SUGGESTED_USERS = [
        { did: 'did:plc:2uueinkgzwo3lnlvlt5rvecv', handle: 'hrosenborg.bsky.social', displayName: 'Henrik Rosenborg (Open for work)', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:2uueinkgzwo3lnlvlt5rvecv/bafkreigvxqek6oeeccoj4cmdkyhebzc3uerxj662vh2aodvdse3pbc4ku4' },
        { did: 'did:plc:pb7gp4lz3cslvw4oha36b4fa', handle: 'aidenr0.bsky.social', displayName: 'SPiNDLE', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:pb7gp4lz3cslvw4oha36b4fa/bafkreiehuo4rch6qe6dyt4zrj3tsejhkgalrzqhklhehizsp2hnwnx6aie' },
        { did: 'did:plc:w4ngtpcrryag6omeu63mlj3l', handle: 'darkcurtain.bsky.social', displayName: 'darkcurtain.bsky.social', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:w4ngtpcrryag6omeu63mlj3l/bafkreihx4434pppsqv2cgnlla4xpldhcykbpqendqh55wc6j6dzjy7evru' },
        { did: 'did:plc:6h7zo2yvfexpm52p3mi7uwoc', handle: 'komiflo.com', displayName: 'Komiflo', avatar: 'https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:6h7zo2yvfexpm52p3mi7uwoc/bafkreigti2zn2gol3ugju6jikqeaqshe3uhazoinitx2sokwhmkehgeeve' },
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-start lg:items-center justify-center pt-0 lg:pt-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-[500px] bg-white dark:bg-black rounded-none lg:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full lg:h-auto max-h-[100vh] lg:max-h-[80vh] lg:min-h-[200px] animate-zoomIn">
                {/* Header */}
                <div className="relative flex items-center justify-center px-4 pt-4 pb-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-black">
                    <h2 className="text-[16.9px] font-bold text-[#232e3e] dark:text-white leading-[19px] tracking-[0.25px] z-10 px-10 text-center flex-grow">
                        Add people
                    </h2>
                    
                    <button 
                        onClick={onClose}
                        className="absolute right-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors z-20"
                    >
                        <svg fill="none" width="24" viewBox="0 0 24 24" height="24" style={{ color: '#526580' }}>
                            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L12 10.586l6.293-6.293a1 1 0 1 1 1.414 1.414L13.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414L12 13.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L10.586 12 4.293 5.707a1 1 0 0 1 0-1.414Z"></path>
                        </svg>
                    </button>
                </div>

                {/* Search Input */}
                <div className="px-4 py-1 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-black">
                    <div className="flex flex-row items-center gap-2">
                        <svg fill="none" viewBox="0 0 24 24" width="20" height="20">
                            <path fill="#A5B2C5" fillRule="evenodd" clipRule="evenodd" d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm-8 6a8 8 0 1 1 14.32 4.906l3.387 3.387a1 1 0 0 1-1.414 1.414l-3.387-3.387A8 8 0 0 1 3 11Z"></path>
                        </svg>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search for people"
                            className="flex-1 bg-transparent py-3 text-[15px] text-black dark:text-white outline-none placeholder-[#667B99]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Error area */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-950 p-2 border-b border-red-100 dark:border-red-900">
                        <p className="text-[12px] text-red-600 dark:text-red-400 text-center font-medium">{error}</p>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar pb-[72px]">
                    {!searchQuery && (
                        <>
                            <div className="px-4 pt-4 pb-2">
                                <span className="text-[11.3px] font-medium tracking-[0.25px] text-[#232e3e] dark:text-[#a5b2c5] uppercase">Suggested</span>
                            </div>
                            <div className="flex flex-col">
                                {SUGGESTED_USERS.map((user) => (
                                    <button
                                        key={user.did}
                                        onClick={() => handleToggleUser(user)}
                                        className="w-full flex flex-row items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                                    >
                                        <div className="relative w-11 h-11 shrink-0">
                                            <Avatar src={user.avatar} alt={user.displayName} size="lg" />
                                            <div className="absolute inset-0 border border-black/10 dark:border-white/10 rounded-full" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[15px] font-semibold text-black dark:text-white truncate leading-5">{user.displayName}</p>
                                            <p className="text-[13.1px] text-[#526580] dark:text-[#a5b2c5] truncate leading-4">@{user.handle}</p>
                                        </div>
                                        {isAlreadyMember(user) ? (
                                            <div className="px-2.5 py-1 bg-gray-100 dark:bg-white/10 rounded-full">
                                                <span className="text-[11px] font-bold text-[#526580] dark:text-gray-400">Member</span>
                                            </div>
                                        ) : (
                                            <div className={`w-[24px] h-[24px] border rounded-[6px] flex items-center justify-center transition-colors ${selectedUsers.some(u => (u.did || (u as any).id) === (user.did || (user as any).id)) ? 'bg-[#006AFF] border-[#006AFF]' : 'bg-[#F9FAFB] dark:bg-white/5 border-[#DCE2EA] dark:border-dark-border'}`}>
                                                {selectedUsers.some(u => (u.did || (u as any).id) === (user.did || (user as any).id)) && (
                                                    <svg fill="none" width="14" height="14" viewBox="0 0 24 24">
                                                        <path fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd" d="M17.659 8.175a1.361 1.361 0 0 1 0 1.925l-6.224 6.223a1.361 1.361 0 0 1-1.925 0L6.4 13.212a1.361 1.361 0 0 1 1.925-1.925l2.149 2.148 5.26-5.26a1.361 1.361 0 0 1 1.925 0Z"></path>
                                                    </svg>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {searchQuery && (
                        <div className="flex flex-col">
                            {loading ? (
                                <div className="py-12 flex justify-center"><LoadingIndicator size="md" /></div>
                            ) : results.length > 0 ? (
                                results.map((user) => (
                                    <button
                                        key={user.did || (user as any).id}
                                        onClick={() => handleToggleUser(user)}
                                        className="w-full flex flex-row items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                                    >
                                        <Avatar src={user.avatarUrl || user.avatar} alt={user.displayName || user.handle} size="lg" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[15px] font-semibold text-black dark:text-white truncate leading-5">{user.displayName || user.handle}</p>
                                            <p className="text-[13.1px] text-[#526580] dark:text-[#a5b2c5] truncate leading-4">@{user.handle}</p>
                                        </div>
                                        {isAlreadyMember(user) ? (
                                            <div className="px-2.5 py-1 bg-gray-100 dark:bg-white/10 rounded-full">
                                                <span className="text-[11px] font-bold text-[#526580] dark:text-gray-400">Member</span>
                                            </div>
                                        ) : (
                                            <div className={`w-[24px] h-[24px] border rounded-[6px] flex items-center justify-center transition-colors ${selectedUsers.some(u => (u.did || (u as any).id) === (user.did || (user as any).id)) ? 'bg-[#006AFF] border-[#006AFF]' : 'bg-[#F9FAFB] dark:bg-white/5 border-[#DCE2EA] dark:border-dark-border'}`}>
                                                {selectedUsers.some(u => (u.did || (u as any).id) === (user.did || (user as any).id)) && (
                                                    <svg fill="none" width="14" height="14" viewBox="0 0 24 24">
                                                        <path fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd" d="M17.659 8.175a1.361 1.361 0 0 1 0 1.925l-6.224 6.223a1.361 1.361 0 0 1-1.925 0L6.4 13.212a1.361 1.361 0 0 1 1.925-1.925l2.149 2.148 5.26-5.26a1.361 1.361 0 0 1 1.925 0Z"></path>
                                                    </svg>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                ))
                            ) : (
                                <div className="py-20 text-center px-10 text-[#526580] dark:text-[#667B99]">No results found</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-white dark:bg-black border-t border-gray-200 dark:border-dark-border flex items-center justify-between">
                    <button 
                        onClick={onClose}
                        className="flex items-center gap-1 px-3.5 py-2 bg-[#EFF2F6] dark:bg-dark-surface rounded-full text-[13.1px] font-medium text-[#405168] dark:text-white"
                    >
                        <svg fill="none" width="18" viewBox="0 0 24 24" height="18" style={{ color: '#405168' }}>
                            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M3 12a1 1 0 0 1 .293-.707l6-6a1 1 0 0 1 1.414 1.414L6.414 11H20a1 1 0 1 1 0 2H6.414l4.293 4.293a1 1 0 0 1-1.414 1.414l-6-6A1 1 0 0 1 3 12Z"></path>
                        </svg>
                        Back
                    </button>
                    
                    <button
                        onClick={handleAddPeople}
                        disabled={selectedUsers.length === 0 || loading}
                        className={`px-4 py-2 rounded-full font-medium text-[13.1px] transition-all ${selectedUsers.length > 0 ? 'bg-[#A8CCFF] text-white hover:bg-[#006aff]' : 'bg-[#A8CCFF] text-white/70 cursor-not-allowed'}`}
                    >
                        {loading ? 'Adding...' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddPeopleModal;
