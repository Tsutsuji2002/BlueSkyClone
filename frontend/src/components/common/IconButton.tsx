import React from 'react';
import { cn } from '../../utils/classNames';

interface IconButtonProps {
    icon: React.ReactNode;
    onClick?: () => void;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'primary' | 'danger';
    disabled?: boolean;
    loading?: boolean;
    tooltip?: string;
}

const IconButton: React.FC<IconButtonProps> = ({
    icon,
    onClick,
    className,
    size = 'md',
    variant = 'default',
    disabled = false,
    loading = false,
    tooltip,
}) => {
    const sizeStyles = {
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-12 h-12 text-lg',
    };

    const variantStyles = {
        default: 'hover:bg-gray-100 dark:hover:bg-dark-surface text-gray-600 dark:text-dark-text-secondary',
        primary: 'hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500',
        danger: 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500',
    };

    return (
        <button
            onClick={loading ? undefined : onClick}
            disabled={disabled || loading}
            title={tooltip}
            className={cn(
                'rounded-full flex items-center justify-center transition-colors duration-200 relative',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                sizeStyles[size],
                variantStyles[variant],
                className
            )}
        >
            {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
            ) : (
                icon
            )}
        </button>
    );
};

export default IconButton;
