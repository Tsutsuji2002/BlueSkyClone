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
        // Only refresh on mount if we haven't already.
        // [OPTIMIZATION] Skip the initial redundant refresh if the "Consolidated Handshake" is already handling it.
        if (isAuthenticated && !isInitialized.current && handshakeSettled) {
            console.log('[SessionKeeper] Running deferred mount refresh (Handshake already settled).');
            refreshActive();
            isInitialized.current = true;
        }

        // If the DID changed, it means we just performed a Switch.
        // The switch mutation already provided fresh tokens, so we skip the extra refresh.
        if (activeUser?.did !== prevDid.current) {
            console.log('[SessionKeeper] Account switched, skipping redundant refresh.');
            prevDid.current = activeUser?.did;
        }

        // Background keeper interval (every 4 hours)
        const interval = setInterval(async () => {
            const accounts = AccountManager.getAccounts();
            
            for (const account of accounts) {
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
            }
        }, 4 * 60 * 60 * 1000); // 4 hours

        return () => clearInterval(interval);
    }, [isAuthenticated, activeUser?.did, dispatch, refreshActive, switchMutation]);

    return null;
};
