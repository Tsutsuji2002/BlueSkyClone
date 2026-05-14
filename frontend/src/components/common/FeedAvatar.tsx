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
                alt.toLowerCase().includes('birds') ? (
                    <div className="flex items-center justify-center w-full h-full">
                         <svg fill="none" viewBox="0 0 24 24" width={iconSizes[size] - 2} height={iconSizes[size] - 2} className="text-white">
                            <path fill="currentColor" d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9Zm0 2a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" opacity="0.3" />
                            <path fill="currentColor" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                        </svg>
                    </div>
                ) : (
                    <FiRss className="text-white" size={iconSizes[size]} />
                )
            )}
        </div>
    );
};

export default FeedAvatar;
