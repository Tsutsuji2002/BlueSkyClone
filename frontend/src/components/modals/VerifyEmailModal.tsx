import React, { useState } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { showToast } from '../../redux/slices/toastSlice';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { updateUser } from '../../redux/slices/authSlice';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    /** Optional: called when the user navigates to change email */
    onUpdateEmail?: () => void;
}

/**
 * Verify Email Modal – matches the real Bluesky app design.
 * Shows a code-entry step after the verification email is sent.
 * For Bluesky (ATProto) users, requests go through our backend XRPC proxy
 * which forwards the request to the user's actual PDS with the correct token.
 */
const VerifyEmailModal: React.FC<Props> = ({ isOpen, onClose, onUpdateEmail }) => {
    const dispatch = useAppDispatch();
    const currentUser = useAppSelector((state) => state.auth.user);

    const [step, setStep] = useState<'send' | 'code'>('send');
    const [code, setCode] = useState('');
    const [emailInput, setEmailInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [sendError, setSendError] = useState('');
    const [confirmError, setConfirmError] = useState('');

    if (!isOpen) return null;

    const rawEmail = currentUser?.email ?? '';
    // Bluesky/ATProto users have a placeholder `did:...@remote.bsky.social` stored as their email.
    // We should NOT show this raw DID string—instead show a generic prompt.
    const isFakeEmail = rawEmail.endsWith('@remote.bsky.social') || rawEmail.startsWith('did:');
    const email = isFakeEmail ? '' : rawEmail;

    const handleSendEmail = async () => {
        setIsSending(true);
        setSendError('');
        try {
            // Use the backend XRPC proxy route which forwards to the user's PDS with the correct token
            const res = await fetch('/xrpc/com.atproto.server.requestEmailConfirmation', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
            }
            setStep('code');
        } catch (err: any) {
            setSendError(err?.message || 'Failed to send verification email. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    // The ATProto confirmEmail lexicon requires both `token` AND `email` matching PDS record.
    // For Bluesky users whose real email we don't have stored, we ask them to enter it.
    const emailForConfirm = isFakeEmail ? emailInput.trim() : rawEmail;

    const handleConfirmCode = async () => {
        if (!code.trim()) {
            setConfirmError('Please enter the verification code.');
            return;
        }
        if (isFakeEmail && !emailForConfirm) {
            setConfirmError('Please enter your Bluesky account email address.');
            return;
        }
        setIsConfirming(true);
        setConfirmError('');
        try {
            const res = await fetch('/xrpc/com.atproto.server.confirmEmail', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: code.trim(), email: emailForConfirm }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.message || data?.error || `Verification failed (${res.status})`);
            }
            dispatch(updateUser({ emailConfirmed: true }));
            dispatch(showToast({ message: 'Email verified successfully!', type: 'success' }));
            onClose();
        } catch (err: any) {
            setConfirmError(err?.message || 'Invalid verification code. Please try again.');
        } finally {
            setIsConfirming(false);
        }
    };

    const handleClose = () => {
        setStep('send');
        setCode('');
        setEmailInput('');
        setSendError('');
        setConfirmError('');
        onClose();
    };

    const emailDisplay = email
        ? <span className="font-semibold text-black dark:text-white">{email}</span>
        : <span className="font-semibold text-black dark:text-white">your Bluesky-registered email address</span>;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div
                className="relative bg-white dark:bg-dark-surface rounded-xl w-full max-w-[400px] shadow-2xl border border-[#c0cad8] dark:border-dark-border"
                style={{ animation: '0.3s cubic-bezier(0.16,1,0.3,1) both zoomInFade' }}
                role="dialog"
                aria-label="Verify your email"
            >
                {/* Close button */}
                <button
                    onClick={handleClose}
                    aria-label="Close"
                    className="absolute top-3 right-3 flex items-center justify-center w-[33px] h-[33px] rounded-full bg-white dark:bg-dark-surface hover:bg-gray-100 dark:hover:bg-dark-border transition-colors z-10"
                >
                    <svg fill="none" width="18" viewBox="0 0 24 24" height="18" style={{ color: '#526580' }}>
                        <path fill="#526580" fillRule="evenodd" clipRule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L12 10.586l6.293-6.293a1 1 0 1 1 1.414 1.414L13.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414L12 13.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L10.586 12 4.293 5.707a1 1 0 0 1 0-1.414Z" />
                    </svg>
                </button>

                <div className="p-6 flex flex-col gap-4">
                    {step === 'send' ? (
                        <>
                            {/* Title + description */}
                            <div className="flex flex-col gap-2">
                                <h2 className="text-[18.8px] font-bold text-black dark:text-white leading-6">
                                    Verify your email
                                </h2>
                                <p className="text-[13.1px] italic text-[#405168] dark:text-dark-text-secondary leading-[17px]">
                                    Before you can message another user, you must first verify your email.
                                </p>
                                <p className="text-[13.1px] text-[#405168] dark:text-dark-text-secondary leading-[17px]">
                                    We'll send an email to {emailDisplay}{' '}
                                    containing a link. Please click on it to complete the email verification process.
                                </p>
                                {!isFakeEmail && (
                                    <p className="text-[13.1px] text-[#405168] dark:text-dark-text-secondary leading-[17px]">
                                        If you need to update your email,{' '}
                                        <button
                                            className="text-[#006aff] hover:underline text-[13.1px]"
                                            onClick={() => { handleClose(); onUpdateEmail?.(); }}
                                        >
                                            click here
                                        </button>
                                        .
                                    </p>
                                )}
                            </div>

                            {sendError && (
                                <p className="text-[13px] text-red-500">{sendError}</p>
                            )}

                            {/* Send email button */}
                            <button
                                onClick={handleSendEmail}
                                disabled={isSending}
                                aria-label="Send verification email"
                                className="flex flex-row items-center justify-center gap-2 bg-[#006aff] hover:bg-[#005cdb] disabled:opacity-60 text-white rounded-full py-3 px-6 font-medium text-[15px] transition-colors"
                            >
                                {isSending ? 'Sending…' : 'Send email'}
                                {!isSending && (
                                    <svg fill="none" width="20" viewBox="0 0 24 24" height="20">
                                        <path fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd" d="M4.568 4h14.864c.252 0 .498 0 .706.017.229.019.499.063.77.201a2 2 0 0 1 .874.874c.138.271.182.541.201.77.017.208.017.454.017.706v10.864c0 .252 0 .498-.017.706a2.022 2.022 0 0 1-.201.77 2 2 0 0 1-.874.874 2.022 2.022 0 0 1-.77.201c-.208.017-.454.017-.706.017H4.568c-.252 0-.498 0-.706-.017a2.022 2.022 0 0 1-.77-.201 2 2 0 0 1-.874-.874 2.022 2.022 0 0 1-.201-.77C2 17.93 2 17.684 2 17.432V6.568c0-.252 0-.498.017-.706.019-.229.063-.499.201-.77a2 2 0 0 1 .874-.874c.271-.138.541-.182.77-.201C4.07 4 4.316 4 4.568 4Zm.456 2L12 11.708 18.976 6H5.024ZM20 7.747l-6.733 5.509a2 2 0 0 1-2.534 0L4 7.746V17.4a8.187 8.187 0 0 0 .011.589h.014c.116.01.278.011.575.011h14.8a8.207 8.207 0 0 0 .589-.012v-.013c.01-.116.011-.279.011-.575V7.747Z" />
                                    </svg>
                                )}
                            </button>

                            {/* Divider */}
                            <div className="w-full border-t border-[#dce2ea] dark:border-dark-border" />

                            {/* Have a code */}
                            <p className="text-[13.1px] text-[#405168] dark:text-dark-text-secondary leading-[17px]">
                                Have a code?{' '}
                                <button
                                    className="text-[#006aff] hover:underline text-[13.1px]"
                                    onClick={() => setStep('code')}
                                >
                                    Click here.
                                </button>
                            </p>
                        </>
                    ) : (
                        <>
                            {/* Code entry step */}
                            <div className="flex flex-col gap-2">
                                <h2 className="text-[18.8px] font-bold text-black dark:text-white leading-6">
                                    Enter your code
                                </h2>
                                <p className="text-[13.1px] text-[#405168] dark:text-dark-text-secondary leading-[17px]">
                                    An email was sent to {emailDisplay}. Enter the code from the email below.
                                </p>
                            </div>

                            {/* When the stored email is a fake placeholder, ask for the real one */}
                            {isFakeEmail && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-[13px] text-[#405168] dark:text-dark-text-secondary font-medium">
                                        Your Bluesky email address
                                    </label>
                                    <input
                                        type="email"
                                        value={emailInput}
                                        onChange={(e) => setEmailInput(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full border border-[#c0cad8] dark:border-dark-border rounded-xl px-4 py-3 text-[15px] dark:text-white dark:bg-dark-bg focus:outline-none focus:border-[#006aff] transition-colors"
                                    />
                                </div>
                            )}

                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="Verification code"
                                className="w-full border border-[#c0cad8] dark:border-dark-border rounded-xl px-4 py-3 text-[15px] dark:text-white dark:bg-dark-bg focus:outline-none focus:border-[#006aff] transition-colors"
                                autoFocus
                            />

                            {confirmError && (
                                <p className="text-[13px] text-red-500">{confirmError}</p>
                            )}

                            <button
                                onClick={handleConfirmCode}
                                disabled={isConfirming}
                                className="flex items-center justify-center bg-[#006aff] hover:bg-[#005cdb] disabled:opacity-60 text-white rounded-full py-3 px-6 font-medium text-[15px] transition-colors"
                            >
                                {isConfirming ? 'Verifying…' : 'Verify'}
                            </button>

                            <div className="w-full border-t border-[#dce2ea] dark:border-dark-border" />

                            <p className="text-[13.1px] text-[#405168] dark:text-dark-text-secondary leading-[17px]">
                                Didn't receive a code?{' '}
                                <button
                                    className="text-[#006aff] hover:underline text-[13.1px]"
                                    onClick={() => { setStep('send'); setCode(''); }}
                                >
                                    Go back.
                                </button>
                            </p>
                        </>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes zoomInFade {
                    from { opacity: 0; transform: scale(0.9); }
                    to   { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default VerifyEmailModal;
