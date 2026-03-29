import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { setAppLanguage } from '../../redux/slices/languageSlice';
import Button from '../common/Button';
import ButterflyLogo from '../common/ButterflyLogo';

const GuestSidebar: React.FC = () => {
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
        <div className="h-screen sticky top-0 flex flex-col p-6 items-start">
            {/* Logo */}
            <div className="mb-8 cursor-pointer" onClick={() => navigate('/')}>
                <ButterflyLogo className="w-10 h-10 text-primary-500" />
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col">
                <h2 className="text-[28px] font-black leading-tight text-gray-900 dark:text-dark-text mb-6">
                    {t('auth.welcome.title', { defaultValue: 'Join the conversation' })}
                </h2>

                <div className="space-y-3 w-full max-w-[210px]">
                    <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        onClick={() => navigate('/signup')}
                        className="rounded-full font-bold text-base"
                    >
                        {t('auth.welcome.create_account', { defaultValue: 'Create account' })}
                    </Button>

                    <Button
                        variant="ghost"
                        size="lg"
                        fullWidth
                        onClick={() => navigate('/login')}
                        className="rounded-full font-bold text-base bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-border text-gray-900 dark:text-dark-text"
                    >
                        {t('auth.welcome.login', { defaultValue: 'Sign in' })}
                    </Button>
                </div>
            </div>

            {/* Language Selector */}
            <div className="mt-auto">
                <select
                    value={appLanguage}
                    onChange={handleLanguageChange}
                    className="appearance-none bg-transparent text-gray-500 dark:text-dark-text-secondary text-sm hover:underline cursor-pointer focus:outline-none"
                >
                    <option value="vi">Tiếng Việt - Vietnamese</option>
                    <option value="en">English</option>
                    <option value="de">Deutsch - German</option>
                </select>
            </div>
        </div>
    );
};

export default GuestSidebar;
