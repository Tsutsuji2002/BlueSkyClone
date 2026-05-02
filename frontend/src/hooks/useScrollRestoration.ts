import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const SCROLL_TTL_MS = 10 * 60 * 1000; // 10 minutes
const STORAGE_PREFIX = 'scroll_pos_';

interface ScrollEntry {
    y: number;
    ts: number;
}

/**
 * Global scroll-restoration hook.
 * 
 * @param subKey Optional additional key (e.g., active tab ID) to differentiate scroll positions on the same path.
 */
export function useScrollRestoration(subKey?: string) {
    const location = useLocation();
    const { pathname } = location;
    const navigationType = useNavigationType();
    
    // The definitive key for this scroll position
    const storageKey = STORAGE_PREFIX + pathname + (subKey ? `_${subKey}` : '');

    useEffect(() => {
        const isPop = navigationType === 'POP' || (subKey !== undefined); // Treat tab switches like POP if they have a saved pos
        const saved = sessionStorage.getItem(storageKey);

        if (isPop && saved) {
            try {
                const { y } = JSON.parse(saved);
                if (y > 0) {
                    console.log(`[ScrollRestoration] Attempting restoration to ${y} for ${storageKey}`);
                    let restorationDone = false;
                    const startTime = Date.now();
                    const MAX_WAIT = 5000; // Wait up to 5 seconds for content

                    const executeScroll = () => {
                        window.scrollTo({ top: y, behavior: 'instant' });
                        // Only mark as done if we actually reached the target or the absolute bottom
                        const reachedTarget = Math.abs(window.scrollY - y) < 5;
                        const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 5;
                        
                        if (reachedTarget || isAtBottom) {
                            if (reachedTarget) {
                                console.log(`[ScrollRestoration] Successfully reached target ${y}`);
                                restorationDone = true;
                            } else if (isAtBottom && y > window.scrollY + 100) {
                                // We are at bottom but still far from target, don't mark as done, wait for more content
                                // This happens when the container renders a skeleton or hasn't hydrated properly.
                                console.log(`[ScrollRestoration] At bottom (${window.scrollY}) but waiting for target ${y}`);
                            } else {
                                restorationDone = true;
                            }
                        }
                    };

                    // 1. Initial attempt
                    executeScroll();

                    // 2. Persistent Observer attempt (as content loads)
                    const observer = new ResizeObserver(() => {
                        if (restorationDone) return;
                        
                        executeScroll();
                        
                        if (restorationDone) {
                            observer.disconnect();
                        } else if (Date.now() - startTime > MAX_WAIT) {
                            console.warn(`[ScrollRestoration] Timeout waiting to reach ${y}. Current: ${window.scrollY}`);
                            restorationDone = true;
                            observer.disconnect();
                        }
                    });

                    observer.observe(document.body);

                    return () => {
                        observer.disconnect();
                        restorationDone = true;
                    };
                }
            } catch (e) {
                console.error('ScrollRestoration: Failed to restore', e);
            }
        } else if (navigationType === 'PUSH') {
            // Only scroll to top on REAL new navigations, not subKey changes
            console.log(`[ScrollRestoration] PUSH navigation, scrolling to top.`);
            window.scrollTo(0, 0);
        }

        // Cleanup: Save position when leaving
        return () => {
            const currentY = window.scrollY;
            // Prevent saving "0" if we are obviously in a collapsing/unmounting state with height
            const currentHeight = document.documentElement.scrollHeight;
            if (currentY === 0 && currentHeight < 500) {
                 // Ignore 0-pos saves on collapsed pages to avoid overwriting real data
                 return;
            }
            const entry: ScrollEntry = { y: currentY, ts: Date.now() };
            sessionStorage.setItem(storageKey, JSON.stringify(entry));
        };
    }, [pathname, navigationType, storageKey, subKey]);

    // Background pruning of stale items
    useEffect(() => {
        const now = Date.now();
        try {
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith(STORAGE_PREFIX)) {
                    const val = sessionStorage.getItem(key);
                    if (val) {
                        const data = JSON.parse(val);
                        if (data.ts && now - data.ts > SCROLL_TTL_MS) {
                            sessionStorage.removeItem(key);
                        }
                    }
                }
            });
        } catch (e) {}
    }, []);

    return null;
}
