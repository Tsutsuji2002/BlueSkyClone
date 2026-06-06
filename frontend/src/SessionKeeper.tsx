import React, { useEffect } from 'react';
import { useAppDispatch } from './hooks/useAppDispatch';
import { useAppSelector } from './hooks/useAppSelector';
import { AccountManager } from './utils/accountManager';
import { useRefreshSessionMutation, useSwitchAccountMutation } from './redux/api/authApi';
import { setAuth } from './redux/slices/authSlice';

/**
 * SessionKeeper runs in the background to ensure all saved sessions remain stable.
 * It periodically refreshes tokens for background accounts and the active one.
 */
export const SessionKeeper: React.FC = () => {
    const dispatch = useAppDispatch();
    const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
    const activeUser = useAppSelector((state) => state.auth.user);
    const [refreshActive] = useRefreshSessionMutation();
    const [switchMutation] = useSwitchAccountMutation();

    const isInitialized = React.useRef(false);
    const prevDid = React.useRef(activeUser?.did);
    const handshakeSettled = useAppSelector((state) => (state.user as any).handshakeSettled);
    
    useEffect(() => {
        // [CLEANUP] Removed redundant refreshActive() on mount.
        // Handshake already handles session verification and hydration.
        isInitialized.current = true;

        // Background keeper interval (every 4 hours)
        const interval = setInterval(async () => {
            const accounts = AccountManager.getAccounts();
            
            for (const account of accounts) {
                // [CROSS-TAB SAFETY] Use a localStorage lock to prevent multiple tabs from 
                // refreshing the same account simultaneously and causing 401 race conditions.
                const lockKey = `refresh_lock_${account.did}`;
                const now = Date.now();
                const lockValue = localStorage.getItem(lockKey);
                
                if (lockValue) {
                    const lockTime = parseInt(lockValue, 10);
                    if (now - lockTime < 60000) { // 60s lock
                        console.log(`[SessionKeeper] Refresh for ${account.handle} is locked by another tab. Skipping.`);
                        continue;
                    }
                }
                
                // Acquire lock
                localStorage.setItem(lockKey, now.toString());

                // If it's the active account, use regular refresh
                if (isAuthenticated && activeUser?.did === account.did) {
                    try {
                        const result = await refreshActive().unwrap();
                        dispatch(setAuth(result));
                    } catch (err) {
                        console.error(`Failed to background refresh active account ${account.handle}:`, err);
                    }
                } 
                // If it's a background account, use switch (refresh) mutation with its stored token
                else if (account.refreshToken) {
                    try {
                        // We use the switch mutation secretly to get fresh tokens for background accounts
                        // We DON'T dispatch setAuth here because we don't want to change the visual active user
                        const result = await switchMutation({ refreshToken: account.refreshToken }).unwrap();
                        AccountManager.updateTokens(account.did, result.token, result.refreshToken);
                        console.log(`Successfully refreshed background session for ${account.handle}`);
                    } catch (err) {
                        console.warn(`Background refresh failed for ${account.handle}:`, err);
                    }
                }

                // Release lock immediately or let it expire
                localStorage.removeItem(lockKey);
            }
        }, 4 * 60 * 60 * 1000); // 4 hours

        return () => clearInterval(interval);
    }, [isAuthenticated, activeUser?.did, dispatch, refreshActive, switchMutation]);

    return null;
};
