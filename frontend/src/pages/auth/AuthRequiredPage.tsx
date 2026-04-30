import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ButterflyLogo from '../../components/common/ButterflyLogo';
import Button from '../../components/common/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const AuthRequiredPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    useDocumentTitle(t('auth.required.title', { defaultValue: 'Login Required' }));

    return (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white dark:bg-dark-bg h-full w-full min-h-[50vh]">
            <ButterflyLogo className="w-16 h-16 text-primary-500 mb-6" />
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-4">
                {t('auth.required.title', { defaultValue: 'You must be logged in to view this page' })}
            </h2>
            
            <p className="text-gray-600 dark:text-dark-text-secondary mb-8 max-w-md">
                {t('auth.required.description', { defaultValue: 'Sign in to access this feature and join the conversation.' })}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Button variant="primary" size="lg" onClick={() => navigate('/login')}>
                    {t('auth.welcome.login', { defaultValue: 'Log in' })}
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate('/signup')}>
                    {t('auth.welcome.create_account', { defaultValue: 'Create account' })}
                </Button>
            </div>
        </div>
    );
};

export default AuthRequiredPage;
