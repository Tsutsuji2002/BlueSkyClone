import { User } from '../types';

export interface StoredAccount {
    id: string;
    did: string;
    handle: string;
    displayName: string;
    avatar?: string;
    lastUsed: number;
    accessToken?: string;
    refreshToken?: string;
}

const STORAGE_KEY = 'bsky_saved_accounts';
const ACTIVE_KEY = 'bsky_active_account_id';

export const AccountManager = {
    getAccounts: (): StoredAccount[] => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        try {
            return JSON.parse(stored).sort((a: StoredAccount, b: StoredAccount) => b.lastUsed - a.lastUsed);
        } catch (e) {
            return [];
        }
    },

    saveAccount: (user: User, accessToken?: string, refreshToken?: string) => {
        const accounts = AccountManager.getAccounts();
        const existingIndex = accounts.findIndex(a => a.did === user.did);
        
        const newAccount: StoredAccount = {
            id: user.id,
            did: (user.did || '') as string,
            handle: user.handle,
            displayName: (user.displayName || user.handle || '') as string,
            avatar: (user.avatarUrl || user.avatar || undefined) as string | undefined,
            lastUsed: Date.now(),
            accessToken,
            refreshToken
        };

        if (existingIndex > -1) {
            // Preserve existing tokens if not provided in this call
            accounts[existingIndex] = {
                ...newAccount,
                accessToken: accessToken || accounts[existingIndex].accessToken,
                refreshToken: refreshToken || accounts[existingIndex].refreshToken
            };
        } else {
            accounts.push(newAccount);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    },

    updateTokens: (did: string, accessToken: string, refreshToken: string) => {
        const accounts = AccountManager.getAccounts();
        const index = accounts.findIndex(a => a.did === did);
        if (index > -1) {
            accounts[index].accessToken = accessToken;
            accounts[index].refreshToken = refreshToken;
            accounts[index].lastUsed = Date.now();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
        }
    },

    clearTokens: (did: string) => {
        const accounts = AccountManager.getAccounts();
        const index = accounts.findIndex(a => a.did === did);
        if (index > -1) {
            accounts[index].accessToken = undefined;
            accounts[index].refreshToken = undefined;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
        }
    },

    removeAccount: (did: string) => {
        const accounts = AccountManager.getAccounts().filter(a => a.did !== did);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    },

    /** Mark which account is currently active (call on login success) */
    setActiveAccount: (user: User) => {
        localStorage.setItem(ACTIVE_KEY, String(user.id));
    },

    /** Get the stored active account id synchronously (returns null if none) */
    getActiveAccountId: (): string | null => {
        return localStorage.getItem(ACTIVE_KEY);
    },

    /** Check if an account has tokens and is resumable without re-login */
    isAccountResumable: (did: string): boolean => {
        const accounts = AccountManager.getAccounts();
        const account = accounts.find(a => a.did === did);
        return !!(account?.refreshToken);
    },

    /** Clear the active marker (call on logout) */
    clearActiveAccount: () => {
        localStorage.removeItem(ACTIVE_KEY);
    },

    /** Clear tokens for every saved account (used when the server session cookie expires) */
    clearAllTokens: () => {
        const accounts = AccountManager.getAccounts().map(a => ({
            ...a,
            accessToken: undefined,
            refreshToken: undefined,
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    },

    clear: () => {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ACTIVE_KEY);
    }
};
