import { createSlice, createAsyncThunk, PayloadAction, ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { UserState, User } from '../../types';
import { API_BASE_URL } from '../../constants';

const initialState: UserState = {
    profile: null,
    users: [],
    suggestedUsers: [],
    mutedWords: [],
    mutedUsers: [],
    blockedUsers: [],
    selectedInterests: [],
    searchResults: [],
    isLoading: false,
    searchLoading: false,
    interestsLoading: false,
    error: null,
    actionLoading: {},
};

export const searchUsers = createAsyncThunk<
    User[],
    { query: string, skip: number, take: number },
    { rejectValue: string }
>(
    'user/search',
    async ({ query, skip, take }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/search/users?q=${encodeURIComponent(query)}&skip=${skip}&take=${take}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Search failed');
            return data.map((u: any) => ({
                id: u.id,
                did: u.did,
                handle: u.handle,
                username: u.username || u.handle,
                displayName: u.displayName || '',
                avatarUrl: u.avatar || u.avatarUrl,
                bio: u.bio,
                followersCount: u.followersCount || 0,
                followingCount: u.followingCount || 0,
                postsCount: u.postsCount || 0,
            } as User));
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchUserProfile = createAsyncThunk<
    { user: User, isFollowing: boolean, isBlockedBy: boolean, isBlocking: boolean, isMuted: boolean },
    string,
    { rejectValue: string }
>(
    'user/fetchProfile',
    async (actor: string, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            // actor can be a handle or a did/id — try handle endpoint first
            const response = await fetch(
                `${API_BASE_URL}/users/profile/${encodeURIComponent(actor)}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch profile');

            const u = data.user;
            const user: User = {
                id: u.id,
                did: u.did,
                handle: u.handle,
                username: u.username || u.handle,
                displayName: u.displayName || '',
                avatarUrl: u.avatar || u.avatarUrl,
                coverImage: u.coverImage || u.coverImageUrl,
                bio: u.bio,
                location: u.location,
                website: u.website,
                followersCount: u.followersCount || 0,
                followingCount: u.followingCount || 0,
                postsCount: u.postsCount || 0,
                isFollowing: data.isFollowing,
                followingReference: u.followingReference,
                isBlocking: data.isBlocking,
                isBlockedBy: data.isBlockedBy,
                isMuted: data.isMuted,
            } as any;

            return {
                user,
                isFollowing: data.isFollowing,
                isBlockedBy: data.isBlockedBy,
                isBlocking: data.isBlocking,
                isMuted: data.isMuted,
            };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchUserProfileById = fetchUserProfile;

export const fetchFollowers = createAsyncThunk<
    User[],
    string,
    { rejectValue: string }
>(
    'user/fetchFollowers',
    async (actor: string, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/users/${encodeURIComponent(actor)}/followers`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch followers');
            const followersArray = Array.isArray(data) ? data : (data.followers || []);
            return followersArray.map((u: any) => ({
                id: u.id,
                did: u.did,
                handle: u.handle,
                username: u.username || u.handle,
                displayName: u.displayName || '',
                avatarUrl: u.avatar || u.avatarUrl,
                bio: u.bio,
                isFollowing: u.isFollowing,
                followingReference: u.followingReference,
            } as User));
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchFollowing = createAsyncThunk<
    User[],
    string,
    { rejectValue: string }
>(
    'user/fetchFollowing',
    async (actor: string, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/users/${encodeURIComponent(actor)}/following`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch following');
            const followingArray = Array.isArray(data) ? data : (data.following || []);
            return followingArray.map((u: any) => ({
                id: u.id,
                did: u.did,
                handle: u.handle,
                username: u.username || u.handle,
                displayName: u.displayName || '',
                avatarUrl: u.avatar || u.avatarUrl,
                bio: u.bio,
                isFollowing: u.isFollowing,
                followingReference: u.followingReference,
            } as User));
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const followUserAsync = createAsyncThunk<
    { isFollowing: boolean, followersCount: number, uri: string },
    string,
    { rejectValue: string }
>(
    'user/follow',
    async (userId: string, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/follow/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to follow');
            return { isFollowing: true, followersCount: data.followersCount || 0, uri: data.uri || '' };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const unfollowUserAsync = createAsyncThunk<
    { isFollowing: boolean, followersCount: number },
    { userId: string, followUri: string },
    { rejectValue: string }
>(
    'user/unfollow',
    async ({ userId }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/unfollow/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to unfollow');
            return { isFollowing: false, followersCount: data.followersCount || 0 };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const blockUserAsync = createAsyncThunk<
    { isBlocking: boolean, isFollowing: boolean, uri: string },
    string,
    { rejectValue: string }
>(
    'user/block',
    async (userId: string, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/block/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to block');
            return { isBlocking: true, isFollowing: false, uri: '' };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const unblockUserAsync = createAsyncThunk<
    { isBlocking: boolean },
    { userId: string, blockUri: string },
    { rejectValue: string }
>(
    'user/unblock',
    async ({ userId }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/unblock/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const data = await response.json();
                return rejectWithValue(data.message || 'Failed to unblock');
            }
            return { isBlocking: false };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchMutedAccounts = createAsyncThunk<User[], void, { rejectValue: string }>(
    'user/fetchMutes',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/muted`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch muted accounts');
            return data.map((u: any) => ({
                id: u.id,
                did: u.did,
                handle: u.handle,
                username: u.username || u.handle,
                displayName: u.displayName || '',
                avatarUrl: u.avatar || u.avatarUrl,
                isMuted: true,
            } as User));
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchBlockedAccounts = createAsyncThunk<User[], void, { rejectValue: string }>(
    'user/fetchBlocks',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/blocked`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch blocked accounts');
            return data.map((u: any) => ({
                id: u.id,
                did: u.did,
                handle: u.handle,
                username: u.username || u.handle,
                displayName: u.displayName || '',
                avatarUrl: u.avatar || u.avatarUrl,
                isBlocking: true,
            } as User));
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// Muted Words Thunks — backed by REST API
export const fetchMutedWords = createAsyncThunk<any[], void, { rejectValue: string }>(
    'user/fetchMutedWords',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/muted-words`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch muted words');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const addMutedWordAsync = createAsyncThunk<any, { word: string, muteBehavior: string }, { rejectValue: string }>(
    'user/addMutedWord',
    async (data, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/muted-words`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) return rejectWithValue(result.message || 'Failed to add muted word');
            return result;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const deleteMutedWordAsync = createAsyncThunk<number, number, { rejectValue: string }>(
    'user/deleteMutedWord',
    async (id, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/muted-words/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const data = await response.json();
                return rejectWithValue(data.message || 'Failed to delete muted word');
            }
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const muteUserAsync = createAsyncThunk<
    { isMuted: boolean },
    string,
    { rejectValue: string }
>(
    'user/mute',
    async (userId: string, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/mute/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const data = await response.json();
                return rejectWithValue(data.message || 'Failed to mute user');
            }
            return { isMuted: true };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const unmuteUserAsync = createAsyncThunk<
    { isMuted: boolean },
    string,
    { rejectValue: string }
>(
    'user/unmute',
    async (userId: string, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/unmute/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const data = await response.json();
                return rejectWithValue(data.message || 'Failed to unmute user');
            }
            return { isMuted: false };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchSelectedInterests = createAsyncThunk<
    string[],
    void,
    { rejectValue: string }
>(
    'user/fetchInterests',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/User/interests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch interests');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const saveSelectedInterests = createAsyncThunk<
    string[],
    string[],
    { rejectValue: string }
>(
    'user/saveInterests',
    async (interests: string[], { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/User/interests`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(interests)
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to save interests');
            return interests;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        clearProfile: (state: UserState) => {
            state.profile = null;
        },
        setActiveProfileTab: (state, action: PayloadAction<string>) => {
            state.activeProfileTab = action.payload;
        },
        updateProfileLocal: (state: UserState, action: PayloadAction<Partial<User>>) => {
            if (state.profile) {
                state.profile = { ...state.profile, ...action.payload };
            }
        }
    },
    extraReducers: (builder: ActionReducerMapBuilder<UserState>) => {
        builder
            // Search Users
            .addCase(searchUsers.pending, (state: UserState, action: any) => {
                state.searchLoading = true;
                state.error = null;
                const { skip } = action.meta.arg;
                if (skip === 0) {
                    state.searchResults = [];
                }
            })
            .addCase(searchUsers.fulfilled, (state: UserState, action: any) => {
                state.searchLoading = false;
                const { skip } = action.meta.arg;
                if (skip === 0) {
                    state.searchResults = action.payload;
                } else {
                    const existingIds = new Set(state.searchResults.map((u: User) => u.id));
                    const newUsers = action.payload.filter((u: User) => !existingIds.has(u.id));
                    state.searchResults = [...state.searchResults, ...newUsers];
                }
            })
            .addCase(searchUsers.rejected, (state: UserState, action) => {
                state.searchLoading = false;
                state.error = action.payload as string;
            })
            // Fetch Profile
            .addCase(fetchUserProfile.pending, (state: UserState, action) => {
                state.isLoading = true;
                state.error = null;
                // Only clear if we're switching to a DIFFERENT profile
                if (state.profile && state.profile.handle !== action.meta.arg) {
                    state.profile = null;
                }
            })
            .addCase(fetchUserProfile.fulfilled, (state: UserState, action) => {
                state.isLoading = false;
                state.profile = action.payload.user;
            })
            .addCase(fetchUserProfile.rejected, (state: UserState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Follow User
            .addCase(followUserAsync.pending, (state: UserState, action) => {
                state.actionLoading[action.meta.arg] = true;
            })
            .addCase(followUserAsync.fulfilled, (state: UserState, action) => {
                const userId = action.meta.arg;
                state.actionLoading[userId] = false;
                if (state.profile && state.profile.id === userId) {
                    state.profile.isFollowing = true;
                    state.profile.followingReference = action.payload.uri;
                }
            })
            .addCase(followUserAsync.rejected, (state: UserState, action) => {
                state.actionLoading[action.meta.arg] = false;
            })
            // Unfollow User
            .addCase(unfollowUserAsync.pending, (state: UserState, action) => {
                state.actionLoading[action.meta.arg.userId] = true;
            })
            .addCase(unfollowUserAsync.fulfilled, (state: UserState, action) => {
                const userId = action.meta.arg.userId;
                state.actionLoading[userId] = false;
                if (state.profile && state.profile.id === userId) {
                    state.profile.isFollowing = false;
                    state.profile.followingReference = undefined;
                }
            })
            .addCase(unfollowUserAsync.rejected, (state: UserState, action) => {
                state.actionLoading[action.meta.arg.userId] = false;
            })
            // Block User
            .addCase(blockUserAsync.fulfilled, (state: UserState, action) => {
                const userId = action.meta.arg;
                if (state.profile && state.profile.id === userId) {
                    state.profile.isBlocking = true;
                    state.profile.blockingReference = action.payload.uri;
                    state.profile.isFollowing = false;
                }
            })
            // Unblock User
            .addCase(unblockUserAsync.fulfilled, (state: UserState, action) => {
                const userId = action.meta.arg.userId;
                if (state.profile && state.profile.id === userId) {
                    state.profile.isBlocking = false;
                    state.profile.blockingReference = undefined;
                }
            })
            // Mute User
            .addCase(muteUserAsync.fulfilled, (state: UserState, action) => {
                const userId = action.meta.arg;
                if (state.profile && state.profile.id === userId) {
                    state.profile.isMuted = true;
                }
            })
            // Unmute User
            .addCase(unmuteUserAsync.fulfilled, (state: UserState, action) => {
                const userId = action.meta.arg;
                if (state.profile && state.profile.id === userId) {
                    state.profile.isMuted = false;
                }
            })
            // Fetch Selected Interests
            .addCase(fetchSelectedInterests.pending, (state: UserState) => {
                state.interestsLoading = true;
                state.error = null;
            })
            .addCase(fetchSelectedInterests.fulfilled, (state: UserState, action: PayloadAction<string[]>) => {
                state.interestsLoading = false;
                state.selectedInterests = action.payload;
            })
            .addCase(fetchSelectedInterests.rejected, (state: UserState, action) => {
                state.interestsLoading = false;
                state.error = action.payload as string;
            })
            // Save Selected Interests
            .addCase(saveSelectedInterests.pending, (state: UserState) => {
                state.interestsLoading = true;
                state.error = null;
            })
            .addCase(saveSelectedInterests.fulfilled, (state: UserState, action: PayloadAction<string[]>) => {
                state.interestsLoading = false;
                state.selectedInterests = action.payload;
            })
            .addCase(saveSelectedInterests.rejected, (state: UserState, action) => {
                state.interestsLoading = false;
                state.error = action.payload as string;
            })
            // Fetch Muted Accounts
            .addCase(fetchMutedAccounts.pending, (state: UserState) => { state.isLoading = true; })
            .addCase(fetchMutedAccounts.fulfilled, (state: UserState, action) => {
                state.isLoading = false;
                state.users = action.payload;
            })
            .addCase(fetchMutedAccounts.rejected, (state: UserState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Fetch Blocked Accounts
            .addCase(fetchBlockedAccounts.pending, (state: UserState) => { state.isLoading = true; })
            .addCase(fetchBlockedAccounts.fulfilled, (state: UserState, action) => {
                state.isLoading = false;
                state.users = action.payload;
            })
            .addCase(fetchBlockedAccounts.rejected, (state: UserState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Fetch Followers
            .addCase(fetchFollowers.pending, (state: UserState) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchFollowers.fulfilled, (state: UserState, action: PayloadAction<User[]>) => {
                state.isLoading = false;
                state.users = action.payload;
            })
            .addCase(fetchFollowers.rejected, (state: UserState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Fetch Following
            .addCase(fetchFollowing.pending, (state: UserState) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchFollowing.fulfilled, (state: UserState, action: PayloadAction<User[]>) => {
                state.isLoading = false;
                state.users = action.payload;
            })
            .addCase(fetchFollowing.rejected, (state: UserState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Muted Words
            .addCase(fetchMutedWords.pending, (state: UserState) => {
                state.isLoading = true;
            })
            .addCase(fetchMutedWords.fulfilled, (state: UserState, action: PayloadAction<any[]>) => {
                state.isLoading = false;
                state.mutedWords = action.payload;
            })
            .addCase(fetchMutedWords.rejected, (state: UserState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(addMutedWordAsync.fulfilled, (state: UserState, action: PayloadAction<any>) => {
                state.mutedWords.push(action.payload);
            })
            .addCase(deleteMutedWordAsync.fulfilled, (state: UserState, action: PayloadAction<number>) => {
                state.mutedWords = state.mutedWords.filter(w => w.id !== action.payload);
            });
    }
});

export const { clearProfile, updateProfileLocal, setActiveProfileTab } = userSlice.actions;
export default userSlice.reducer;
