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
        console.log(`[ScrollRestoration] Path: ${currentPath}, NavType: ${navigationType}`);

        // 1. Mark this path as visited
        visitedPathsRef.current.add(currentPath);

        // 2. Clear stale positions (older than 10 mins)
        const now = Date.now();
        try {
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith(STORAGE_PREFIX)) {
                    const data = JSON.parse(sessionStorage.getItem(key) || '{}');
                    if (data.ts && now - data.ts > SCROLL_TTL_MS) {
                        console.log(`[ScrollRestoration] Pruning stale: ${key}`);
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
                    console.log(`[ScrollRestoration] Found saved pos for ${currentPath}: y=${y}`);
                    if (y > 0) {
                        const delays = [50, 150, 300, 600, 1000];
                        let attempt = 0;

                        const tryScroll = () => {
                            const docHeight = document.documentElement.scrollHeight;
                            const viewHeight = window.innerHeight;
                            
                            console.log(`[ScrollRestoration] Attempt ${attempt}: docHeight=${docHeight}, targetY=${y}`);
                            
                            if (docHeight >= y + viewHeight || attempt >= delays.length - 1) {
                                console.log(`[ScrollRestoration] Executing scroll to ${y}`);
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
            } else {
                console.log(`[ScrollRestoration] No saved pos for ${currentPath}`);
            }
        } else {
            console.log(`[ScrollRestoration] New navigation, scrolling to top.`);
            window.scrollTo(0, 0);
        }

        // 4. Save Logic (on cleanup/unmount)
        return () => {
            const currentY = window.scrollY;
            console.log(`[ScrollRestoration] Cleanup for ${currentPath}, scrollY=${currentY}`);
            if (currentY > 0) {
                const entry: ScrollEntry = { y: currentY, ts: Date.now() };
                sessionStorage.setItem(STORAGE_PREFIX + currentPath, JSON.stringify(entry));
            }
        };
    }, [pathname, navigationType]);

    return null;
}
