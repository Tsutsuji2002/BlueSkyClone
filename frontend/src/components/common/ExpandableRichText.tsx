import React, { useState } from 'react';
import RichText from './RichText';
import { Facet } from '../../types';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/classNames';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface ExpandableRichTextProps {
    content?: string;
    facets?: Facet[];
    className?: string;
    maxLines?: number; // Maximum visible lines before clamping (default: 6)
    maxChars?: number; // Maximum visible characters before clamping (default: 350)
    isDetailView?: boolean; // If true, applies detail view styling and higher threshold
}

const ExpandableRichText: React.FC<ExpandableRichTextProps> = ({
    content,
    facets,
    className,
    maxLines = 6,
    maxChars = 350,
    isDetailView = false,
}) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);

    if (!content) return null;

    // Detect if content is long based on char count or line break count
    const linesCount = content.split('\n').length;
    const isLongContent = content.length > maxChars || linesCount > maxLines;

    // Maximum height calculations based on view type and line limits:
    // Feed view (font 15px, leading 22.5px): 6 lines ~ 135px - 145px
    // Detail view (font 18px, leading 28px): 8 lines ~ 224px - 240px
    // Quote view (font 14px, leading 20px): 4 lines ~ 80px - 95px
    const getMaxHeightClass = () => {
        if (isDetailView) {
            return 'max-h-[220px]';
        }
        if (maxLines <= 4) {
            return 'max-h-[100px]';
        }
        return 'max-h-[145px]';
    };

    const maxHeightClass = getMaxHeightClass();

    return (
        <div className="w-full relative">
            <div
                className={cn(
                    "relative transition-all duration-300 ease-in-out",
                    !isExpanded && isLongContent
                        ? cn("overflow-hidden", maxHeightClass)
                        : ""
                )}
            >
                <RichText content={content} facets={facets} className={className} />

                {/* Subtle Gradient Fade Overlay when collapsed */}
                {!isExpanded && isLongContent && (
                    <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-white dark:from-dark-bg to-transparent pointer-events-none" />
                )}
            </div>

            {isLongContent && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                    className={cn(
                        "inline-flex items-center gap-1 text-primary-500 hover:underline font-semibold transition-colors focus:outline-none",
                        isDetailView ? "text-[15px] mt-2 mb-2" : "text-[14px] mt-1.5 mb-1.5"
                    )}
                >
                    <span>
                        {isExpanded ? t('post.show_less', 'Show less') : t('post.show_more', 'Show more')}
                    </span>
                    {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                </button>
            )}
        </div>
    );
};

export default ExpandableRichText;
