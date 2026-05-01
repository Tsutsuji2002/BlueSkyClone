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
 *   after a short delay so Virtuoso / DOM can re-render.
 * - On fresh navigation or after TTL expiry: scrolls to top.
 */
export function useScrollRestoration() {
    const { pathname } = useLocation();
    const navType = useNavigationType();
    const prevPathRef = useRef<string>(pathname);

    // Save scroll position when navigating AWAY from a page
    useEffect(() => {
        const handleBeforeNavigate = () => {
            const entry: ScrollEntry = { y: window.scrollY, ts: Date.now() };
            sessionStorage.setItem(
                STORAGE_PREFIX + prevPathRef.current,
                JSON.stringify(entry)
            );
        };

        // Capture scroll position right before the next route change.
        // We use `beforeunload` for hard navigations and rely on the
        // cleanup function + ref for SPA navigations.
        window.addEventListener('beforeunload', handleBeforeNavigate);

        return () => {
            // When this effect cleans up (route is changing), save the position
            // of the page we are leaving.
            const entry: ScrollEntry = { y: window.scrollY, ts: Date.now() };
            sessionStorage.setItem(
                STORAGE_PREFIX + prevPathRef.current,
                JSON.stringify(entry)
            );
            prevPathRef.current = pathname;
            window.removeEventListener('beforeunload', handleBeforeNavigate);
        };
    }, [pathname]);

    // Restore or reset scroll on route change
    useEffect(() => {
        if (navType === 'POP') {
            // Browser back/forward — try to restore
            const raw = sessionStorage.getItem(STORAGE_PREFIX + pathname);
            if (raw) {
                try {
                    const entry: ScrollEntry = JSON.parse(raw);
                    const age = Date.now() - entry.ts;
                    if (age < SCROLL_TTL_MS) {
                        // Small delay to let React re-render + Virtuoso measure
                        requestAnimationFrame(() => {
                            setTimeout(() => {
                                window.scrollTo({ top: entry.y, behavior: 'auto' });
                            }, 50);
                        });
                        return;
                    }
                } catch {
                    // Corrupted entry — fall through to scroll-to-top
                }
                // Expired or corrupt — clean it up
                sessionStorage.removeItem(STORAGE_PREFIX + pathname);
            }
            // No saved position — scroll to top
            window.scrollTo(0, 0);
        } else {
            // PUSH or REPLACE — always start at top
            window.scrollTo(0, 0);
        }
    }, [pathname, navType]);
}
