import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { setAppLanguage } from '../../redux/slices/languageSlice';
import Button from '../../components/common/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import ButterflyLogo from '../../components/common/ButterflyLogo';
import { APP_LANGUAGES } from '../../constants/languages';

const WelcomePage: React.FC = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const dispatch = useAppDispatch();
    useDocumentTitle(t('auth.welcome.title'));
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
                <ButterflyLogo className="w-8 h-8 lg:w-10 lg:h-10 text-primary-500" />

                <select
                    value={appLanguage}
                    onChange={handleLanguageChange}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text"
                >
                    {APP_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                            {lang.nativeName}
                        </option>
                    ))}
                </select>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 lg:px-8 pb-20">
                <div className="w-full max-w-md text-center">
                    {/* Logo */}
                    <ButterflyLogo className="w-20 h-20 lg:w-24 lg:h-24 mx-auto mb-8 lg:mb-12 text-primary-500" />

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
                    <button type="button" className="hover:underline">{t('auth.welcome.business')}</button>
                    <button type="button" className="hover:underline">{t('auth.welcome.blog')}</button>
                    <button type="button" className="hover:underline">{t('auth.welcome.jobs')}</button>
                </div>
            </div>
        </div>
    );
};

export default WelcomePage;
