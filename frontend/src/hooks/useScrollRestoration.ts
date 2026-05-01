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
 * - On PUSH navigation (clicking a link): saves the current scrollY for the
 *   pathname we are *leaving*.
 * - On POP navigation (browser back/forward): restores the saved position
 *   using progressive retries to wait for Virtuoso to render enough items.
 * - On fresh navigation or after TTL expiry: scrolls to top.
 */
export function useScrollRestoration() {
    const location = useLocation();
    const { pathname } = location;
    const navigationType = useNavigationType();
    const visitedPathsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const currentPath = pathname;
        const isPop = navigationType === 'POP';

        // 1. Mark this path as visited
        visitedPathsRef.current.add(currentPath);

        // 2. Clear stale positions (older than 10 mins)
        const now = Date.now();
        try {
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith(STORAGE_PREFIX)) {
                    const data = JSON.parse(sessionStorage.getItem(key) || '{}');
                    if (data.ts && now - data.ts > SCROLL_TTL_MS) {
                        sessionStorage.removeItem(key);
                    }
                }
            });
        } catch (e) {
            console.warn('ScrollRestoration: Failed to prune sessionStorage', e);
        }

        // 3. Restoration Logic (Browser Back/Forward only)
        if (isPop) {
            const saved = sessionStorage.getItem(STORAGE_PREFIX + currentPath);
            if (saved) {
                try {
                    const { y } = JSON.parse(saved);
                    if (y > 0) {
                        // Progressive retry strategy: 
                        // Virtuoso takes time to measure and render. We probe at increasing intervals.
                        const delays = [50, 150, 300, 600, 1000];
                        let attempt = 0;

                        const tryScroll = () => {
                            const docHeight = document.documentElement.scrollHeight;
                            const viewHeight = window.innerHeight;
                            
                            // Only scroll if the document has enough height to actually reach the target,
                            // or if we've exhausted all retries.
                            if (docHeight >= y + viewHeight || attempt >= delays.length - 1) {
                                window.scrollTo({ top: y, behavior: 'instant' });
                                return;
                            }
                            
                            attempt++;
                            setTimeout(tryScroll, delays[attempt]);
                        };

                        setTimeout(tryScroll, delays[0]);
                    }
                } catch (e) {
                    console.error('ScrollRestoration: Failed to restore', e);
                }
            }
        } else {
            // New navigation (PUSH/REPLACE): always start at top
            window.scrollTo(0, 0);
        }

        // 4. Save Logic (on cleanup/unmount)
        return () => {
            const currentY = window.scrollY;
            // Closure fix: currentPath is captured from the outer scope of the effect setup,
            // which corresponds to the pathname this specific effect instance was created for.
            if (currentY > 0) {
                const entry: ScrollEntry = { y: currentY, ts: Date.now() };
                sessionStorage.setItem(STORAGE_PREFIX + currentPath, JSON.stringify(entry));
            }
        };
    }, [pathname, navigationType]);

    return null;
}
