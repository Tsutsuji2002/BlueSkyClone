import { useScrollRestoration } from '../../hooks/useScrollRestoration';

interface ScrollToTopProps {
    subKey?: string;
}

const ScrollToTop: React.FC<ScrollToTopProps> = ({ subKey }) => {
    useScrollRestoration(subKey);
    return null;
};

export default ScrollToTop;
