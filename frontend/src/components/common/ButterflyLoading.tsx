import React from 'react';
import { cn } from '../../utils/classNames';

interface ButterflyLoadingProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const ButterflyLoading: React.FC<ButterflyLoadingProps> = ({ size = 'md', className }) => {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-12 h-12',
        lg: 'w-24 h-24',
        xl: 'w-32 h-32'
    };

    return (
        <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
            {/* Animated butterfly wings */}
            <div className="butterfly-container">
                <div className="butterfly-wing butterfly-wing-left"></div>
                <div className="butterfly-wing butterfly-wing-right"></div>
                <div className="butterfly-body"></div>
            </div>
            
            <style>{`
                .butterfly-container {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .butterfly-wing {
                    position: absolute;
                    width: 45%;
                    height: 60%;
                    background: linear-gradient(135deg, #0085ff 0%, #0066cc 100%);
                    border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
                    box-shadow: 0 2px 8px rgba(0, 133, 255, 0.3);
                }
                
                .butterfly-wing-left {
                    left: 5%;
                    transform-origin: right center;
                    animation: flap-left 0.6s ease-in-out infinite;
                }
                
                .butterfly-wing-right {
                    right: 5%;
                    transform-origin: left center;
                    animation: flap-right 0.6s ease-in-out infinite;
                }
                
                .butterfly-body {
                    position: absolute;
                    width: 10%;
                    height: 70%;
                    background: linear-gradient(180deg, #003d7a 0%, #0085ff 100%);
                    border-radius: 50%;
                    z-index: 1;
                }
                
                @keyframes flap-left {
                    0%, 100% {
                        transform: rotateY(0deg) translateX(0);
                    }
                    50% {
                        transform: rotateY(-25deg) translateX(-2px);
                    }
                }
                
                @keyframes flap-right {
                    0%, 100% {
                        transform: rotateY(0deg) translateX(0);
                    }
                    50% {
                        transform: rotateY(25deg) translateX(2px);
                    }
                }
            `}</style>
        </div>
    );
};

export default ButterflyLoading;
