import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { LoginFormData } from '../../types';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '../../redux/slices/languageSlice';
import { clearError, setAuth, removeSavedAccount } from '../../redux/slices/authSlice';
import { useLoginMutation } from '../../redux/api/authApi';
import { showToast } from '../../redux/slices/toastSlice';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import ButterflyLogo from '../../components/common/ButterflyLogo';
import Avatar from '../../components/common/Avatar';
import { APP_LANGUAGES } from '../../constants/languages';
import { FiPlus, FiChevronRight, FiMoreVertical, FiTrash2, FiUser, FiGlobe, FiEdit } from 'react-icons/fi';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { t, i18n } = useTranslation();
    useDocumentTitle(t('auth.login.title'));
    
    const appLanguage = useAppSelector((state) => state.language.appLanguage);
    const { error, savedAccounts } = useAppSelector((state) => state.auth);
    const [loginMutation, { isLoading: isMutationLoading }] = useLoginMutation();
    
    // View state: 'selector' if accounts exist, 'form' for new login
    const [view, setView] = useState<'selector' | 'form'>(savedAccounts.length > 0 ? 'selector' : 'form');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    const [formData, setFormData] = useState<LoginFormData>({
        identifier: '',
        password: '',
        rememberMe: true, // Default to true for multi-account persistence
    });

    const formatErrorMessage = (err: string | null) => {
        if (!err) return null;
        if (err.includes('{') && err.includes('}')) {
            try {
                const jsonPart = err.substring(err.indexOf('{'), err.lastIndexOf('}') + 1);
                const parsed = JSON.parse(jsonPart);
                if (parsed.message) return err.replace(jsonPart, parsed.message);
            } catch (e) {}
        }
        return err;
    };

    const handleLanguageChange = (lang: string) => {
        dispatch(setAppLanguage(lang));
        i18n.changeLanguage(lang);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = await loginMutation(formData).unwrap();
            dispatch(setAuth(data));
            navigate('/');
        } catch (err: any) {
            dispatch(showToast({
                message: formatErrorMessage(err?.data?.message || err?.message) || t('auth.login.error_generic'),
                type: 'error'
            }));
        }
    };

    const handleAccountClick = (handle: string) => {
        setFormData({ ...formData, identifier: handle });
        setView('form');
    };

    const handleRemoveAccount = (e: React.MouseEvent, did: string) => {
        e.stopPropagation();
        dispatch(removeSavedAccount(did));
        setActiveMenu(null);
    };

    // If accounts are empty and we are in selector view, switch to form
    useEffect(() => {
        if (savedAccounts.length === 0 && view === 'selector') {
            setView('form');
        }
    }, [savedAccounts, view]);

    return (
        <div className="min-h-screen bg-white dark:bg-dark-bg flex flex-col lg:flex-row">
            {/* Left Side - Branding (Pic 2 / Image 3 style) */}
            <div className="hidden lg:flex lg:flex-[1.2] bg-white dark:bg-dark-bg p-12 items-center justify-center border-r border-gray-100 dark:border-dark-border">
                <div className="text-center max-w-sm">
                    <h1 className="text-[64px] font-bold text-[#0085FF] leading-tight mb-4 select-none">
                        {view === 'selector' ? t('auth.login.sign_in_title_selector') : (t('auth.login.title') || 'Log in')}
                    </h1>
                    <p className="text-[18px] text-gray-500 dark:text-dark-text-secondary font-medium">
                        {view === 'selector' ? t('auth.login.select_existing') : t('auth.login.enter_details')}
                    </p>
                </div>
            </div>

            {/* Right Side - Auth Flow */}
            <div className="flex-1 flex items-center justify-center p-4 lg:p-12 bg-white dark:bg-dark-bg">
                <div className="w-full max-w-[400px]">
                    
                    {view === 'selector' ? (
                        /* PIC 1: Account Selector (Image 2) */
                        <div className="space-y-6">
                            <div>
                                <div className="text-[13px] font-bold text-gray-400 dark:text-dark-text-secondary mb-3 uppercase tracking-wider">
                                    {t('auth.login.sign_in_as') || 'auth.login.sign_in_as'}
                                </div>
                                
                                <div className="border border-gray-100 dark:border-dark-border rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-dark-surface">
                                    {savedAccounts.map((account, index) => (
                                        <div key={account.did}>
                                            <div 
                                                className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer transition-colors group relative"
                                                onClick={() => handleAccountClick(account.handle)}
                                            >
                                                <div className="w-12 h-12 flex-shrink-0 mr-3">
                                                    <Avatar src={account.avatar} alt={account.displayName} size="md" />
                                                </div>
                                                <div className="flex-1 min-w-0 mr-2 text-left">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[15px] font-bold text-gray-900 dark:text-dark-text truncate">
                                                            {account.displayName}
                                                        </span>
                                                    </div>
                                                    <div className="text-[13px] text-gray-500 dark:text-dark-text-secondary truncate">
                                                        @{account.handle}
                                                    </div>
                                                    <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                                                        {t('auth.login.logged_out')}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-border transition-colors z-20"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveMenu(activeMenu === account.did ? null : account.did);
                                                        }}
                                                    >
                                                        <FiMoreVertical className="text-gray-400" />
                                                    </button>
                                                </div>

                                                {/* Context Menu for Remove Account (PIC 5) */}
                                                {activeMenu === account.did && (
                                                    <div className="absolute right-4 top-14 w-48 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                                                        <button 
                                                            className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                                                            onClick={(e) => handleRemoveAccount(e, account.did)}
                                                        >
                                                            <FiTrash2 size={16} />
                                                            {t('auth.login.remove_account') || 'Remove account'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {index < savedAccounts.length - 0 && (
                                                <div className="border-b border-gray-50 dark:border-dark-border/50 mx-0" />
                                            )}
                                        </div>
                                    ))}

                                    {/* Other Account Row (Pic 1 Style) */}
                                    <button 
                                        className="w-full flex items-center p-4 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors group border-t border-gray-50 dark:border-dark-border"
                                        onClick={() => {
                                            setFormData({ identifier: '', password: '', rememberMe: true });
                                            setView('form');
                                        }}
                                    >
                                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-border flex items-center justify-center mr-3 group-hover:bg-gray-200 dark:group-hover:bg-dark-hover-darker transition-colors">
                                            <FiPlus className="text-gray-400" size={24} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <span className="text-[15px] font-bold text-gray-900 dark:text-dark-text">
                                                {t('auth.login.other_account')}
                                            </span>
                                        </div>
                                        <FiChevronRight className="text-gray-300 dark:text-dark-border" size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-start">
                                <button
                                    onClick={() => navigate('/welcome')}
                                    className="px-6 py-2.5 bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-border text-gray-900 dark:text-dark-text font-bold rounded-full transition-colors text-[15px]"
                                >
                                    {t('auth.login.back') || 'Back'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* PIC 2: Login Form (Image 3) */
                        <div className="space-y-6">
                            {/* Hosting Provider Row */}
                            <div className="space-y-2">
                                <label className="text-[13px] font-bold text-gray-400 dark:text-dark-text-secondary uppercase tracking-wider">
                                    {t('auth.signup.hosting_provider')}
                                </label>
                                <div className="flex items-center gap-3 p-4 bg-gray-100 dark:bg-dark-surface rounded-2xl border border-transparent shadow-sm">
                                    <FiGlobe className="text-gray-500" size={20} />
                                    <span className="flex-1 text-[16px] font-bold text-gray-900 dark:text-dark-text">Bluesky Social</span>
                                    <div className="bg-gray-200 dark:bg-dark-border p-1.5 rounded-lg cursor-not-allowed">
                                        <FiEdit className="text-gray-500" size={16} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h2 className="text-[13px] font-medium text-gray-500 dark:text-dark-text-secondary -mb-4">
                                    {t('auth.login.account_label') || 'Account'}
                                </h2>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {error && (
                                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                                            {formatErrorMessage(error)}
                                        </div>
                                    )}
                                    
                                    <div className="relative group">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-400 group-focus-within:text-[#0085FF] transition-colors">
                                            <FiUser size={20} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={t('auth.login.identifier_placeholder')}
                                            className="w-full pl-11 pr-4 py-3 bg-gray-100 dark:bg-dark-surface border-2 border-transparent focus:border-[#0085FF] focus:bg-white dark:focus:bg-dark-bg rounded-xl outline-none transition-all text-[15px] dark:text-dark-text"
                                            value={formData.identifier}
                                            onChange={(e) => {
                                                setFormData({ ...formData, identifier: e.target.value });
                                                if (error) dispatch(clearError());
                                            }}
                                            autoCapitalize="none"
                                            autoComplete="username"
                                        />
                                    </div>

                                    <div className="relative group">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-400 group-focus-within:text-[#0085FF] transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                        </div>
                                        <input
                                            type="password"
                                            placeholder={t('auth.login.password_placeholder')}
                                            className="w-full pl-11 pr-16 py-3 bg-gray-100 dark:bg-dark-surface border-2 border-transparent focus:border-[#0085FF] focus:bg-white dark:focus:bg-dark-bg rounded-xl outline-none transition-all text-[15px] dark:text-dark-text"
                                            value={formData.password}
                                            onChange={(e) => {
                                                setFormData({ ...formData, password: e.target.value });
                                                if (error) dispatch(clearError());
                                            }}
                                            autoComplete="current-password"
                                        />
                                        <button 
                                            type="button"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-200 dark:bg-dark-border hover:bg-gray-300 dark:hover:bg-dark-hover-darker px-3 py-1.5 rounded-lg text-[13px] font-medium text-gray-600 dark:text-dark-text-secondary transition-colors"
                                        >
                                            {t('auth.login.forgot_password_short') || 'Forgot?'}
                                        </button>
                                    </div>

                                    <div className="pt-4 flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (savedAccounts.length > 0) setView('selector');
                                                else navigate('/welcome');
                                            }}
                                            className="px-6 py-3 bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-border text-gray-600 dark:text-dark-text-secondary font-semibold rounded-full transition-colors text-[15px]"
                                        >
                                            {t('auth.login.back')}
                                        </button>

                                        <Button
                                            type="submit"
                                            variant="primary"
                                            className="!px-8 !py-3 !rounded-full !bg-[#0085FF] !hover:bg-[#0070DF] !text-white !font-bold !text-[15px] border-none shadow-sm"
                                            loading={isMutationLoading}
                                            disabled={isMutationLoading || !formData.identifier || !formData.password}
                                        >
                                            {t('auth.login.title')}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Language Selector */}
                    <div className="mt-12 text-center">
                        <select
                            value={appLanguage}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            className="text-sm font-medium text-gray-400 dark:text-dark-text-secondary bg-transparent border-none cursor-pointer hover:text-gray-600 transition-colors outline-none"
                        >
                            {APP_LANGUAGES.map((lang) => (
                                <option key={lang.code} value={lang.code} className="bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text">
                                    {lang.nativeName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            
            {/* Click away listener for menus */}
            {activeMenu && (
                <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)} />
            )}
        </div>
    );
};

export default LoginPage;
