import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { LoginFormData } from '../../types';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '../../redux/slices/languageSlice';
import { login, clearError } from '../../redux/slices/authSlice';
import { showToast } from '../../redux/slices/toastSlice';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import ButterflyLogo from '../../components/common/ButterflyLogo';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t, i18n } = useTranslation();
    useDocumentTitle(t('auth.login.title'));
    const appLanguage = useAppSelector((state) => state.language.appLanguage);
    const { isLoading, error } = useAppSelector((state) => state.auth);

    const handleLanguageChange = (lang: string) => {
        dispatch(setAppLanguage(lang));
        i18n.changeLanguage(lang);
    };
    const [formData, setFormData] = useState<LoginFormData>({
        identifier: '',
        password: '',
        rememberMe: false,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const resultAction = await dispatch(login(formData));
        if (login.fulfilled.match(resultAction)) {
            navigate('/');
        } else if (login.rejected.match(resultAction)) {
            dispatch(showToast({
                message: resultAction.payload as string || t('auth.login.error_generic'),
                type: 'error'
            }));
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-dark-bg flex flex-col lg:flex-row">
            {/* Left Side - Branding (Hidden on mobile) */}
            <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary-500 to-primary-700 p-12 items-center justify-center">
                <div className="text-white text-center">
                    <ButterflyLogo size={128} className="mx-auto mb-8 text-white" />
                    <h1 className="text-4xl font-bold mb-4">{t('auth.login.welcome_back')}</h1>
                    <p className="text-xl opacity-90">{t('auth.login.login_to_continue')}</p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-4 lg:p-12">
                <div className="w-full max-w-md">
                    <div className="mb-8">
                        <button
                            onClick={() => navigate('/welcome')}
                            className="text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text mb-6 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            {t('auth.login.back')}
                        </button>

                        <h2 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-2">
                            {t('auth.login.title')}
                        </h2>
                        <p className="text-gray-600 dark:text-dark-text-secondary">
                            {t('auth.login.login_to_continue')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                        <Input
                            type="text"
                            label={t('auth.login.identifier_label')}
                            placeholder={t('auth.login.identifier_placeholder')}
                            value={formData.identifier}
                            onChange={(e) => {
                                setFormData({ ...formData, identifier: e.target.value });
                                if (error) dispatch(clearError());
                            }}
                        />

                        <Input
                            type="password"
                            label={t('auth.login.password_label')}
                            placeholder={t('auth.login.password_placeholder')}
                            value={formData.password}
                            onChange={(e) => {
                                setFormData({ ...formData, password: e.target.value });
                                if (error) dispatch(clearError());
                            }}
                        />

                        <div className="flex items-center justify-between">
                            <label className="flex items-center cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                    checked={formData.rememberMe}
                                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                                />
                                <span className="ml-2 text-sm text-gray-600 dark:text-dark-text-secondary group-hover:text-gray-900 dark:group-hover:text-dark-text transition-colors">
                                    {t('auth.login.remember_me')}
                                </span>
                            </label>

                            <button
                                type="button"
                                className="text-sm text-primary-500 hover:underline"
                            >
                                {t('auth.login.forgot_password')}
                            </button>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            fullWidth
                            loading={isLoading}
                            disabled={isLoading}
                        >
                            {t('auth.login.title')}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600 dark:text-dark-text-secondary">
                            {t('auth.login.no_account')}{' '}
                            <button
                                onClick={() => navigate('/signup')}
                                className="text-primary-500 hover:underline font-semibold"
                            >
                                {t('auth.login.signup_now')}
                            </button>
                        </p>
                    </div>

                    {/* Language Selector */}
                    <div className="mt-8 text-center">
                        <select
                            value={appLanguage}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            className="text-sm text-gray-600 dark:text-dark-text-secondary bg-transparent border-none cursor-pointer"
                        >
                            <option value="vi">{t('language.vi')}</option>
                            <option value="en">{t('language.en')}</option>
                            <option value="de">{t('language.de')}</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
