import React from 'react';
import { useTranslation } from 'react-i18next';
import { LinkPreview } from '../../types';
import { FiExternalLink, FiLink } from 'react-icons/fi';
import { cn } from '../../utils/classNames';

interface LinkPreviewCardProps {
    preview: LinkPreview;
    isSmall?: boolean;
}

const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({ preview, isSmall = false }) => {
    const { t } = useTranslation();
    const [imageError, setImageError] = React.useState(false);

    return (
        <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                "block border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors bg-white dark:bg-dark-bg group max-w-full",
                isSmall ? "mt-1" : "mt-3"
            )}
        >
            {preview.image && !imageError ? (
                <div className={cn(
                    "w-full overflow-hidden bg-gray-100 dark:bg-dark-surface relative border-b border-gray-100 dark:border-dark-border",
                    isSmall ? "aspect-[3/1]" : "aspect-[1.91/1]"
                )}>
                    <img
                        src={preview.image}
                        alt={preview.title || t('nav.link_preview')}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        onError={() => setImageError(true)}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                </div>
            ) : (
                <div className={cn("w-full bg-primary-500/10", isSmall ? "h-0.5" : "h-1")} />
            )}
            <div className={isSmall ? "p-2" : "p-3"}>
                <div className="flex items-center gap-1 mb-0.5">
                    <span className={cn(
                        "font-medium text-gray-500 dark:text-dark-text-secondary line-clamp-1",
                        isSmall ? "text-[10px]" : "text-[12px]"
                    )}>
                        {preview.domain || new URL(preview.url).hostname.replace('www.', '')}
                    </span>
                    <FiExternalLink size={isSmall ? 10 : 12} className="text-gray-400" />
                </div>
                <h4 className={cn(
                    "font-bold text-gray-900 dark:text-dark-text leading-snug line-clamp-2 transition-colors",
                    isSmall ? "text-[13px] mb-0" : "text-[15px] mb-1 group-hover:text-primary-600"
                )}>
                    {preview.title || preview.url}
                </h4>
                {preview.description && !isSmall && (
                    <p className="text-[14px] text-gray-500 dark:text-dark-text-secondary line-clamp-2 leading-relaxed opacity-90 mt-1">
                        {preview.description}
                    </p>
                )}
            </div>
        </a>
    );
};

export default LinkPreviewCard;
