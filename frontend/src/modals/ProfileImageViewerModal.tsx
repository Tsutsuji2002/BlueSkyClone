import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiMoreHorizontal } from 'react-icons/fi';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { showToast } from '../redux/slices/toastSlice';
import { useTranslation } from 'react-i18next';

interface ProfileImageViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    type: 'avatar' | 'cover';
}

const ProfileImageViewerModal: React.FC<ProfileImageViewerModalProps> = ({
    isOpen,
    onClose,
    imageUrl,
    type,
}) => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    if (!isOpen || !imageUrl) return null;

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);
        try {
            if (navigator.share) {
                await navigator.share({ url: imageUrl });
            } else {
                await navigator.clipboard.writeText(imageUrl);
                dispatch(showToast({ message: t('common.copied_to_clipboard', 'Copied link to clipboard'), type: 'success' }));
            }
        } catch {
            await navigator.clipboard.writeText(imageUrl);
            dispatch(showToast({ message: t('common.copied_to_clipboard', 'Copied link to clipboard'), type: 'success' }));
        }
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);

        const filename = type === 'avatar' ? 'profile-avatar.jpg' : 'profile-banner.jpg';

        const triggerDownload = (url: string) => {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const blobUrl = URL.createObjectURL(blob);
                                triggerDownload(blobUrl);
                                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                                dispatch(showToast({ message: 'Image downloaded', type: 'success' }));
                            } else {
                                fallbackFetch();
                            }
                        },
                        'image/jpeg',
                        0.95
                    );
                } else {
                    fallbackFetch();
                }
            } catch {
                fallbackFetch();
            }
        };

        img.onerror = () => {
            fallbackFetch();
        };

        const fallbackFetch = async () => {
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                triggerDownload(blobUrl);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                dispatch(showToast({ message: 'Image downloaded', type: 'success' }));
            } catch {
                triggerDownload(imageUrl);
                dispatch(showToast({ message: 'Image downloaded', type: 'success' }));
            }
        };
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300 select-none"
            onClick={onClose}
        >
            {/* Top Bar Actions */}
            <div className="fixed top-4 left-4 right-4 flex items-center justify-between z-[110]" onClick={(e) => e.stopPropagation()}>
                {/* 3-Dots Menu Button */}
                <div className="relative" ref={menuRef}>
                    <button
                        type="button"
                        onClick={() => setShowMenu((prev) => !prev)}
                        className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer"
                        aria-label="Options"
                    >
                        <FiMoreHorizontal size={20} />
                    </button>

                    {/* Dropdown Menu (sample HTML / pic 3) */}
                    {showMenu && (
                        <div
                            className="absolute top-11 left-0 z-[120] min-w-[170px] rounded-[8px] p-1 border shadow-xl animate-in fade-in zoom-in-95 duration-150"
                            style={{
                                backgroundColor: 'rgb(17, 24, 34)',
                                borderColor: 'rgb(35, 46, 62)',
                                boxShadow: 'rgba(0, 0, 0, 0.4) 0px 10px 15px -3px, rgba(0, 0, 0, 0.4) 0px 4px 6px -4px',
                            }}
                        >
                            <div
                                role="menuitem"
                                tabIndex={-1}
                                aria-label="Share image"
                                onClick={handleShare}
                                className="flex items-center gap-4 px-2.5 py-2 rounded hover:bg-white/10 cursor-pointer min-h-[32px] transition-colors"
                            >
                                <span className="text-[13.1px] leading-[17px] tracking-[0.25px] font-semibold text-[#DCE2EA] flex-1">
                                    Share image
                                </span>
                                <div className="-mr-0.5 ml-3 flex-shrink-0">
                                    <svg fill="none" viewBox="0 0 24 24" width="20" height="20">
                                        <path
                                            fill="#A5B2C5"
                                            fillRule="evenodd"
                                            clipRule="evenodd"
                                            d="M12.707 3.293a1 1 0 0 0-1.414 0l-4.5 4.5a1 1 0 0 0 1.414 1.414L11 6.414v8.836a1 1 0 1 0 2 0V6.414l2.793 2.793a1 1 0 1 0 1.414-1.414l-4.5-4.5ZM5 12.75a1 1 0 1 0-2 0V20a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-7.25a1 1 0 1 0-2 0V19H5v-6.25Z"
                                        />
                                    </svg>
                                </div>
                            </div>

                            <div
                                role="menuitem"
                                tabIndex={-1}
                                aria-label="Download image"
                                onClick={handleDownload}
                                className="flex items-center gap-4 px-2.5 py-2 rounded hover:bg-white/10 cursor-pointer min-h-[32px] transition-colors"
                            >
                                <span className="text-[13.1px] leading-[17px] tracking-[0.25px] font-semibold text-[#DCE2EA] flex-1">
                                    Download image
                                </span>
                                <div className="-mr-0.5 ml-3 flex-shrink-0">
                                    <svg fill="none" viewBox="0 0 24 24" width="20" height="20">
                                        <path
                                            fill="#A5B2C5"
                                            fillRule="evenodd"
                                            clipRule="evenodd"
                                            d="M12 3a1 1 0 0 1 1 1v8.086l1.793-1.793a1 1 0 1 1 1.414 1.414l-3.5 3.5a1 1 0 0 1-1.414 0l-3.5-3.5a1 1 0 1 1 1.414-1.414L11 12.086V4a1 1 0 0 1 1-1ZM4 14a1 1 0 0 1 1 1v4h14v-4a1 1 0 1 1 2 0v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Z"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer"
                    aria-label={t('common.close', 'Close')}
                >
                    <FiX size={22} />
                </button>
            </div>

            {/* Image Container (sample HTML) */}
            <div
                className="flex-1 flex justify-center items-center p-4 w-full h-full cursor-pointer"
                onClick={onClose}
            >
                <img
                    src={imageUrl}
                    alt={type === 'avatar' ? 'Avatar' : 'Banner'}
                    onClick={onClose}
                    style={
                        type === 'avatar'
                            ? {
                                  maxWidth: 'min(400px, 100vw)',
                                  maxHeight: 'min(400px, 100vh)',
                                  padding: '16px',
                                  boxSizing: 'border-box',
                                  borderRadius: '50%',
                              }
                            : {
                                  maxWidth: '100vw',
                                  maxHeight: '100vh',
                                  objectFit: 'contain',
                                  padding: '16px',
                                  boxSizing: 'border-box',
                              }
                    }
                    className="animate-in fade-in zoom-in duration-300 shadow-2xl select-none"
                />
            </div>
        </div>
    );
};

export default ProfileImageViewerModal;
