import React from 'react';
import { useTranslation } from 'react-i18next';
import { LinkPreview } from '../../types';

interface LinkPreviewCardProps {
    preview: LinkPreview;
}

const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({ preview }) => {
    const { t } = useTranslation();
    return (
        <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-3 border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors bg-white dark:bg-dark-bg"
        >
            {preview.image && (
                <div className="w-full aspect-[1.91/1] overflow-hidden bg-gray-100 dark:bg-dark-surface">
                    <img
                        src={preview.image}
                        alt={preview.title || t('nav.link_preview')}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                </div>
            )}
            <div className="p-3">
                <span className="text-[11px] font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider mb-1 block">
                    {preview.domain || new URL(preview.url).hostname}
                </span>
                <h4 className="text-[15px] font-bold text-gray-900 dark:text-dark-text leading-snug line-clamp-2 mb-1">
                    {preview.title}
                </h4>
                {preview.description && (
                    <p className="text-[14px] text-gray-500 dark:text-dark-text-secondary line-clamp-2 leading-normal">
                        {preview.description}
                    </p>
                )}
            </div>
        </a>
    );
};

export default LinkPreviewCard;
