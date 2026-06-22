import React, { useState } from 'react';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { showToast } from '../../redux/slices/toastSlice';

interface ReportConversationModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: string;
    conversationName?: string;
}

type ReportReason = 
    | 'misleading'
    | 'adult-content'
    | 'harassment'
    | 'violence'
    | 'child-safety'
    | 'self-harm'
    | 'breaking-rules'
    | 'other';

const ReportConversationModal: React.FC<ReportConversationModalProps> = ({ 
    isOpen, 
    onClose, 
    conversationId,
    conversationName 
}) => {
    const dispatch = useAppDispatch();
    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
    const [additionalDetails, setAdditionalDetails] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reportReasons: { id: ReportReason; label: string; description?: string }[] = [
        { id: 'misleading', label: 'Misleading', description: 'Spam or misleading content' },
        { id: 'adult-content', label: 'Adult content', description: 'Explicit sexual content' },
        { id: 'harassment', label: 'Harassment or hate', description: 'Hateful or abusive behavior' },
        { id: 'violence', label: 'Violence', description: 'Threats or graphic violence' },
        { id: 'child-safety', label: 'Child safety', description: 'Content that endangers children' },
        { id: 'self-harm', label: 'Self-harm or dangerous behaviors', description: 'Content promoting harm' },
        { id: 'breaking-rules', label: 'Breaking site rules', description: 'Violates platform policies' },
        { id: 'other', label: 'Other', description: 'Something else' },
    ];

    const handleSubmit = async () => {
        if (!selectedReason) {
            setError('Please select a reason for reporting');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const API_URL = process.env.REACT_APP_API_URL || '/api';
            const response = await fetch(`${API_URL}/chat/conversations/${conversationId}/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    reason: selectedReason,
                    details: additionalDetails.trim() || undefined
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to submit report');
            }

            dispatch(showToast({ 
                message: 'Report submitted successfully. Thank you for keeping the community safe.', 
                type: 'success' 
            }));
            
            // Reset form and close
            setSelectedReason(null);
            setAdditionalDetails('');
            onClose();
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to submit report';
            setError(errorMsg);
            dispatch(showToast({ message: errorMsg, type: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedReason(null);
        setAdditionalDetails('');
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative w-full max-w-[500px] max-h-[90vh] bg-white dark:bg-black rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-gray-200 dark:border-dark-border">
                    <h2 className="text-[20.6px] font-bold text-black dark:text-white leading-[27px] mb-1 font-sans">
                        Report conversation
                    </h2>
                    <div className="absolute top-3 right-3">
                        <button 
                            onClick={handleClose} 
                            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        >
                            <FiX size={18} className="text-[#526580]" />
                        </button>
                    </div>
                    {conversationName && (
                        <p className="text-[13px] text-gray-500 dark:text-gray-400">
                            {conversationName}
                        </p>
                    )}
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <p className="text-[15px] leading-[20px] text-black dark:text-gray-300 mb-4">
                        Help us understand the problem. What is going on with this conversation?
                    </p>

                    {/* Report Reasons */}
                    <div className="flex flex-col gap-1 mb-4">
                        {reportReasons.map((reason) => {
                            const isSelected = selectedReason === reason.id;
                            return (
                                <button
                                    key={reason.id}
                                    onClick={() => setSelectedReason(reason.id)}
                                    className={`flex flex-col gap-0.5 py-3 px-4 rounded-xl text-left transition-colors ${
                                        isSelected 
                                            ? 'bg-[#E5F0FF] dark:bg-[#006AFF]/20 border border-[#006AFF]' 
                                            : 'hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent'
                                    }`}
                                >
                                    <span className={`text-[15px] font-semibold leading-[17px] ${
                                        isSelected 
                                            ? 'text-[#006AFF]' 
                                            : 'text-[#232E3E] dark:text-gray-200'
                                    }`}>
                                        {reason.label}
                                    </span>
                                    {reason.description && (
                                        <span className="text-[13px] text-gray-500 dark:text-gray-400">
                                            {reason.description}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Additional Details Textarea */}
                    <div className="mb-4">
                        <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Additional details (optional)
                        </label>
                        <textarea
                            value={additionalDetails}
                            onChange={(e) => setAdditionalDetails(e.target.value)}
                            placeholder="Provide any additional context that might help us review this report..."
                            className="w-full h-24 px-3 py-2 text-[15px] bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#006AFF] focus:border-transparent text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                            maxLength={500}
                        />
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 text-right">
                            {additionalDetails.length}/500
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                            <FiAlertTriangle className="text-red-500 shrink-0" size={16} />
                            <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 pt-4 border-t border-gray-200 dark:border-dark-border">
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !selectedReason}
                            className="w-full flex flex-row items-center justify-center bg-[#E91646] hover:bg-[#CA123D] py-3 rounded-full text-white font-medium text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Submitting...</span>
                                </div>
                            ) : (
                                'Submit report'
                            )}
                        </button>
                        <button
                            onClick={handleClose}
                            disabled={loading}
                            className="w-full bg-[#EFF2F6] dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-white/10 py-3 rounded-full text-[#405168] dark:text-white font-medium text-[15px] transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportConversationModal;
