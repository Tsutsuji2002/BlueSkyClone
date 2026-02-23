import React from 'react';

interface ButterflyLogoProps {
    className?: string;
    size?: number;
    onClick?: () => void;
}

const ButterflyLogo: React.FC<ButterflyLogoProps> = ({ className = "text-primary-500", size = 32, onClick }) => {
    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            onClick={onClick}
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="butterfly-gradient" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="currentColor" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.8" />
                </linearGradient>
            </defs>
            <path
                d="M16.892 13.717c-4.41 -3.197 -11.559 -5.672 -11.559 2.203c0 1.574 .934 13.208 1.483 15.096c1.9 6.568 8.347 7.333 14.516 6.317c-10.787 1.774 -13.037 8.555 -7.111 14.427c2.746 2.715 5.101 4.24 7.111 4.24c5.333 0 8.357 -7.384 9.333 -9.333l.667 -1.334c.167 -.333 .333 -.333 .5 0l.667 1.334c.976 1.949 4 9.333 9.333 9.333c2.011 0 4.365 -1.525 7.111 -4.24c5.926 -5.872 3.676 -12.653 -7.111 -14.427c6.169 1.016 12.616 .251 14.516 -6.317c.549 -1.888 1.483 -13.522 1.483 -15.096c0 -7.875 -7.149 -5.4 -11.559 -2.203c-6.115 4.432 -12.693 13.461 -15.106 18.283c-2.413 -4.822 -8.991 -13.851 -15.106 -18.283z"
                fill="url(#butterfly-gradient)"
            />
        </svg>
    );
};

export default ButterflyLogo;
