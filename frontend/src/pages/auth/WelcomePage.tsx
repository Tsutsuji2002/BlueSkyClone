import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { setAppLanguage } from '../../redux/slices/languageSlice';
import Button from '../../components/common/Button';

const WelcomePage: React.FC = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const dispatch = useAppDispatch();
    const appLanguage = useAppSelector((state) => state.language.appLanguage);

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const lang = e.target.value;
        dispatch(setAppLanguage(lang));
        i18n.changeLanguage(lang);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-dark-bg flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 lg:p-6">
                <svg
                    className="w-8 h-8 lg:w-10 lg:h-10 text-primary-500"
                    viewBox="0 0 64 64"
                    fill="currentColor"
                >
                    <path d="M13.873 3.805C21.21 9.332 29.103 20.537 32 26.55v15.882c0-.338-.13.044-.41.867-1.512 4.456-7.418 21.847-20.923 7.944-7.111-7.32-3.819-14.64 9.125-16.85-7.405 1.264-15.73-.825-18.014-9.015C1.12 23.022 0 8.51 0 6.55 0-3.268 8.579-.182 13.873 3.805zm36.254 0C42.79 9.332 34.897 20.537 32 26.55v15.882c0-.338.13.044.41.867 1.512 4.456 7.418 21.847 20.923 7.944 7.111-7.32 3.819-14.64-9.125-16.85 7.405 1.264 15.73-.825 18.014-9.015C62.88 23.022 64 8.51 64 6.55c0-9.818-8.579-6.732-13.873-2.745z" />
                </svg>

                <select
                    value={appLanguage}
                    onChange={handleLanguageChange}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text"
                >
                    <option value="vi">{t('language.vi')}</option>
                    <option value="en">{t('language.en')}</option>
                    <option value="de">{t('language.de')}</option>
                </select>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 lg:px-8 pb-20">
                <div className="w-full max-w-md text-center">
                    {/* Logo */}
                    <svg
                        className="w-20 h-20 lg:w-24 lg:h-24 mx-auto mb-8 lg:mb-12 text-primary-500"
                        viewBox="0 0 64 64"
                        fill="currentColor"
                    >
                        <path d="M13.873 3.805C21.21 9.332 29.103 20.537 32 26.55v15.882c0-.338-.13.044-.41.867-1.512 4.456-7.418 21.847-20.923 7.944-7.111-7.32-3.819-14.64 9.125-16.85-7.405 1.264-15.73-.825-18.014-9.015C1.12 23.022 0 8.51 0 6.55 0-3.268 8.579-.182 13.873 3.805zm36.254 0C42.79 9.332 34.897 20.537 32 26.55v15.882c0-.338.13.044.41.867 1.512 4.456 7.418 21.847 20.923 7.944 7.111-7.32 3.819-14.64-9.125-16.85 7.405 1.264 15.73-.825 18.014-9.015C62.88 23.022 64 8.51 64 6.55c0-9.818-8.579-6.732-13.873-2.745z" />
                    </svg>

                    {/* Title */}
                    <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-dark-text mb-4 lg:mb-6">
                        {t('auth.welcome.title')}
                    </h1>

                    <p className="text-base lg:text-lg text-gray-600 dark:text-dark-text-secondary mb-8 lg:mb-12">
                        {t('auth.welcome.description')}
                    </p>

                    {/* Buttons */}
                    <div className="space-y-3 lg:space-y-4">
                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            onClick={() => navigate('/signup')}
                        >
                            {t('auth.welcome.create_account')}
                        </Button>

                        <Button
                            variant="outline"
                            size="lg"
                            fullWidth
                            onClick={() => navigate('/login')}
                        >
                            {t('auth.welcome.login')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 lg:p-6 border-t border-gray-200 dark:border-dark-border">
                <div className="flex flex-wrap justify-center gap-3 lg:gap-4 text-xs lg:text-sm text-gray-500 dark:text-dark-text-secondary">
                    <a href="#" className="hover:underline">{t('auth.welcome.business')}</a>
                    <a href="#" className="hover:underline">{t('auth.welcome.blog')}</a>
                    <a href="#" className="hover:underline">{t('auth.welcome.jobs')}</a>
                </div>
            </div>
        </div>
    );
};

export default WelcomePage;
