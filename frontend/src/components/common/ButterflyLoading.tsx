import React from 'react';
import { cn } from '../../utils/classNames';

interface ButterflyLoadingProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const ButterflyLoading: React.FC<ButterflyLoadingProps> = ({ size = 'md', className }) => {
    const sizeMap = {
        sm: 24,
        md: 48,
        lg: 64,
        xl: 96
    };

    const svgSize = sizeMap[size];

    return (
        <div className={cn("relative inline-block", className)} style={{ width: svgSize, height: (svgSize * 57) / 64 }}>
            <svg
                width={svgSize}
                height={(svgSize * 57) / 64}
                viewBox="0 0 64 57"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: 'absolute', top: 0, left: 0 }}
            >
                {/* Left wing - will flap */}
                <g className="butterfly-left-wing" style={{ transformOrigin: '32px 28.5px' }}>
                    <path
                        d="M13.873 3.805C21.21 9.332 29.103 20.537 32 26.55v15.882c0-.338-.13.044-.41.867-1.512 4.456-7.418 21.847-20.923 7.944-7.111-7.32-3.819-14.64 9.125-16.85-7.405 1.264-15.73-.825-18.014-9.015C1.12 23.022 0 8.51 0 6.55 0-3.268 8.579-.182 13.873 3.805Z"
                        fill="#0085ff"
                    />
                </g>
                {/* Right wing - will flap */}
                <g className="butterfly-right-wing" style={{ transformOrigin: '32px 28.5px' }}>
                    <path
                        d="M50.127 3.805C42.79 9.332 34.897 20.537 32 26.55v15.882c0-.338.13.044.41.867 1.512 4.456 7.418 21.847 20.923 7.944 7.111-7.32 3.819-14.64-9.125-16.85 7.405 1.264 15.73-.825 18.014-9.015C62.88 23.022 64 8.51 64 6.55c0-9.818-8.578-6.732-13.873-2.745Z"
                        fill="#0085ff"
                    />
                </g>
            </svg>
        </div>
    );
};

export default ButterflyLoading;
