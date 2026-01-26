import { formatDistance, format, isSameWeek, formatDistanceToNowStrict } from 'date-fns';
import { enUS, vi, es, fr, ja, ko, zhCN, de } from 'date-fns/locale';

const dateLocales: { [key: string]: any } = {
    en: enUS,
    vi: vi,
    es: es,
    fr: fr,
    ja: ja,
    ko: ko,
    zh: zhCN,
    de: de
};

/**
 * Format a date to relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: string | Date): string => {
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return formatDistance(dateObj, new Date(), { addSuffix: true });
    } catch (error) {
        return '';
    }
};

/**
 * Format a date to a specific format
 */
export const formatDate = (date: string | Date, formatStr: string = 'dd/MM/yyyy'): string => {
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return format(dateObj, formatStr);
    } catch (error) {
        return '';
    }
};

/**
 * Format a date for display in chat messages
 * Same week: "HH:mm T6" (Vietnamese example)
 * Older: "HH:mm 5 Tháng 1, 2026" (Vietnamese example)
 */
export const formatChatMessageDate = (date: string | Date, lang: string = 'en'): string => {
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        const now = new Date();
        const locale = dateLocales[lang] || enUS;
        const timeStr = format(d, 'HH:mm');

        if (isSameWeek(d, now)) {
            if (lang === 'vi') {
                const viDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                return `${timeStr} ${viDays[d.getDay()]}`;
            }
            return `${timeStr} ${format(d, 'eee', { locale })}`;
        } else {
            if (lang === 'vi') {
                return `${timeStr} ${format(d, "d 'Tháng' M, yyyy", { locale })}`;
            }
            // Japanese/Chinese usually use different ordering
            if (lang === 'ja' || lang === 'zh' || lang === 'ko') {
                return `${timeStr} ${format(d, 'yyyy年M月d日', { locale })}`;
            }
            return `${timeStr} ${format(d, 'd MMM, yyyy', { locale })}`;
        }
    } catch (error) {
        return '';
    }
};

/**
 * Format a date for display in posts (e.g., "2h" or "Dec 19")
 */
export const formatPostDate = (date: string | Date, lang: string = 'en'): string => {
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const now = new Date();
        const diffInHours = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);
        const locale = dateLocales[lang] || enUS;

        if (diffInHours < 24 * 7) {
            // Use date-fns for relative time which is localized
            // "1m", "2h", "3d" etc.
            return formatDistanceToNowStrict(dateObj, {
                locale,
                addSuffix: false
            })
                .replace(' minutes', 'm')
                .replace(' minute', 'm')
                .replace(' hours', 'h')
                .replace(' hour', 'h')
                .replace(' days', 'd')
                .replace(' day', 'd')
                .replace(' seconds', 's')
                .replace(' second', 's')
                .replace(' phút', 'phót') // Vietnamese short forms if needed
                .replace(' giờ', 'giờ')
                .replace(' ngày', 'ngày');
            // Note: Bluesky uses very short forms. 
            // In Vietnamese it's usually "1 giờ", "1 ngày".
            // If we want exact "1h", "1d" we might need custom logic for each lang.
        } else {
            return format(dateObj, 'MMM d', { locale });
        }
    } catch (error) {
        return '';
    }
};
