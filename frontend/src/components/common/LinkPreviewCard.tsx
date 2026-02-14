import React from 'react';
import { useTranslation } from 'react-i18next';
import { LinkPreview } from '../../types';
import { FiExternalLink, FiLink } from 'react-icons/fi';

interface LinkPreviewCardProps {
    preview: LinkPreview;
}

const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({ preview }) => {
    const { t } = useTranslation();
    const [imageError, setImageError] = React.useState(false);

    return (
        <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-3 border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors bg-white dark:bg-dark-bg group max-w-full"
        >
            {preview.image && !imageError ? (
                <div className="w-full aspect-[1.91/1] overflow-hidden bg-gray-100 dark:bg-dark-surface relative border-b border-gray-100 dark:border-dark-border">
                    <img
                        src={preview.image}
                        alt={preview.title || t('nav.link_preview')}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        onError={() => setImageError(true)}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                </div>
            ) : (
                <div className="w-full h-1 bg-primary-500/10" />
            )}
            <div className="p-3">
                <div className="flex items-center gap-1 mb-1">
                    <span className="text-[12px] font-medium text-gray-500 dark:text-dark-text-secondary line-clamp-1">
                        {preview.domain || new URL(preview.url).hostname.replace('www.', '')}
                    </span>
                    <FiExternalLink size={12} className="text-gray-400" />
                </div>
                <h4 className="text-[15px] font-bold text-gray-900 dark:text-dark-text leading-snug line-clamp-2 mb-1 group-hover:text-primary-600 transition-colors">
                    {preview.title || preview.url}
                </h4>
                {preview.description && (
                    <p className="text-[14px] text-gray-500 dark:text-dark-text-secondary line-clamp-2 leading-relaxed opacity-90">
                        {preview.description}
                    </p>
                )}
            </div>
        </a>
    );
};

export default LinkPreviewCard;
