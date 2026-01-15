import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiPlus, FiTrash2, FiCopy, FiX, FiInfo, FiChevronRight } from 'react-icons/fi';
import Button from '../components/common/Button';

const AppPasswordResultModal: React.FC<{ isOpen: boolean; onClose: () => void; password: string; name: string }> = ({ isOpen, onClose, password, name }) => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold dark:text-dark-text">{t('privacy.app_password_modal_title')}</h2>
                    <button onClick={onClose}><FiX size={24} className="text-gray-500" /></button>
                </div>
                <p className="text-gray-600 dark:text-dark-text-secondary mb-6 text-[15px]">
                    {t('privacy.app_password_modal_desc')}
                </p>

                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6 relative">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{name}</p>
                    <div className="flex items-center justify-between">
                        <code className="text-lg font-mono font-bold text-gray-800 dark:text-gray-200">{password}</code>
                        <button onClick={handleCopy} className="text-blue-500 hover:text-blue-600 p-2">
                            {copied ? <span className="text-sm font-medium">Copied!</span> : <FiCopy size={20} />}
                        </button>
                    </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-6">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        {t('privacy.app_password_modal_warning')}
                    </p>
                </div>

                <Button variant="primary" fullWidth size="lg" onClick={onClose}>
                    {t('settings.done')}
                </Button>
            </div>
        </div>
    );
};

const AddAppPasswordInputModal: React.FC<{ isOpen: boolean; onClose: () => void; onNext: (name: string) => void }> = ({ isOpen, onClose, onNext }) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold dark:text-dark-text">{t('privacy.app_password_input_title')}</h2>
                    <button onClick={onClose}><FiX size={24} className="text-gray-500" /></button>
                </div>
                <p className="text-gray-600 dark:text-dark-text-secondary mb-6 text-[15px]">
                    {t('privacy.app_password_input_desc')}
                </p>

                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="SkyBlue"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                />

                <label className="flex items-center gap-3 mb-8 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-700 dark:text-gray-300 text-[15px]">{t('privacy.app_password_access_messages')}</span>
                </label>

                <Button variant="primary" fullWidth size="lg" onClick={() => onNext(name || 'SkyBlue')}>
                    {t('privacy.next')} <FiChevronRight className="ml-1 inline" />
                </Button>
            </div>
        </div>
    );
};

const AppPasswordsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [modalStep, setModalStep] = useState<'none' | 'input' | 'result'>('none');
    const [newPasswordName, setNewPasswordName] = useState('');
    const [passwords, setPasswords] = useState([
        { id: '1', name: 'BlueSky', created: '12:38 26/12/2025' }
    ]);

    const handleAddPasswordClick = () => {
        setModalStep('input');
    };

    const handleInputNext = (name: string) => {
        setNewPasswordName(name);
        setModalStep('result');
        // Mock adding to list
        setPasswords(prev => [{ id: Date.now().toString(), name: name, created: new Date().toLocaleString() }, ...prev]);
    };

    return (
        <MainLayout>
            <div className="min-h-screen bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border px-4 py-3 flex items-center gap-4">
                    <button
                        onClick={() => navigate('/settings/privacy')}
                        className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                    >
                        <FiArrowLeft size={20} className="dark:text-dark-text" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {t('privacy.app_passwords')}
                    </h1>
                </div>

                <div className="p-4">
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 flex gap-3">
                        <FiInfo className="text-blue-500 shrink-0 mt-0.5" size={20} />
                        <p className="text-[15px] text-gray-800 dark:text-gray-200 leading-relaxed">
                            {t('privacy.app_passwords_info')}
                        </p>
                    </div>

                    <Button variant="primary" fullWidth className="mb-8 py-3" onClick={handleAddPasswordClick}>
                        <FiPlus className="mr-2" />
                        {t('privacy.add_app_password')}
                    </Button>

                    <div className="space-y-4">
                        {passwords.map((pwd) => (
                            <div key={pwd.id} className="border border-gray-200 dark:border-dark-border rounded-xl p-4 flex justify-between items-center bg-white dark:bg-dark-surface">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-dark-text mb-1">{pwd.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('privacy.created_at', { date: pwd.created })}</p>
                                </div>
                                <button className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 p-2 rounded-full transition-colors">
                                    <FiTrash2 size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <AddAppPasswordInputModal
                isOpen={modalStep === 'input'}
                onClose={() => setModalStep('none')}
                onNext={handleInputNext}
            />

            <AppPasswordResultModal
                isOpen={modalStep === 'result'}
                onClose={() => setModalStep('none')}
                password="ttid-i5sa-xhy4-si6f"
                name={newPasswordName}
            />
        </MainLayout>
    );
};

export default AppPasswordsPage;
