import React, { useState, useEffect } from 'react';
import { FiRss } from 'react-icons/fi';
import { cn } from '../../utils/classNames';
import { API_BASE_URL } from '../../constants';

interface FeedAvatarProps {
    src?: string;
    alt: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const FeedAvatar: React.FC<FeedAvatarProps> = ({
    src,
    alt,
    size = 'md',
    className,
}) => {
    const [hasError, setHasError] = useState(false);

    const sizeStyles = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16',
    };

    const iconSizes = {
        sm: 16,
        md: 20,
        lg: 24,
        xl: 32,
    };

    // Handle relative URLs from local storage
    const computedSrc = src?.startsWith('/')
        ? `${API_BASE_URL.replace('/api', '')}${src}`
        : src;

    useEffect(() => {
        setHasError(false);
    }, [src]);

    console.log('FeedAvatar Debug:', { originalSrc: src, computedSrc, hasError });

    return (
        <div className={cn(
            'relative flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center transition-all',
            sizeStyles[size],
            className
        )}>
            {computedSrc && !hasError ? (
                <img
                    src={computedSrc}
                    alt={alt}
                    onError={() => setHasError(true)}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                />
            ) : (
                <FiRss className="text-white" size={iconSizes[size]} />
            )}
        </div>
    );
};

export default FeedAvatar;
