import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const useDocumentTitle = (title: string, suffix?: string) => {
    const { t } = useTranslation();
    const appName = suffix || t('common.app_name', 'Bluesky');

    useEffect(() => {
        if (title) {
            document.title = `${title} - ${appName}`;
        } else {
            document.title = appName;
        }
    }, [title, appName]);
};
