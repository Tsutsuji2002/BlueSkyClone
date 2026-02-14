import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiBell, FiSend, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { adminService } from '../../services/adminService';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import ConfirmModal from '../../components/common/ConfirmModal';

const NotificationManagementPage: React.FC = () => {
    const { t } = useTranslation();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [role, setRole] = useState<'all' | 'user' | 'admin'>('all');
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    const handleBroadcastRequest = (e: React.FormEvent) => {
        e.preventDefault();
        setIsConfirmModalOpen(true);
    };

    const handleBroadcast = async () => {
        setIsConfirmModalOpen(false);
        setSending(true);
        setSuccess(null);
        setError(null);

        try {
            await adminService.broadcastNotification({
                title,
                content,
                type: 'System',
                targetRole: role === 'all' ? undefined : role
            });
            setSuccess(t('admin.notifications.sent_success'));
            setTitle('');
            setContent('');
            setRole('all');
        } catch (err) {
            console.error('Failed to broadcast notification:', err);
            setError(t('admin.notifications.send_error', 'Failed to send notification. Please try again.'));
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">
                    {t('admin.notifications.title')}
                </h1>
                <p className="text-gray-600 dark:text-dark-text-secondary">
                    {t('admin.notifications.desc')}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Broadcast Form */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <FiBell size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text">
                            {t('admin.notifications.create_btn', 'Create New Broadcast')}
                        </h2>
                    </div>

                    {success && (
                        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-2">
                            <FiCheckCircle size={20} />
                            {success}
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2">
                            <FiAlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleBroadcastRequest} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                                {t('admin.notifications.type_label', 'Title')}
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:text-dark-text"
                                placeholder="Announcement Title"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                                {t('admin.notifications.message_label', 'Message Content')}
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                required
                                rows={4}
                                className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:text-dark-text"
                                placeholder="Type your message here..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                                {t('admin.notifications.target_audience_label', 'Target Audience')}
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as any)}
                                className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:text-dark-text"
                            >
                                <option value="all">All Users</option>
                                <option value="user">Regular Users Only</option>
                                <option value="admin">Admins Only</option>
                            </select>
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                variant="primary"
                                loading={sending}
                                className="w-full justify-center"
                            >
                                <FiSend className="mr-2" />
                                {t('admin.notifications.send_btn', 'Send Broadcast')}
                            </Button>
                        </div>
                    </form>
                </Card>

                {/* Info Panel */}
                <div className="space-y-6">
                    <Card className="p-6 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
                        <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">
                            Best Practices
                        </h3>
                        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                            <li>• Keep notifications concise and clear.</li>
                            <li>• Use titles that grab attention but aren't clickbait.</li>
                            <li>• Target specific roles when the message isn't relevant to everyone.</li>
                            <li>• Avoid sending too many broadcasts to prevent user fatigue.</li>
                        </ul>
                    </Card>
                </div>
            </div>
            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleBroadcast}
                title={t('admin.notifications.broadcast_confirm_title', 'Confirm Broadcast')}
                message={t('admin.notifications.broadcast_confirm_message', 'Are you sure you want to send this notification to all users? This action cannot be undone.')}
                confirmLabel={t('admin.notifications.send_btn', 'Send Broadcast')}
                variant="primary"
            />
        </div>
    );
};

export default NotificationManagementPage;
