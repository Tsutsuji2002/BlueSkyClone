import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { hideToast } from '../../redux/slices/toastSlice';
import { FiCheckCircle, FiXCircle, FiInfo } from 'react-icons/fi';
import { cn } from '../../utils/classNames';

const Toast: React.FC = () => {
    const { isOpen, message, type } = useSelector((state: RootState) => state.toast);
    const dispatch = useDispatch();

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                dispatch(hideToast());
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, dispatch]);

    if (!isOpen) return null;

    const icons = {
        success: <FiCheckCircle className="text-[#1d9bf0]" size={20} />,
        error: <FiXCircle className="text-red-500" size={20} />,
        info: <FiInfo className="text-[#1d9bf0]" size={20} />,
    };

    return (
        <div className="fixed bottom-6 left-6 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className={cn(
                "flex items-center gap-3 px-6 py-3.5 rounded-full shadow-lg border bg-white dark:bg-dark-surface min-w-[320px] transition-all duration-300",
                type === 'success' ? "border-[#1d9bf0] bg-blue-50/50 dark:bg-blue-950/20" : "border-gray-200 dark:border-dark-border"
            )}>
                <div className="flex-shrink-0">
                    {icons[type]}
                </div>
                <span className={cn(
                    "text-[15px] font-semibold tracking-tight",
                    type === 'success' ? "text-[#1d9bf0]" : "text-gray-900 dark:text-dark-text"
                )}>
                    {message}
                </span>
            </div>
        </div>
    );
};

export default Toast;
