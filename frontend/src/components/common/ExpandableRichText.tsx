import React, { useState } from 'react';
import RichText from './RichText';
import { Facet } from '../../types';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/classNames';

interface ExpandableRichTextProps {
    content?: string;
    facets?: Facet[];
    className?: string;
    maxLines?: number; // Maximum visible lines before clamping (default: 6)
    maxChars?: number; // Maximum visible characters before clamping (default: 400)
    isDetailView?: boolean; // If true, applies detail view styling and higher threshold
}

const ExpandableRichText: React.FC<ExpandableRichTextProps> = ({
    content,
    facets,
    className,
    maxLines = 6,
    maxChars = 400,
    isDetailView = false,
}) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);

    if (!content) return null;

    // Detect if content is long based on char count or line break count
    const linesCount = content.split('\n').length;
    const isLongContent = content.length > maxChars || linesCount > maxLines;

    // Determine line clamp CSS class based on maxLines prop
    const getClampClass = (lines: number) => {
        switch (lines) {
            case 3: return 'line-clamp-3';
            case 4: return 'line-clamp-4';
            case 5: return 'line-clamp-5';
            case 6: return 'line-clamp-6';
            case 8: return 'line-clamp-8';
            case 10: return 'line-clamp-10';
            default: return 'line-clamp-6';
        }
    };

    const clampClass = getClampClass(maxLines);

    return (
        <div className="w-full">
            <div
                className={cn(
                    "transition-all duration-200",
                    !isExpanded && isLongContent ? cn("overflow-hidden", clampClass) : ""
                )}
            >
                <RichText content={content} facets={facets} className={className} />
            </div>

            {isLongContent && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                    className={cn(
                        "text-primary-500 hover:underline font-medium text-left block transition-colors",
                        isDetailView ? "text-[15px] mt-2 mb-3" : "text-[14px] mt-1 mb-2"
                    )}
                >
                    {isExpanded ? t('post.show_less', 'Show less') : t('post.show_more', 'Show more')}
                </button>
            )}
        </div>
    );
};

export default ExpandableRichText;
