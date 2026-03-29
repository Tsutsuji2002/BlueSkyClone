import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { FiChevronDown } from 'react-icons/fi';
import Button from '../common/Button';
import ButterflyLogo from '../common/ButterflyLogo';

const GuestSidebar: React.FC = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const dispatch = useAppDispatch();
    const appLanguage = useAppSelector((state) => state.language.appLanguage);

    const handleLanguageChange = (lang: string) => {
        // dispatch(setAppLanguage(lang)); // If you have a slice for it, keep it.
        i18n.changeLanguage(lang);
    };

    return (
        <div className="h-screen sticky top-0 flex flex-col items-start px-2 py-5 lg:py-8 lg:px-4">
            {/* Logo */}
            <div className="mb-6 cursor-pointer" onClick={() => navigate('/')}>
                <ButterflyLogo className="w-[42px] h-[38px] text-[#0085FF]" />
            </div>

            {/* Content Area - Roughly Centered Vertically */}
            <div className="flex-1 flex flex-col justify-center py-10">
                <h1 className="text-[32px] font-black leading-tight text-gray-900 dark:text-dark-text mb-2">
                    {t('auth.welcome.title', { defaultValue: 'Join the conversation' })}
                </h1>
                <p className="text-[17px] text-gray-500 dark:text-dark-text-secondary mb-8">
                    Join Bluesky today.
                </p>

                <div className="space-y-3 w-full max-w-[280px]">
                    <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        onClick={() => navigate('/signup')}
                        className="rounded-full font-bold text-[17px] h-[52px] bg-[#0085FF] hover:bg-[#0074e0] border-none"
                    >
                        {t('auth.welcome.create_account', { defaultValue: 'Create account' })}
                    </Button>

                    <Button
                        variant="ghost"
                        size="lg"
                        fullWidth
                        onClick={() => navigate('/login')}
                        className="rounded-full font-bold text-[17px] h-[52px] bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-border text-gray-900 dark:text-dark-text border-none"
                    >
                        {t('auth.welcome.login', { defaultValue: 'Sign in' })}
                    </Button>
                </div>
            </div>

            {/* Language Selector */}
            <div className="mt-auto relative group">
                <div className="flex items-center gap-1 text-[15px] text-gray-500 dark:text-dark-text-secondary hover:underline cursor-pointer py-2">
                    <span>{appLanguage === 'vi' ? 'Tiếng Việt' : 'English'}</span>
                    <FiChevronDown size={14} />
                </div>
                {/* Simplified dropdown for now */}
                <select
                    value={appLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                >
                    <option value="en">English</option>
                    <option value="vi">Tiếng Việt</option>
                    <option value="de">Deutsch</option>
                </select>
            </div>
        </div>
    );
};

export default GuestSidebar;
