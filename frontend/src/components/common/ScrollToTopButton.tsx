import React, { useState, useEffect, useCallback } from 'react';
import { FiArrowUp } from 'react-icons/fi';

interface ScrollToTopButtonProps {
    /** Scroll threshold in px before the button appears */
    threshold?: number;
}

const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({ threshold = 300 }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let ticking = false;
        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    setVisible(window.scrollY > threshold);
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [threshold]);

    const scrollToTop = useCallback(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    return (
        <button
            onClick={scrollToTop}
            aria-label="Scroll to top"
            className={`
                fixed bottom-6 left-6 z-50
                w-10 h-10 rounded-full
                bg-white dark:bg-dark-surface
                border border-gray-200 dark:border-dark-border
                shadow-lg
                flex items-center justify-center
                text-gray-600 dark:text-dark-text
                hover:bg-gray-100 dark:hover:bg-dark-hover
                hover:scale-110
                transition-all duration-200 ease-in-out
                ${visible
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-4 pointer-events-none'
                }
            `}
        >
            <FiArrowUp size={20} />
        </button>
    );
};

export default ScrollToTopButton;
