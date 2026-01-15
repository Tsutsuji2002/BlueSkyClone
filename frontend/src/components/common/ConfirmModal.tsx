import React from 'react';
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-dark-surface rounded-[24px] w-full max-w-[400px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-8 pb-6">
                    <h2 className="text-[22px] font-bold text-gray-900 dark:text-dark-text mb-2 leading-tight">
                        {title}
                    </h2>
                    <p className="text-[17px] text-gray-600 dark:text-dark-text-secondary leading-normal">
                        {message}
                    </p>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 pb-6">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-full text-[15px] font-bold text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                    >
                        {cancelLabel || t('common.cancel')}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={cn(
                            "px-6 py-2.5 rounded-full text-[15px] font-bold text-white transition-opacity hover:opacity-90",
                            variant === 'danger' ? "bg-[#f41e3b]" : "bg-primary-500"
                        )}
                    >
                        {confirmLabel || t('common.confirm')}
                    </button>
                </div>
            </div>
            {/* Backdrop click listener */}
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>
    );
};

export default ConfirmModal;
