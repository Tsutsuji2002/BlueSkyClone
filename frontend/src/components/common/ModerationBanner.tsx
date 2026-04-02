import React from 'react';
import { FiAlertCircle, FiEyeOff } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/classNames';

interface ModerationBannerProps {
    reason: string;
    behavior: 'warn' | 'hide';
    onShow?: () => void;
    className?: string;
    isDetailView?: boolean;
}

const ModerationBanner: React.FC<ModerationBannerProps> = ({ reason, behavior, onShow, className, isDetailView }) => {
    const { t } = useTranslation();

    return (
        <div className={cn(
            "flex items-center justify-between p-3.5 rounded-xl bg-gray-50/80 dark:bg-dark-surface/40 border border-gray-100 dark:border-dark-border/50 backdrop-blur-sm transition-all",
            isDetailView ? "my-2" : "mt-2",
            className
        )}>
            <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-full bg-gray-200/50 dark:bg-dark-surface/60">
                    <FiEyeOff className="text-gray-500 dark:text-dark-text-secondary" size={18} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-gray-900 dark:text-dark-text leading-tight">
                        {t(`moderation.${reason}`, reason)}
                    </span>
                    <span className="text-[12px] text-gray-500 dark:text-dark-text-secondary">
                        {behavior === 'hide'
                            ? t('moderation.content_hidden_desc', 'This content is hidden by your settings')
                            : t('moderation.content_warn_desc', 'This content may be sensitive')}
                    </span>
                </div>
            </div>
            {onShow && (
                <button
                    onClick={(e) => { e.stopPropagation(); onShow(); }}
                    className="px-4 py-1.5 rounded-full bg-gray-900 dark:bg-dark-text text-white dark:text-dark-bg text-sm font-bold hover:opacity-90 transition-opacity"
                >
                    {t('moderation.show', 'Show')}
                </button>
            )}
        </div>
    );
};

export default ModerationBanner;
