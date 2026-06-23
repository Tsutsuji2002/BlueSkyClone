import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useTranslation } from 'react-i18next';
import { FiWifi, FiWifiOff, FiAlertTriangle, FiCheck } from 'react-icons/fi';
import classNames from 'classnames';

/**
 * Global Network Status Banner.
 * Displays a non-intrusive notification when offline, in a slow connection, or when back online.
 */
export const NetworkStatusBanner: React.FC = () => {
    const { isOnline, effectiveType } = useNetworkStatus();
    const { t } = useTranslation();
    const [showOnlineBanner, setShowOnlineBanner] = useState(false);
    const [lastStatus, setLastStatus] = useState(isOnline);

    useEffect(() => {
        if (!lastStatus && isOnline) {
            // Transitions from offline to online
            setShowOnlineBanner(true);
            const timer = setTimeout(() => setShowOnlineBanner(false), 5000);
            return () => clearTimeout(timer);
        }
        setLastStatus(isOnline);
    }, [isOnline, lastStatus]);

    const isSlow = isOnline && (effectiveType === '2g' || effectiveType === 'slow-2g');

    if (!isOnline) {
        return (
            <div className="fixed top-0 left-0 right-0 z-[9999] animate-in slide-in-from-top duration-300">
                <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg">
                    <FiWifiOff className="w-4 h-4" />
                    <span className="text-sm font-bold">{t('common.network.offline', 'You are offline. Some features may be unavailable.')}</span>
                </div>
            </div>
        );
    }

    if (showOnlineBanner) {
        return (
            <div className="fixed top-0 left-0 right-0 z-[9999] animate-in slide-in-from-top fade-out fill-mode-forwards delay-[4000ms] duration-1000">
                <div className="bg-green-500 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg">
                    <FiCheck className="w-4 h-4" />
                    <span className="text-sm font-bold">{t('common.network.back_online', 'Back online.')}</span>
                </div>
            </div>
        );
    }

    if (isSlow) {
        return (
            <div className="fixed top-0 left-0 right-0 z-[9999] animate-in slide-in-from-top duration-300">
                <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg">
                    <FiAlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-bold">{t('common.network.slow', 'Slow connection detected.')}</span>
                </div>
            </div>
        );
    }

    return null;
};
