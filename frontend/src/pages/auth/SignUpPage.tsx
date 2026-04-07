import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { signUp, requestPhoneVerification, clearError } from '../../redux/slices/authSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { FiMail, FiLock, FiUser, FiCalendar, FiPhone, FiCheckCircle, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const SignUpPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { isLoading, error } = useAppSelector((state) => state.auth);
    useDocumentTitle(t('auth.signup.title', 'Sign Up'));

    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        username: '',
        displayName: '',
        dateOfBirth: '',
        verificationPhone: '',
        verificationCode: '',
        hostingProvider: 'bsky.social'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) dispatch(clearError());
    };

    const handleNext = async () => {
        if (step === 0) {
            // Validate step 0
            if (!formData.email || !formData.password || !formData.username || !formData.dateOfBirth) {
                toast.error(t('auth.signup.errors.fill_all', 'Please fill all required fields'));
                return;
            }
            setStep(1);
        } else if (step === 1) {
            // Request phone verification
            if (!formData.verificationPhone) {
                toast.error(t('auth.signup.errors.phone_required', 'Phone number is required'));
                return;
            }
            const resultAction = await dispatch(requestPhoneVerification(formData.verificationPhone));
            if (requestPhoneVerification.fulfilled.match(resultAction)) {
                toast.success(t('auth.signup.success.sms_sent', 'Verification code sent!'));
                setStep(2);
            } else {
                toast.error(resultAction.payload as string || 'Failed to send SMS');
            }
        }
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
        else navigate('/welcome');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.verificationCode) {
            toast.error(t('auth.signup.errors.code_required', 'Verification code is required'));
            return;
        }

        const resultAction = await dispatch(signUp({
            Email: formData.email,
            Password: formData.password,
            Username: formData.username,
            DisplayName: formData.displayName || formData.username,
            DateOfBirth: new Date(formData.dateOfBirth).toISOString(),
            VerificationPhone: formData.verificationPhone,
            VerificationCode: formData.verificationCode,
            HostingProvider: formData.hostingProvider
        } as any));

        if (signUp.fulfilled.match(resultAction)) {
            toast.success(t('auth.signup.success.account_created', 'Welcome to Bluesky!'));
            navigate('/');
        } else {
            toast.error(resultAction.payload as string || 'Registration failed');
        }
    };

    const renderStep = () => {
        switch (step) {
            case 0:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Input
                            name="email"
                            type="email"
                            label={t('auth.signup.email', 'Email Address')}
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            icon={<FiMail />}
                            required
                        />
                        <Input
                            name="password"
                            type="password"
                            label={t('auth.signup.password', 'Password')}
                            placeholder="Min 8 characters"
                            value={formData.password}
                            onChange={handleChange}
                            icon={<FiLock />}
                            required
                        />
                        <div className="flex gap-4">
                            <Input
                                name="username"
                                label={t('auth.signup.username', 'Username')}
                                placeholder="handle"
                                value={formData.username}
                                onChange={handleChange}
                                icon={<FiUser />}
                                required
                            />
                            <Input
                                name="dateOfBirth"
                                type="date"
                                label={t('auth.signup.dob', 'Birthday')}
                                value={formData.dateOfBirth}
                                onChange={handleChange}
                                icon={<FiCalendar />}
                                required
                            />
                        </div>
                        <Input
                            name="displayName"
                            label={t('auth.signup.display_name', 'Display Name (Optional)')}
                            placeholder="What should we call you?"
                            value={formData.displayName}
                            onChange={handleChange}
                            icon={<FiUser />}
                        />
                    </div>
                );
            case 1:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-primary-500 mb-4">
                                <FiPhone size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">Verification Required</h3>
                            <p className="text-gray-500 dark:text-dark-text-secondary mt-2">
                                Bluesky requires phone verification to keep the network safe from bots.
                            </p>
                        </div>
                        <Input
                            name="verificationPhone"
                            type="tel"
                            label={t('auth.signup.phone', 'Phone Number')}
                            placeholder="+1 555 000 0000"
                            value={formData.verificationPhone}
                            onChange={handleChange}
                            icon={<FiPhone />}
                            required
                        />
                        <p className="text-xs text-center text-gray-400">
                            Standard SMS rates may apply. We only use this for verification.
                        </p>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 text-green-500 mb-4">
                                <FiCheckCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">Check your phone</h3>
                            <p className="text-gray-500 dark:text-dark-text-secondary mt-2">
                                We sent a 6-digit code to {formData.verificationPhone}
                            </p>
                        </div>
                        <Input
                            name="verificationCode"
                            label={t('auth.signup.code', 'Verification Code')}
                            placeholder="123456"
                            value={formData.verificationCode}
                            onChange={handleChange}
                            icon={<FiCheckCircle />}
                            required
                            className="text-center text-2xl tracking-[1em] font-mono"
                            max={6}
                        />
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="text-sm text-primary-500 hover:underline w-full text-center"
                        >
                            Change phone number
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen flex bg-gray-50 dark:bg-dark-bg">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-500 to-primary-700 p-12 flex-col justify-center text-white">
                <div className="max-w-md">
                    <h1 className="text-5xl font-extrabold mb-6 leading-tight">
                        Start your journey on the open web.
                    </h1>
                    <p className="text-xl text-primary-100 mb-8 opacity-90">
                        Join millions of people sharing their ideas in a decentralized, user-first social network.
                    </p>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FiCheckCircle size={18} /></div>
                            <span>Own your own data and identity</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FiCheckCircle size={18} /></div>
                            <span>Customizable algorithms and feeds</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FiCheckCircle size={18} /></div>
                            <span>Connect across different platforms</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Step Form */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="mb-8">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 text-gray-500 hover:text-primary-500 transition-colors mb-6 group"
                        >
                            <FiChevronLeft className="group-hover:-translate-x-1 transition-transform" />
                            <span>{step === 0 ? 'Back' : 'Previous Step'}</span>
                        </button>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-dark-text mb-2">
                            {step === 0 ? 'Create Account' : step === 1 ? 'Verify Phone' : 'Almost there!'}
                        </h2>
                        <div className="flex gap-2 mt-4">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-primary-500' : 'bg-gray-200 dark:bg-dark-border'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>

                    <form onSubmit={step === 2 ? handleSubmit : (e) => e.preventDefault()} className="space-y-8">
                        {renderStep()}

                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30">
                                {error}
                            </div>
                        )}

                        <div className="pt-2">
                            {step < 2 ? (
                                <Button
                                    variant="primary"
                                    size="lg"
                                    fullWidth
                                    onClick={handleNext}
                                    isLoading={isLoading}
                                    className="h-14 font-bold text-lg rounded-2xl shadow-lg shadow-primary-500/20"
                                >
                                    <span>Continue</span>
                                    <FiChevronRight className="ml-2" />
                                </Button>
                            ) : (
                                <Button
                                    variant="primary"
                                    size="lg"
                                    fullWidth
                                    type="submit"
                                    isLoading={isLoading}
                                    className="h-14 font-bold text-lg rounded-2xl shadow-lg bg-green-600 hover:bg-green-700 shadow-green-500/20"
                                >
                                    Complete Signup
                                </Button>
                            )}
                        </div>

                        {step === 0 && (
                            <p className="text-center text-sm text-gray-500 dark:text-dark-text-secondary mt-6">
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="font-bold text-primary-500 hover:underline"
                                >
                                    Sign In
                                </button>
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SignUpPage;
