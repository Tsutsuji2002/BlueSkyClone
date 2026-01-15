import React, { useState, useEffect } from 'react';
import { AvatarProps } from '../../types';
import { cn } from '../../utils/classNames';
import { API_BASE_URL } from '../../constants';

const Avatar: React.FC<AvatarProps> = ({
    src,
    alt,
    size = 'md',
    online = false,
    className,
}) => {
    const [hasError, setHasError] = useState(false);
    const sizeStyles = {
        xs: 'w-6 h-6',
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16',
        '2xl': 'w-24 h-24 lg:w-32 lg:h-32',
    };

    const onlineIndicatorSize = {
        xs: 'w-1.5 h-1.5',
        sm: 'w-2 h-2',
        md: 'w-2.5 h-2.5',
        lg: 'w-3 h-3',
        xl: 'w-4 h-4',
        '2xl': 'w-6 h-6',
    };

    const computedSrc = src?.startsWith('/') ? `${API_BASE_URL.replace('/api', '')}${src}` : src;

    useEffect(() => {
        setHasError(false);
    }, [src]);

    console.log('Avatar Debug:', { originalSrc: src, computedSrc, hasError, API_BASE_URL });

    return (
        <div className={cn('relative inline-block', className)}>
            {src && !hasError ? (
                <img
                    src={computedSrc}
                    alt={alt}
                    onError={() => setHasError(true)}
                    className={cn(
                        sizeStyles[size],
                        'rounded-full object-cover border-2 border-white dark:border-dark-bg',
                        className
                    )}
                    referrerPolicy="no-referrer"
                />
            ) : (
                <div
                    className={cn(
                        sizeStyles[size],
                        'rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold border-2 border-white dark:border-dark-bg',
                        className
                    )}
                >
                    {alt.charAt(0).toUpperCase()}
                </div>
            )}
            {online && (
                <span
                    className={cn(
                        onlineIndicatorSize[size],
                        'absolute bottom-0 right-0 bg-green-500 rounded-full border-2 border-white dark:border-dark-bg'
                    )}
                />
            )}
        </div>
    );
};

export default Avatar;
