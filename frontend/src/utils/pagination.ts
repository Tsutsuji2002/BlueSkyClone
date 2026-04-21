/**
 * Calculates a dynamic batch size based on the current viewport height.
 * @param itemHeight Average height of a single item in pixels (defaults to 200 for standard posts).
 * @param min Minimum batch size (defaults to 5).
 * @param max Maximum batch size (defaults to 20).
 * @returns An optimal batch size to fill the screen with a small buffer.
 */
export const getDynamicBatchSize = (itemHeight: number = 200, min: number = 5, max: number = 20): number => {
    try {
        const viewportHeight = window.innerHeight;
        // Calculate how many items fit in the viewport
        const visibleItems = Math.ceil(viewportHeight / itemHeight);
        // Add a buffer of 2 items to ensure the scroll container has enough content to be scrollable
        // and trigger the next batch load correctly.
        const calculatedSize = visibleItems + 2;
        
        return Math.max(min, Math.min(max, calculatedSize));
    } catch (e) {
        // Fallback for non-browser environments or errors
        return min;
    }
};
