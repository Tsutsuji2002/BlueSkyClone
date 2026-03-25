import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { SignUpFormData } from '../../types';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useTranslation, Trans } from 'react-i18next';
import { setAppLanguage } from '../../redux/slices/languageSlice';
import { signUp, requestPhoneVerification, clearError } from '../../redux/slices/authSlice';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { cn } from '../../utils/classNames';

const SignUpPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t, i18n } = useTranslation();
    useDocumentTitle(t('auth.signup.title'));
    const appLanguage = useAppSelector((state) => state.language.appLanguage);
    const { isLoading, error } = useAppSelector((state) => state.auth);

    const handleLanguageChange = (lang: string) => {
        dispatch(setAppLanguage(lang));
        i18n.changeLanguage(lang);
    };
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<SignUpFormData>({
        email: '',
        password: '',
        dateOfBirth: '',
        username: '',
        hostingProvider: 'bsky.social',
        verificationPhone: '',
        verificationCode: '',
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const handleNext = async () => {
        // Step 1: Request Phone Verification
        if (step === 1) {
            if (!formData.verificationPhone) {
                setFormErrors({ phone: t('auth.signup.phone_required', 'Phone number is required for verification') });
                return;
            }
            const resultAction = await dispatch(requestPhoneVerification(formData.verificationPhone));
            if (requestPhoneVerification.fulfilled.match(resultAction)) {
                setFormErrors({});
                setStep(step + 1);
            }
            return;
        }

        // Validate step 2: birthday must not be in the future
        if (step === 2 && formData.dateOfBirth) {
            const todayDate = new Date();
            const localToday = new Date(todayDate.getTime() - todayDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
            if (formData.dateOfBirth > localToday) {
                setFormErrors({ dateOfBirth: t('settings.birthdate_future_error', 'Birthday cannot be in the future') });
                return;
            }
        }

        if (step < 4) {
            setFormErrors({});
            setStep(step + 1);
        } else {
            // Validate step 4: SMS Code and Username
            if (!formData.verificationCode?.trim()) {
                setFormErrors({ code: t('auth.signup.code_required', 'SMS Verification code is required') });
                return;
            }
            if (!formData.username.trim()) {
                setFormErrors({ username: t('settings.handle_cannot_be_blank', 'Handle cannot be blank') });
                return;
            }

            const handleRegex = /^[a-z0-9.]+$/;
            if (formData.username.length > 16) {
                setFormErrors({ username: t('settings.handle_too_long', 'Handle must be at most 16 characters') });
                return;
            }
            if (!handleRegex.test(formData.username)) {
                setFormErrors({ username: t('settings.handle_invalid_chars', 'Handle can only contain letters, numbers, and dots') });
                return;
            }

            setFormErrors({});
            // Complete signup
            const signupData = {
                ...formData,
                dateOfBirth: formData.dateOfBirth || null
            };
            const resultAction = await dispatch(signUp(signupData as any));
            if (signUp.fulfilled.match(resultAction)) {
                navigate('/');
            }
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            navigate('/welcome');
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-500 to-primary-700 p-12 flex-col justify-center">
                <div className="max-w-md">
                    <h1 className="text-5xl font-bold text-white mb-4">
                        {t('auth.signup.title')}
                    </h1>
                    <p className="text-xl text-primary-100">
                        {t('auth.signup.description')}
                    </p>
                </div>
            </div>

            {/* Right Side - Signup Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-dark-bg">
                <div className="w-full max-w-md">
                    {/* Progress Indicator */}
                    <div className="mb-8">
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-2">
                            {t('auth.signup.step', { step })}
                        </p>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4].map((s) => (
                                <div
                                    key={s}
                                    className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-primary-500' : 'bg-gray-200 dark:bg-dark-border'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Email and Hosting Provider */}
                    {step === 1 && (
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-2">
                                {t('auth.signup.your_account')}
                            </h2>
                            <p className="text-gray-600 dark:text-dark-text-secondary mb-8">
                                {t('auth.signup.creating_on')} <span className="text-primary-500 font-semibold">{t('auth.signup.hosting_provider_name')}</span>
                            </p>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                        {t('auth.signup.email_label')}
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="email"
                                            placeholder={t('auth.signup.email_placeholder')}
                                            value={formData.email}
                                            onChange={(e) => {
                                                setFormData({ ...formData, email: e.target.value });
                                                if (error) dispatch(clearError());
                                            }}
                                            icon={
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                            }
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                        {t('auth.signup.password_label')}
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder={t('auth.signup.password_placeholder')}
                                        value={formData.password}
                                        onChange={(e) => {
                                            setFormData({ ...formData, password: e.target.value });
                                            if (error) dispatch(clearError());
                                        }}
                                        icon={
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        }
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                        {t('auth.signup.phone_label', 'Mobile Phone (+1234567890)')}
                                    </label>
                                    <Input
                                        type="tel"
                                        placeholder={t('auth.signup.phone_placeholder', '+1234567890')}
                                        value={formData.verificationPhone || ''}
                                        error={formErrors.phone}
                                        onChange={(e) => {
                                            setFormData({ ...formData, verificationPhone: e.target.value });
                                            if (error) dispatch(clearError());
                                            setFormErrors({});
                                        }}
                                        icon={
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        }
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Bluesky requires SMS verification to prevent bots.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Date of Birth */}
                    {step === 2 && (
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-2">
                                {t('auth.signup.dob_title')}
                            </h2>
                            <p className="text-gray-600 dark:text-dark-text-secondary mb-8">
                                {t('auth.signup.dob_desc')}
                            </p>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                        {t('auth.signup.dob_label')}
                                    </label>
                                    <Input
                                        type="date"
                                        value={formData.dateOfBirth}
                                        onChange={(e) => { setFormData({ ...formData, dateOfBirth: e.target.value }); setFormErrors({}); }}
                                        max={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                                        error={formErrors.dateOfBirth}
                                        icon={
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        }
                                    />
                                </div>

                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                    <Trans
                                        i18nKey="auth.signup.terms_agree"
                                        values={{
                                            terms: t('auth.signup.terms_link'),
                                            privacy: t('auth.signup.privacy_link')
                                        }}
                                        components={{
                                            terms: <button type="button" className="text-primary-500 hover:underline" />,
                                            privacy: <button type="button" className="text-primary-500 hover:underline" />
                                        }}
                                    />
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Username */}
                    {step === 3 && (
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-2">
                                {t('auth.signup.username_title')}
                            </h2>
                            <p className="text-gray-600 dark:text-dark-text-secondary mb-8">
                                {t('auth.signup.username_desc')}
                            </p>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                        {t('auth.signup.username_label')}
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 relative">
                                            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                                @
                                            </span>
                                            <input
                                                type="text"
                                                value={formData.username}
                                                onChange={(e) => {
                                                    const lowercaseValue = e.target.value.toLowerCase();
                                                    setFormData({ ...formData, username: lowercaseValue });
                                                    setFormErrors({});
                                                }}
                                                placeholder="oaky.social"
                                                className={cn(
                                                    "w-full pl-8 pr-4 py-3 rounded-lg border bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500",
                                                    formErrors.username ? "border-red-500" : "border-gray-300 dark:border-dark-border"
                                                )}
                                            />
                                        </div>
                                    </div>
                                    {formErrors.username && (
                                        <p className="mt-1 text-sm text-red-500">{formErrors.username}</p>
                                    )}
                                    <p className="mt-2 text-sm text-gray-500 dark:text-dark-text-secondary">
                                        {t('auth.signup.username_preview')} <span className="font-semibold">{formData.username || t('auth.signup.username_placeholder_default')}.{formData.hostingProvider}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: SMS Verification Code */}
                    {step === 4 && (
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-2">
                                {t('auth.signup.verification_title', 'Verify your phone')}
                            </h2>
                            <p className="text-gray-600 dark:text-dark-text-secondary mb-8">
                                {t('auth.signup.verification_desc', 'Enter the 6-digit code we sent to')} <span className="font-semibold">{formData.verificationPhone}</span>
                            </p>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                                        {t('auth.signup.code_label', 'Verification Code')}
                                    </label>
                                    <Input
                                        type="text"
                                        placeholder="123456"
                                        value={formData.verificationCode || ''}
                                        error={formErrors.code}
                                        onChange={(e) => {
                                            setFormData({ ...formData, verificationCode: e.target.value });
                                            if (error) dispatch(clearError());
                                            setFormErrors({});
                                        }}
                                        className="text-center tracking-widest text-2xl font-mono"
                                    />
                                </div>

                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                    {t('auth.signup.didnt_receive_code', "Didn't receive a code?")}{' '}
                                    <button 
                                        type="button" 
                                        className="text-primary-500 hover:underline"
                                        onClick={() => dispatch(requestPhoneVerification(formData.verificationPhone || ''))}
                                    >
                                        {t('auth.signup.resend_code', 'Resend Code')}
                                    </button>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="mt-8 flex gap-4">
                        <Button
                            variant="ghost"
                            size="lg"
                            onClick={handleBack}
                        >
                            {t('auth.signup.back')}
                        </Button>

                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            onClick={handleNext}
                            loading={isLoading}
                            disabled={isLoading}
                        >
                            {step === 4 ? t('auth.signup.done') : t('auth.signup.next')}
                        </Button>
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
                        <p className="mt-2 text-sm text-gray-500 dark:text-dark-text-secondary">
                            {t('auth.signup.having_trouble')} <button type="button" className="text-primary-500 hover:underline">{t('auth.signup.contact_support')}</button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUpPage;
