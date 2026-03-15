import React from 'react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { RootState } from '../redux/store';
import { closeReport } from '../redux/slices/modalsSlice';
import { showToast } from '../redux/slices/toastSlice';
import { useTranslation } from 'react-i18next';
import { FiX, FiAlertTriangle, FiFlag } from 'react-icons/fi';
import { API_BASE_URL } from '../constants';

const ReportModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { isOpen, subject } = useAppSelector((state: RootState) => (state.modals as any).report);
    const [reasonType, setReasonType] = React.useState('com.atproto.moderation.defs#reasonOther');
    const [reason, setReason] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    if (!isOpen || !subject) return null;

    const reasons = [
        { id: 'com.atproto.moderation.defs#reasonSpam', label: t('moderation.reason_spam', 'Spam') },
        { id: 'com.atproto.moderation.defs#reasonViolation', label: t('moderation.reason_violation', 'Violation') },
        { id: 'com.atproto.moderation.defs#reasonMisleading', label: t('moderation.reason_misleading', 'Misleading') },
        { id: 'com.atproto.moderation.defs#reasonSexual', label: t('moderation.reason_sexual', 'Sexual Content') },
        { id: 'com.atproto.moderation.defs#reasonRude', label: t('moderation.reason_rude', 'Rude/Harassment') },
        { id: 'com.atproto.moderation.defs#reasonOther', label: t('moderation.reason_other', 'Other') },
    ];

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/xrpc/com.atproto.moderation.createReport`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reasonType,
                    reason: reason.trim(),
                    subject: subject.type === 'account' 
                        ? { $type: 'com.atproto.admin.defs#repoRef', did: subject.did }
                        : { $type: 'com.atproto.repo.strongRef', uri: subject.uri, cid: subject.cid }
                })
            });

            if (!response.ok) throw new Error('Failed to submit report');

            dispatch(showToast({ message: t('moderation.report_success', 'Report submitted. Thank you!'), type: 'success' }));
            dispatch(closeReport());
        } catch (error: any) {
            dispatch(showToast({ message: error.message || 'Report failed', type: 'error' }));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
            <div className="bg-white dark:bg-dark-bg w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 dark:border-dark-border">
                    <button 
                        onClick={() => dispatch(closeReport())}
                        className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                    >
                        <FiX size={22} className="text-gray-900 dark:text-dark-text" />
                    </button>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text">
                        {t('moderation.report_title', 'Report Content')}
                    </h2>
                    <div className="w-10"></div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 rounded-xl">
                        <FiAlertTriangle className="text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" size={20} />
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            {t('moderation.report_notice', 'Reports help us maintain a safe community. Our moderators will review this content.')}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-700 dark:text-dark-text-secondary">
                            {t('moderation.select_reason', 'Why are you reporting this?')}
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {reasons.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => setReasonType(r.id)}
                                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                                        reasonType === r.id
                                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                                            : 'border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-dark-surface'
                                    }`}
                                >
                                    <span className={`font-medium ${reasonType === r.id ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-dark-text'}`}>
                                        {r.label}
                                    </span>
                                    {reasonType === r.id && <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-white"></div>
                                    </div>}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 dark:text-dark-text-secondary">
                            {t('moderation.additional_details', 'Additional details (optional)')}
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={t('moderation.details_placeholder', 'Tell us more about the issue...')}
                            className="w-full min-h-[100px] p-4 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-dark-border">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full h-12 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold rounded-full shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <FiFlag size={18} />
                                {t('moderation.submit_report', 'Submit Report')}
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => dispatch(closeReport())}
                        disabled={isSubmitting}
                        className="w-full mt-2 h-10 text-gray-500 dark:text-dark-text-secondary font-medium hover:underline transition-all"
                    >
                        {t('common.cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportModal;
