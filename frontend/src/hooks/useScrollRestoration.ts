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
    const { pathname, key } = useLocation();
    const navType = useNavigationType();
    const prevPathRef = useRef<string>(pathname);

    // Save scroll position when navigating AWAY from a page
    useEffect(() => {
        return () => {
            // When this effect cleans up (route is changing), save the position
            // of the page we are leaving.
            const entry: ScrollEntry = { y: window.scrollY, ts: Date.now() };
            sessionStorage.setItem(
                STORAGE_PREFIX + prevPathRef.current,
                JSON.stringify(entry)
            );
            prevPathRef.current = pathname;
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
                    if (age < SCROLL_TTL_MS && entry.y > 0) {
                        // Progressive restore: try multiple times as Virtuoso
                        // renders more items and the document height grows.
                        const targetY = entry.y;
                        const delays = [50, 150, 300, 600];
                        delays.forEach(delay => {
                            setTimeout(() => {
                                // Only scroll if we haven't reached the target yet
                                // and the document is tall enough
                                if (document.documentElement.scrollHeight >= targetY + window.innerHeight * 0.5) {
                                    window.scrollTo({ top: targetY, behavior: 'auto' });
                                }
                            }, delay);
                        });
                        return;
                    }
                } catch {
                    // Corrupted entry — fall through to scroll-to-top
                }
                // Expired or corrupt — clean it up
                sessionStorage.removeItem(STORAGE_PREFIX + pathname);
            }
            // No saved position or expired — scroll to top
            window.scrollTo(0, 0);
        } else {
            // PUSH or REPLACE — always start at top
            window.scrollTo(0, 0);
        }
    }, [pathname, navType, key]);
}
