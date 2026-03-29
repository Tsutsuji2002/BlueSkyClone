import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { closeAuthWall } from '../redux/slices/modalsSlice';
import Button from '../components/common/Button';
import ButterflyLogo from '../components/common/ButterflyLogo';
import { FiX } from 'react-icons/fi';

const AuthWallModal: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const isOpen = useAppSelector((state) => state.modals.authWall.isOpen);

    if (!isOpen) return null;

    const handleClose = () => {
        dispatch(closeAuthWall());
    };

    const handleAction = (path: string) => {
        handleClose();
        navigate(path);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-bg w-full max-w-[400px] rounded-[20px] shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Close Button */}
                <button 
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors text-gray-500 dark:text-dark-text-secondary"
                >
                    <FiX size={20} />
                </button>

                <div className="p-8 pb-10 flex flex-col items-center text-center">
                    <ButterflyLogo className="w-16 h-16 text-[#0085FF] mb-2" />
                    <h1 className="text-[26px] font-black text-[#0085FF] mb-6">Bluesky</h1>
                    
                    <h2 className="text-[20px] font-bold text-gray-900 dark:text-dark-text leading-snug mb-8 px-2">
                        {t('auth.wall.title', { defaultValue: 'Sign in or create your account to join the conversation!' })}
                    </h2>

                    <div className="space-y-3 w-full">
                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            onClick={() => handleAction('/signup')}
                            className="rounded-full font-bold text-[17px] h-[52px] bg-[#0085FF] hover:bg-[#0074e0] border-none"
                        >
                            {t('auth.welcome.create_account', { defaultValue: 'Create an account' })}
                        </Button>

                        <Button
                            variant="ghost"
                            size="lg"
                            fullWidth
                            onClick={() => handleAction('/login')}
                            className="rounded-full font-bold text-[17px] h-[52px] bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-border text-gray-900 dark:text-dark-text border-none"
                        >
                            {t('auth.welcome.login', { defaultValue: 'Sign in' })}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthWallModal;
