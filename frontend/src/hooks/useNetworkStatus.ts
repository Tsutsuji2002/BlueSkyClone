import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  effectiveType?: string;
  saveData?: boolean;
}

/**
 * Hook to monitor the user's network connectivity status.
 * Uses navigator.onLine and the Network Information API (if available).
 */
export const useNetworkStatus = (): NetworkStatus => {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    effectiveType: (navigator as any).connection?.effectiveType,
    saveData: (navigator as any).connection?.saveData,
  });

  useEffect(() => {
    const handleOnline = () => setStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus(prev => ({ ...prev, isOnline: false }));

    const handleConnectionChange = () => {
      setStatus(prev => ({
        ...prev,
        effectiveType: (navigator as any).connection?.effectiveType,
        saveData: (navigator as any).connection?.saveData,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return status;
};
