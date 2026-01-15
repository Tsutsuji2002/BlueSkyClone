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

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t, i18n } = useTranslation();
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
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-dark-bg flex flex-col lg:flex-row">
            {/* Left Side - Branding (Hidden on mobile) */}
            <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary-500 to-primary-700 p-12 items-center justify-center">
                <div className="text-white text-center">
                    <svg
                        className="w-32 h-32 mx-auto mb-8"
                        viewBox="0 0 64 64"
                        fill="currentColor"
                    >
                        <path d="M13.873 3.805C21.21 9.332 29.103 20.537 32 26.55v15.882c0-.338-.13.044-.41.867-1.512 4.456-7.418 21.847-20.923 7.944-7.111-7.32-3.819-14.64 9.125-16.85-7.405 1.264-15.73-.825-18.014-9.015C1.12 23.022 0 8.51 0 6.55 0-3.268 8.579-.182 13.873 3.805zm36.254 0C42.79 9.332 34.897 20.537 32 26.55v15.882c0-.338.13.044.41.867 1.512 4.456 7.418 21.847 20.923 7.944 7.111-7.32 3.819-14.64-9.125-16.85 7.405 1.264 15.73-.825 18.014-9.015C62.88 23.022 64 8.51 64 6.55c0-9.818-8.579-6.732-13.873-2.745z" />
                    </svg>
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
                            <label className="flex items-center">
                                <input type="checkbox" className="mr-2" />
                                <span className="text-sm text-gray-600 dark:text-dark-text-secondary">
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
