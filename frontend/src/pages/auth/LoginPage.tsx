import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { LoginFormData } from '../../types';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '../../redux/slices/languageSlice';
import { clearError, setAuth, removeSavedAccount, setSessionExpired } from '../../redux/slices/authSlice';
import { useLoginMutation, useSwitchAccountMutation } from '../../redux/api/authApi';
import { showToast } from '../../redux/slices/toastSlice';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import ButterflyLogo from '../../components/common/ButterflyLogo';
import Avatar from '../../components/common/Avatar';
import { APP_LANGUAGES } from '../../constants/languages';
import { AccountManager } from '../../utils/accountManager';
import { FiPlus, FiChevronRight, FiMoreVertical, FiTrash2, FiUser, FiGlobe, FiEdit } from 'react-icons/fi';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { t, i18n } = useTranslation();
    useDocumentTitle(t('auth.login.title'));
    
    const appLanguage = useAppSelector((state) => state.language.appLanguage);
    const { error, savedAccounts, isAuthenticated } = useAppSelector((state) => state.auth);
    // Read active account synchronously from localStorage — avoids race with async Redux auth check
    const activeAccountId = AccountManager.getActiveAccountId();
    const [loginMutation, { isLoading: isMutationLoading }] = useLoginMutation();
    const [switchMutation, { isLoading: isSwitchLoading }] = useSwitchAccountMutation();
    
    // View state: 'selector' if accounts exist, 'form' for new login
    const [view, setView] = useState<'selector' | 'form'>(savedAccounts.length > 0 ? 'selector' : 'form');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    const [formData, setFormData] = useState<LoginFormData>({
        identifier: '',
        password: '',
        rememberMe: true, // Default to true for multi-account persistence
    });
    
    // [NEW] Intelligent Back Navigation Helper
    const handleBack = () => {
        const state = location.state as { from?: { pathname: string } } | null;
        const fromPath = state?.from?.pathname;

        // 1. If we have a 'from' location, check if it's safe to return to
        if (fromPath && fromPath !== '/login' && fromPath !== '/signup' && fromPath !== '/welcome') {
            // Guard: If unauthenticated, avoid returning to protected pages that would just redirect here again.
            const isProtected = ['/settings', '/notifications', '/messages', '/feeds/settings', '/lists', '/saved', '/interests', '/admin']
                .some(prefix => fromPath.startsWith(prefix));

            if (!isAuthenticated && isProtected) {
                navigate('/', { replace: true });
            } else {
                navigate(fromPath, { replace: true });
            }
            return;
        }

        // 2. If no valid 'from' state, try history back if we have history
        if (window.history.length > 2) { // > 2 because current entry and potentially a prev one in this app
             navigate(-1);
        } else {
            // 3. Absolute fallback is the "Home" (Discover for guests, Timeline for auth)
            navigate('/', { replace: true });
        }
    };

    // Handle pre-filling from navigation state (used for switching accounts from sidebar)
    React.useEffect(() => {
        const state = location.state as { prefillHandle?: string } | null;
        if (state?.prefillHandle) {
            setFormData(prev => ({ ...prev, identifier: state.prefillHandle! }));
            setView('form');
            // Clear the state once handled to prevent repeated triggers on navigation
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, location.pathname, navigate]);

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
            // HTTP 429 = rate limited by the server
            const status = err?.status || err?.data?.status;
            let message: string;
            if (status === 429) {
                message = t('auth.login.error_rate_limit');
            } else {
                message = formatErrorMessage(err?.data?.message || err?.message) || t('auth.login.error_generic');
            }
            dispatch(showToast({ message, type: 'error' }));
        }
    };

    const handleAccountClick = async (account: any) => {
        const isActiveAccount = isAuthenticated && activeAccountId && String(account.id) === activeAccountId;
        if (isActiveAccount) {
            navigate('/');
            return;
        }

        // Try instant switch if account has a token
        const storedAccount = savedAccounts.find(a => a.did === account.did);
        if (storedAccount?.refreshToken) {
            try {
                const data = await switchMutation({ refreshToken: storedAccount.refreshToken }).unwrap();
                dispatch(setAuth(data));
                dispatch(showToast({ message: `Signed in as @${account.handle}`, type: 'success' }));
                navigate('/');
                return;
            } catch (err: any) {
                console.warn('Instant switch failed, falling back to login form', err);
                // If it's a 401, we KNOW the token is dead. Mark as expired to show status in UI.
                if (err?.status === 401) {
                    dispatch(setSessionExpired(account.did));
                }
                // Fallback to login form
            }
        }

        setFormData({ ...formData, identifier: account.handle });
        setView('form');
    };

    const handleRemoveAccount = (e: React.MouseEvent, did: string) => {
        e.stopPropagation();
        dispatch(removeSavedAccount(did));
        setActiveMenu(null);
    };

    // Removed global auto-redirect to allow "Add account" while logged in.
    // Redeirection is now handled in the login/switch handlers on success.

    // If accounts are empty and we are in selector view, switch to form
    useEffect(() => {
        if (savedAccounts.length === 0 && view === 'selector') {
            setView('form');
        }
    }, [savedAccounts, view]);

    return (
        <div className="min-h-screen bg-white dark:bg-dark-bg flex flex-col lg:flex-row">
            {/* Left Side - Branding (Refined to match official app) */}
            <div className="hidden lg:flex lg:flex-1 bg-white dark:bg-dark-bg p-12 items-center justify-center border-r border-gray-100 dark:border-dark-border">
                <div className="text-center max-w-sm">
                    <h1 className="text-[72px] font-bold text-[#0085FF] leading-tight mb-2 select-none">
                        {t('auth.login.hero_title') || 'Sign in'}
                    </h1>
                    <p className="text-[20px] text-gray-500 dark:text-dark-text-secondary font-medium">
                        {t('auth.login.hero_subtitle') || 'Select from an existing account'}
                    </p>
                </div>
            </div>

            {/* Right Side - Auth Flow */}
            <div className="flex-1 flex items-center justify-center p-4 lg:p-12 bg-white dark:bg-dark-bg">
                <div className="w-full max-w-[400px]">
                    
                    {view === 'selector' ? (
                        /* PIC 1: Account Selector Refined to match bsky.app */
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <div className="text-[13px] font-bold text-gray-400 dark:text-dark-text-secondary mb-3 uppercase tracking-wider">
                                    {t('auth.login.sign_in_as') || 'Sign in as...'}
                                </div>
                                
                                <div className="border border-gray-100 dark:border-dark-border rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-dark-surface">
                                    {savedAccounts.map((account, index) => {
                                        const isActive = isAuthenticated && activeAccountId && String(account.id) === activeAccountId;
                                        const isExpired = !account.refreshToken;


                                        return (
                                            <div key={account.did}>
                                                <div 
                                                    className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer transition-colors group relative"
                                                    onClick={() => handleAccountClick(account)}
                                                >
                                                    <div className="w-12 h-12 flex-shrink-0 mr-3">
                                                        <Avatar src={account.avatar} alt={account.displayName} size="md" />
                                                    </div>
                                                    <div className="flex-1 min-w-0 mr-2 text-left">
                                                        <div className="flex flex-col">
                                                            <span className="text-[15px] font-bold text-gray-900 dark:text-dark-text truncate leading-tight">
                                                                {account.displayName || account.handle}
                                                            </span>
                                                            <span className="text-[13px] text-gray-500 dark:text-dark-text-secondary truncate">
                                                                @{account.handle}
                                                            </span>
                                                        </div>
                                                        {isExpired && !isActive && (
                                                            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-0.5 uppercase tracking-tight">
                                                                {t('auth.login.logged_out') || 'Logged out'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3">
                                                        {isActive ? (
                                                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">
                                                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                            </div>
                                                        ) : !isExpired && (
                                                            <FiChevronRight className="text-gray-300 dark:text-dark-border" size={20} />
                                                        )}
                                                        
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
                                                {index < savedAccounts.length - 1 && (
                                                    <div className="border-b border-gray-50 dark:border-dark-border/50" />
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Other Account Row */}
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
                                                {t('auth.login.other_account') || 'Other account'}
                                            </span>
                                        </div>
                                        <FiChevronRight className="text-gray-300 dark:text-dark-border" size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-start">
                                <button
                                    onClick={handleBack}
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
                                    {t('auth.login.account_label')}
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
                                            {t('auth.login.forgot_password_short')}
                                        </button>
                                    </div>

                                    <div className="pt-4 flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (savedAccounts.length > 0) setView('selector');
                                                else handleBack();
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
