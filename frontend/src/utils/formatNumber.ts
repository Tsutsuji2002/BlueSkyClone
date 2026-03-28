/**
 * Formats a number into a shorter string representation (e.g., 6.6K, 1.2M).
 * @param count The number to format.
 * @returns A formatted string.
 */
export const formatCount = (count: number = 0): string => {
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    } else if (count >= 1000) {
        return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    }
    return count.toString();
};
