import React from 'react';
import { cn } from '../../utils/classNames';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    hover?: boolean;
}

const Card: React.FC<CardProps> = ({
    children,
    className,
    onClick,
    hover = false,
}) => {
    return (
        <div
            onClick={onClick}
            className={cn(
                'bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg',
                'transition-all duration-200',
                hover && 'hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer',
                onClick && 'cursor-pointer',
                className
            )}
        >
            {children}
        </div>
    );
};

export default Card;
