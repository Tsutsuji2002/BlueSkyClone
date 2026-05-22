import { User } from '../types';

export interface StoredAccount {
    id: string;
    did: string;
    handle: string;
    displayName: string;
    avatar?: string;
    lastUsed: number;
}

const STORAGE_KEY = 'bsky_saved_accounts';

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

    saveAccount: (user: User) => {
        const accounts = AccountManager.getAccounts();
        const existingIndex = accounts.findIndex(a => a.did === user.did);
        
        const newAccount: StoredAccount = {
            id: user.id,
            did: (user.did || '') as string,
            handle: user.handle,
            displayName: (user.displayName || user.handle || '') as string,
            avatar: (user.avatarUrl || user.avatar || undefined) as string | undefined,
            lastUsed: Date.now()
        };

        if (existingIndex > -1) {
            accounts[existingIndex] = newAccount;
        } else {
            accounts.push(newAccount);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    },

    removeAccount: (did: string) => {
        const accounts = AccountManager.getAccounts().filter(a => a.did !== did);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    },

    clear: () => {
        localStorage.removeItem(STORAGE_KEY);
    }
};
