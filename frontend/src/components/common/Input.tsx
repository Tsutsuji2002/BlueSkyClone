import React from 'react';
import { InputProps } from '../../types';
import { cn } from '../../utils/classNames';

const Input: React.FC<InputProps> = ({
    type = 'text',
    placeholder,
    value,
    onChange,
    label,
    error,
    disabled = false,
    className,
    icon,
}) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        {icon}
                    </div>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={cn(
                        'w-full px-4 py-3 rounded-lg border transition-colors duration-200',
                        'bg-white dark:bg-dark-surface',
                        'border-gray-300 dark:border-dark-border',
                        'text-gray-900 dark:text-dark-text',
                        'placeholder-gray-400 dark:placeholder-dark-text-secondary',
                        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        error ? 'border-red-500 focus:ring-red-500' : '',
                        icon ? 'pl-10' : '',
                        className || ''
                    )}
                />
            </div>
            {error && (
                <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
        </div>
    );
};

export default Input;
