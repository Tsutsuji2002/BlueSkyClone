import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/classNames';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'primary' | 'danger';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel,
    cancelLabel,
    variant = 'danger'
}) => {
    const { t } = useTranslation();

    React.useEffect(() => {
        if (isOpen) {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.overflow = 'hidden';
            if (scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }
        } else {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }

        return () => {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="bg-white dark:bg-[#000000] border border-transparent dark:border-gray-800 rounded-[32px] w-full max-w-[340px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 pb-4">
                    <h2 className="text-[20px] font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                        {title}
                    </h2>
                    <p className="text-[15px] text-gray-600 dark:text-gray-400 leading-snug">
                        {message}
                    </p>
                </div>

                <div className="flex items-center justify-end gap-2 p-6 pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-full text-[15px] font-bold text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                        {cancelLabel || t('common.cancel')}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={cn(
                            "px-6 py-2 rounded-full text-[15px] font-bold text-white transition-opacity hover:opacity-90",
                            variant === 'danger' ? "bg-[#f41e3b]" : "bg-primary-500"
                        )}
                    >
                        {confirmLabel || t('common.confirm')}
                    </button>
                </div>
            </div>
            {/* Backdrop click listener */}
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>,
        document.body
    );
};

export default ConfirmModal;
