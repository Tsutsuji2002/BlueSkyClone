import React from 'react';
import { cn } from '../../utils/classNames';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
    width?: string | number;
    height?: string | number;
    animate?: 'pulse' | 'wave' | 'none';
}

const Skeleton: React.FC<SkeletonProps> = ({ 
    className, 
    variant = 'text', 
    width, 
    height,
    animate = 'pulse'
}) => {
    const style: React.CSSProperties = {
        width,
        height
    };

    return (
        <div 
            className={cn(
                "bg-gray-200 dark:bg-dark-surface-hover overflow-hidden relative",
                variant === 'text' && "h-4 rounded mb-1 last:mb-0",
                variant === 'circular' && "rounded-full",
                variant === 'rounded' && "rounded-lg",
                animate === 'pulse' && "animate-pulse",
                animate === 'wave' && "after:content-[''] after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/20 dark:after:via-white/5 after:to-transparent",
                className
            )}
            style={style}
        />
    );
};

export default Skeleton;
