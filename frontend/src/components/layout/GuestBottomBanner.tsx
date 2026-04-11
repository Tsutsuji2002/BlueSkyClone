import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ButterflyLogo from '../common/ButterflyLogo';

const GuestBottomBanner: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pointer-events-none pb-[env(safe-area-inset-bottom)]">
            {/* The banner background taking up bottom space */}
            <div className="bg-white dark:bg-dark-bg border-t border-gray-200 dark:border-dark-border px-4 py-3 flex items-center justify-between pointer-events-auto shadow-[0_-4px_10px_rgba(0,0,0,0.05)] dark:shadow-none">
                {/* Left side: Logo and Brand Name */}
                <div className="flex items-center gap-2">
                    <ButterflyLogo className="w-7 h-[25px] text-[#006AFF]" />
                    <span className="text-xl font-bold tracking-tight text-black dark:text-dark-text hidden sm:block">
                        Bluesky
                    </span>
                    <span className="text-lg font-bold tracking-tight text-black dark:text-dark-text sm:hidden">
                        Bluesky
                    </span>
                </div>

                {/* Right side: Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/signup')}
                        className="bg-[#006AFF] hover:bg-blue-600 text-white rounded-full px-4 py-[6px] text-[14px] font-bold transition-colors"
                    >
                        {t('auth.welcome.create_account', { defaultValue: 'Create account' })}
                    </button>
                    <button
                        onClick={() => navigate('/login')}
                        className="bg-transparent hover:bg-gray-100 dark:hover:bg-dark-surface text-[#405168] dark:text-dark-text-secondary rounded-full px-4 py-[6px] text-[14px] font-bold transition-colors"
                    >
                        {t('auth.welcome.login', { defaultValue: 'Log in' })}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuestBottomBanner;
