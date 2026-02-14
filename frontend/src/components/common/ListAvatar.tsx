import React, { useState, useEffect } from 'react';
import { FiList } from 'react-icons/fi';
import { cn } from '../../utils/classNames';
import { API_BASE_URL } from '../../constants';

interface ListAvatarProps {
    src?: string;
    alt: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const ListAvatar: React.FC<ListAvatarProps> = ({
    src,
    alt,
    size = 'md',
    className,
}) => {
    const [hasError, setHasError] = useState(false);

    const sizeStyles = {
        sm: 'w-8 h-8 rounded-md',
        md: 'w-10 h-10 rounded-lg',
        lg: 'w-12 h-12 rounded-lg',
        xl: 'w-16 h-16 rounded-xl',
    };

    const iconSizes = {
        sm: 16,
        md: 20,
        lg: 24,
        xl: 32,
    };

    const computedSrc = src?.startsWith('/')
        ? `${API_BASE_URL.replace('/api', '')}${src}`
        : src;

    useEffect(() => {
        setHasError(false);
    }, [src]);

    return (
        <div className={cn(
            'relative flex-shrink-0 overflow-hidden bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center transition-all',
            sizeStyles[size],
            className
        )}>
            {computedSrc && !hasError ? (
                <img
                    src={computedSrc}
                    alt={alt}
                    onError={() => setHasError(true)}
                    className="w-full h-full object-cover"
                />
            ) : (
                <FiList className="text-primary-500" size={iconSizes[size]} />
            )}
        </div>
    );
};

export default ListAvatar;
