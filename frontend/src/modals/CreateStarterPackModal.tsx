import React, { useState } from 'react';
import { useAppDispatch } from '../redux/hooks';
import { showToast } from '../redux/slices/toastSlice';

interface CreateStarterPackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const CreateStarterPackModal: React.FC<CreateStarterPackModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const dispatch = useAppDispatch();
    const [step, setStep] = useState<1 | 2>(1);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<Array<{ did: string; handle: string; displayName?: string; avatar?: string }>>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleAddUser = () => {
        if (!searchQuery.trim()) return;
        const clean = searchQuery.trim().replace(/^@/, '');
        if (selectedUsers.some(u => u.handle.toLowerCase() === clean.toLowerCase())) {
            dispatch(showToast({ message: 'User already added', type: 'error' }));
            return;
        }

        setSelectedUsers(prev => [
            ...prev,
            {
                did: `did:plc:${Math.random().toString(36).substr(2, 9)}`,
                handle: clean,
                displayName: clean,
            }
        ]);
        setSearchQuery('');
    };

    const handleRemoveUser = (did: string) => {
        setSelectedUsers(prev => prev.filter(u => u.did !== did));
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            dispatch(showToast({ message: 'Please enter a name for the starter pack', type: 'error' }));
            return;
        }

        setIsSubmitting(true);
        try {
            // Simulate creation response
            await new Promise(res => setTimeout(res, 800));
            dispatch(showToast({ message: 'Starter pack created successfully!', type: 'success' }));
            if (onSuccess) onSuccess();
            onClose();
        } catch {
            dispatch(showToast({ message: 'Failed to create starter pack', type: 'error' }));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-fadeIn">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Create Starter Pack
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {step === 1 ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                                    Starter Pack Name *
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. AI & Tech Builders"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    placeholder="Describe who is in this pack and why people should follow..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                                    Add People by Handle
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
                                        placeholder="handle.bsky.social"
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                    />
                                    <button
                                        onClick={handleAddUser}
                                        className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            {/* Selected Members */}
                            <div className="max-h-56 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-800 rounded-xl p-3 bg-gray-50 dark:bg-gray-800/40">
                                {selectedUsers.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-4">No members added yet.</p>
                                ) : (
                                    selectedUsers.map((user) => (
                                        <div
                                            key={user.did}
                                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm"
                                        >
                                            <span className="font-semibold text-gray-900 dark:text-white truncate">
                                                @{user.handle}
                                            </span>
                                            <button
                                                onClick={() => handleRemoveUser(user.did)}
                                                className="text-xs text-red-500 hover:underline font-medium"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-200 dark:border-gray-800">
                    {step === 2 ? (
                        <button
                            onClick={() => setStep(1)}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            Back
                        </button>
                    ) : <div />}

                    {step === 1 ? (
                        <button
                            onClick={() => {
                                if (!name.trim()) {
                                    dispatch(showToast({ message: 'Please enter a name first', type: 'error' }));
                                    return;
                                }
                                setStep(2);
                            }}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                            Next: Add People
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Pack'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
