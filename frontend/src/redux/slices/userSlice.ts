import { createSlice, createAsyncThunk, PayloadAction, ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { UserState, User, MutedWord } from '../../types';
import { API_BASE_URL } from '../../constants';

const initialState: UserState = {
    profile: null,
    users: [],
    suggestedUsers: [],
    mutedWords: [],
    mutedUsers: [],
    mutedCursor: null,
    mutedHasMore: true,
    blockedUsers: [],
    blockedCursor: null,
    blockedHasMore: true,
    followers: [],
    followersCursor: null,
    followersHasMore: true,
    followingUsers: [],
    followingCursor: null,
    followingHasMore: true,
    selectedInterests: [],
    searchResults: [],
    isLoading: false,
    searchLoading: false,
    interestsLoading: false,
    error: null,
    actionLoading: {},
    cursor: null,
    hasMore: true,
};

export const normalizeIdentifier = (value?: string | null): string => {
    if (!value) return '';
    return value.trim().replace(/^@/, '').toLowerCase();
};

export const profileMatchesIdentifier = (profile: User | null, identifier: string): boolean => {
    if (!profile) return false;
    const normalizedIdentifier = normalizeIdentifier(identifier);
    if (!normalizedIdentifier) return false;

    return [
        normalizeIdentifier(profile.id),
        normalizeIdentifier(profile.did),
        normalizeIdentifier(profile.handle),
        normalizeIdentifier(profile.username),
    ].includes(normalizedIdentifier);
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
            const headers: Record<string, string> = {};
            if (token && token !== 'null') {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(
                `${API_BASE_URL}/search/users?q=${encodeURIComponent(query)}&skip=${skip}&take=${take}`,
                { headers }
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
            const headers: Record<string, string> = {};
            // Send token if available (authenticated); otherwise request as guest
            if (token && token !== 'null') {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(
                `${API_BASE_URL}/users/profile/${encodeURIComponent(actor)}`,
                { headers }
            );

            if (response.status === 403) {
                return rejectWithValue('PROFILE_PRIVATE');
            }

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
                muteInfo: u.muteInfo,
                mutedBy: u.mutedBy,
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
    { users: User[], cursor: string | null },
    { actor: string, cursor?: string, limit?: number },
    { rejectValue: string }
>(
    'user/fetchFollowers',
    async ({ actor, cursor, limit = 20 }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {};
            if (token && token !== 'null') headers['Authorization'] = `Bearer ${token}`;

            const params = new URLSearchParams({ limit: String(limit) });
            if (cursor) params.append('cursor', cursor);

            const response = await fetch(
                `${API_BASE_URL}/users/${encodeURIComponent(actor)}/followers?${params.toString()}`,
                { headers }
            );
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch followers');

            const followersArray = Array.isArray(data) ? data : (data.followers || []);
            const users = followersArray.map((u: any) => ({
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

            return { users, cursor: data.cursor || null };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchFollowing = createAsyncThunk<
    { users: User[], cursor: string | null },
    { actor: string, cursor?: string, limit?: number },
    { rejectValue: string }
>(
    'user/fetchFollowing',
    async ({ actor, cursor, limit = 20 }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {};
            if (token && token !== 'null') headers['Authorization'] = `Bearer ${token}`;

            const params = new URLSearchParams({ limit: String(limit) });
            if (cursor) params.append('cursor', cursor);

            const response = await fetch(
                `${API_BASE_URL}/users/${encodeURIComponent(actor)}/following?${params.toString()}`,
                { headers }
            );
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch following');

            const followingArray = Array.isArray(data) ? data : (data.following || []);
            const users = followingArray.map((u: any) => ({
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

            return { users, cursor: data.cursor || null };
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

export const fetchMutedAccounts = createAsyncThunk<{ users: User[], cursor: string | null }, { limit?: number, cursor?: string } | void, { rejectValue: string }>(
    'user/fetchMutes',
    async (params, { rejectWithValue }) => {
        try {
            const limit = params && 'limit' in params ? params.limit : 50;
            const cursor = params && 'cursor' in params ? params.cursor : '';
            const token = localStorage.getItem('token');
            const url = new URL(`${API_BASE_URL}/xrpc/app.bsky.graph.getMutes`);
            url.searchParams.append('limit', String(limit));
            if (cursor) url.searchParams.append('cursor', cursor);

            const response = await fetch(url.toString(), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch muted accounts');
            // - [ ] Fix Moderation List Data Integrity (Data Leakage)
            // - [/] Isolate Redux state keys in `userSlice.ts` (`mutedUsers`, `blockedUsers`, etc.)
            // - [ ] Update `MutedAccountsPage`, `BlockedAccountsPage`, and Follower lists to use isolated keys
            // - [ ] Verify moderation lists stay clean after navigation
            // - [x] Verification and Polish

            const users = data.mutes.map((u: any) => ({
                id: u.did, // Use DID as ID for remote users
                did: u.did,
                handle: u.handle,
                username: u.handle.split('.')[0],
                displayName: u.displayName || '',
                avatarUrl: u.avatar || u.avatarUrl,
                isMuted: true,
            } as User));

            return { users, cursor: data.cursor || null };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchBlockedAccounts = createAsyncThunk<{ users: User[], cursor: string | null }, { limit?: number, cursor?: string } | void, { rejectValue: string }>(
    'user/fetchBlocks',
    async (params, { rejectWithValue }) => {
        try {
            const limit = params && 'limit' in params ? params.limit : 50;
            const cursor = params && 'cursor' in params ? params.cursor : '';
            const token = localStorage.getItem('token');
            const url = new URL(`${API_BASE_URL}/xrpc/app.bsky.graph.getBlocks`);
            url.searchParams.append('limit', String(limit));
            if (cursor) url.searchParams.append('cursor', cursor);

            const response = await fetch(url.toString(), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch blocked accounts');

            const users = data.blocks.map((u: any) => ({
                id: u.did,
                did: u.did,
                handle: u.handle,
                username: u.handle.split('.')[0],
                displayName: u.displayName || '',
                avatarUrl: u.avatar || u.avatarUrl,
                isBlocking: true,
            } as User));

            return { users, cursor: data.cursor || null };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// Muted Words Thunks — backed by REST API
export const fetchMutedWords = createAsyncThunk<MutedWord[], void, { rejectValue: string }>(
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

export const addMutedWordAsync = createAsyncThunk<MutedWord, { word: string, muteBehavior: string, targets: string }, { rejectValue: string }>(
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

export const syncMutedWords = createAsyncThunk<void, void, { rejectValue: string }>(
    'user/syncMutedWords',
    async (_, { rejectWithValue, dispatch }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/muted-words/sync`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const data = await response.json();
                return rejectWithValue(data.message || 'Failed to sync muted words');
            }
            // Refresh the list after sync
            await dispatch(fetchMutedWords());
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
        },
        clearUsers: (state: UserState) => {
            state.users = [];
            state.cursor = null;
            state.hasMore = true;
        },
        clearMutedUsers: (state: UserState) => {
            state.mutedUsers = [];
            state.mutedCursor = null;
            state.mutedHasMore = true;
        },
        clearBlockedUsers: (state: UserState) => {
            state.blockedUsers = [];
            state.blockedCursor = null;
            state.blockedHasMore = true;
        },
        clearFollowers: (state: UserState) => {
            state.followers = [];
            state.followersCursor = null;
            state.followersHasMore = true;
        },
        clearFollowing: (state: UserState) => {
            state.followingUsers = [];
            state.followingCursor = null;
            state.followingHasMore = true;
        },
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
                const incomingUsers = (action.payload || []) as User[];
                const { skip } = action.meta.arg;

                if (skip === 0) {
                    state.searchResults = incomingUsers;
                } else {
                    // Stable identity upsert: prefers DID, falls back to ID
                    const updatedUsers = [...state.searchResults];
                    const newUsers: User[] = [];

                    incomingUsers.forEach((newUser: User) => {
                        const index = updatedUsers.findIndex(u =>
                            (newUser.did && u.did && newUser.did === u.did) ||
                            (u.id === newUser.id)
                        );
                        if (index !== -1) {
                            updatedUsers[index] = { ...updatedUsers[index], ...newUser };
                        } else {
                            newUsers.push(newUser);
                        }
                    });

                    state.searchResults = [...updatedUsers, ...newUsers];
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
                // Only clear if we're switching to a DIFFERENT profile (check handle, id, and did)
                const newIdentifier = normalizeIdentifier(action.meta.arg);
                if (state.profile && !profileMatchesIdentifier(state.profile, newIdentifier)) {
                    state.profile = null;
                }
            })
            .addCase(fetchUserProfile.fulfilled, (state: UserState, action) => {
                state.isLoading = false;
                const user = action.payload.user;
                state.profile = user;

                // Propagate updated status to all other lists
                const updateAllLists = (u: User) => {
                    if (u.did === user.did || u.id === user.id) {
                        u.isFollowing = user.isFollowing;
                        u.isMuted = user.isMuted;
                        u.isBlocking = user.isBlocking;
                        u.isBlockedBy = user.isBlockedBy;
                        u.followingReference = user.followingReference;
                    }
                };

                state.followers.forEach(updateAllLists);
                state.followingUsers.forEach(updateAllLists);
                state.searchResults.forEach(updateAllLists);
                state.suggestedUsers.forEach(updateAllLists);
                state.users.forEach(updateAllLists);
            })
            .addCase(fetchUserProfile.rejected, (state: UserState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Follow User
            .addCase(followUserAsync.pending, (state: UserState, action) => {
                const userId = action.meta.arg;
                state.actionLoading[userId] = true;

                // Optimistic update function
                const updateState = (u: User) => {
                    if (profileMatchesIdentifier(u, userId)) {
                        u.isFollowing = true;
                    }
                };

                // Update various lists optimistically
                if (state.profile && profileMatchesIdentifier(state.profile, userId)) {
                    state.profile.isFollowing = true;
                    if (state.profile.followersCount != null) state.profile.followersCount += 1;
                }

                state.users.forEach(updateState);
                state.followers.forEach(updateState);
                state.followingUsers.forEach(updateState);
                state.searchResults.forEach(updateState);
                state.suggestedUsers.forEach(updateState);
                state.blockedUsers.forEach(updateState);
                state.mutedUsers.forEach(updateState);
            })
            .addCase(followUserAsync.fulfilled, (state: UserState, action) => {
                const userId = action.meta.arg;
                state.actionLoading[userId] = false;

                const updateState = (u: User) => {
                    if (profileMatchesIdentifier(u, userId)) {
                        u.isFollowing = true;
                    }
                };

                if (state.profile && profileMatchesIdentifier(state.profile, userId)) {
                    state.profile.isFollowing = true;
                    state.profile.followingReference = action.payload.uri || state.profile.followingReference;
                    if (action.payload.followersCount > 0) {
                        state.profile.followersCount = action.payload.followersCount;
                    }
                }

                state.users.forEach(updateState);
                state.followers.forEach(updateState);
                state.followingUsers.forEach(updateState);
                state.searchResults.forEach(updateState);
                state.suggestedUsers.forEach(updateState);
                state.blockedUsers.forEach(updateState);
                state.mutedUsers.forEach(updateState);
            })
            .addCase(followUserAsync.rejected, (state: UserState, action) => {
                const userId = action.meta.arg;
                state.actionLoading[userId] = false;
                // Revert optimistic update on failure
                if (state.profile && profileMatchesIdentifier(state.profile, userId)) {
                    state.profile.isFollowing = false;
                    if (state.profile.followersCount != null && state.profile.followersCount > 0) {
                        state.profile.followersCount -= 1;
                    }
                }
            })
            // Unfollow User
            .addCase(unfollowUserAsync.pending, (state: UserState, action) => {
                const userId = action.meta.arg.userId;
                state.actionLoading[userId] = true;

                // Optimistic update function
                const updateState = (u: User) => {
                    if (profileMatchesIdentifier(u, userId)) {
                        u.isFollowing = false;
                    }
                };

                // Update various lists optimistically
                if (state.profile && profileMatchesIdentifier(state.profile, userId)) {
                    state.profile.isFollowing = false;
                    state.profile.followingReference = undefined;
                    if (state.profile.followersCount != null && state.profile.followersCount > 0) {
                        state.profile.followersCount -= 1;
                    }
                }

                state.users.forEach(updateState);
                state.followers.forEach(updateState);
                state.followingUsers.forEach(updateState);
                state.searchResults.forEach(updateState);
                state.suggestedUsers.forEach(updateState);
                state.blockedUsers.forEach(updateState);
                state.mutedUsers.forEach(updateState);
            })
            .addCase(unfollowUserAsync.fulfilled, (state: UserState, action) => {
                const userId = action.meta.arg.userId;
                state.actionLoading[userId] = false;

                const updateState = (u: User) => {
                    if (profileMatchesIdentifier(u, userId)) {
                        u.isFollowing = false;
                    }
                };

                if (state.profile && profileMatchesIdentifier(state.profile, userId)) {
                    state.profile.isFollowing = false;
                    state.profile.followingReference = undefined;
                    if (action.payload.followersCount > 0) {
                        state.profile.followersCount = action.payload.followersCount;
                    }
                }

                state.users.forEach(updateState);
                state.followers.forEach(updateState);
                state.followingUsers.forEach(updateState);
                state.searchResults.forEach(updateState);
                state.suggestedUsers.forEach(updateState);
                state.blockedUsers.forEach(updateState);
                state.mutedUsers.forEach(updateState);
            })
            .addCase(unfollowUserAsync.rejected, (state: UserState, action) => {
                const userId = action.meta.arg.userId;
                state.actionLoading[userId] = false;
                // Revert optimistic update on failure
                if (state.profile && profileMatchesIdentifier(state.profile, userId)) {
                    state.profile.isFollowing = true;
                    if (state.profile.followersCount != null) state.profile.followersCount += 1;
                }
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
            .addCase(fetchMutedAccounts.pending, (state: UserState, action) => {
                state.isLoading = true;
                state.error = null;
                if (action.meta.arg && !action.meta.arg.cursor) {
                    state.mutedUsers = [];
                    state.mutedCursor = null;
                }
            })
            .addCase(fetchMutedAccounts.fulfilled, (state: UserState, action) => {
                state.isLoading = false;
                const { users, cursor } = action.payload;
                const incomingUsers = (users || []) as User[];

                if (action.meta.arg && !action.meta.arg.cursor) {
                    state.mutedUsers = incomingUsers;
                } else {
                    // Stable identity upsert: prefers DID, falls back to ID
                    const updatedUsers = [...state.mutedUsers];
                    const newUsers: User[] = [];

                    incomingUsers.forEach((newUser: User) => {
                        const index = updatedUsers.findIndex(u =>
                            (newUser.did && u.did && newUser.did === u.did) ||
                            (u.id === newUser.id)
                        );
                        if (index !== -1) {
                            updatedUsers[index] = { ...updatedUsers[index], ...newUser };
                        } else {
                            newUsers.push(newUser);
                        }
                    });

                    state.mutedUsers = [...updatedUsers, ...newUsers];
                }
                state.mutedCursor = cursor;
                state.mutedHasMore = incomingUsers.length > 0 && !!cursor;
            })
            .addCase(fetchMutedAccounts.rejected, (state: UserState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Fetch Blocked Accounts
            .addCase(fetchBlockedAccounts.pending, (state: UserState, action) => {
                state.isLoading = true;
                state.error = null;
                if (action.meta.arg && !action.meta.arg.cursor) {
                    state.blockedUsers = [];
                    state.blockedCursor = null;
                }
            })
            .addCase(fetchBlockedAccounts.fulfilled, (state: UserState, action) => {
                state.isLoading = false;
                const { users, cursor } = action.payload;
                const incomingUsers = (users || []) as User[];

                if (action.meta.arg && !action.meta.arg.cursor) {
                    state.blockedUsers = incomingUsers;
                } else {
                    // Stable identity upsert: prefers DID, falls back to ID
                    const updatedUsers = [...state.blockedUsers];
                    const newUsers: User[] = [];

                    incomingUsers.forEach((newUser: User) => {
                        const index = updatedUsers.findIndex(u =>
                            (newUser.did && u.did && newUser.did === u.did) ||
                            (u.id === newUser.id)
                        );
                        if (index !== -1) {
                            updatedUsers[index] = { ...updatedUsers[index], ...newUser };
                        } else {
                            newUsers.push(newUser);
                        }
                    });

                    state.blockedUsers = [...updatedUsers, ...newUsers];
                }
                state.blockedCursor = cursor;
                state.blockedHasMore = incomingUsers.length > 0 && !!cursor;
            })
            .addCase(fetchBlockedAccounts.rejected, (state: UserState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Fetch Followers
            .addCase(fetchFollowers.pending, (state: UserState, action) => {
                state.isLoading = true;
                state.error = null;
                if (!action.meta.arg.cursor) {
                    state.followers = [];
                    state.followersCursor = null;
                }
            })
            .addCase(fetchFollowers.fulfilled, (state: UserState, action) => {
                state.isLoading = false;
                const { users, cursor } = action.payload;
                const incomingUsers = (users || []) as User[];

                if (!action.meta.arg.cursor) {
                    state.followers = incomingUsers;
                } else {
                    // Stable identity upsert: prefers DID, falls back to ID
                    const updatedUsers = [...state.followers];
                    const newUsers: User[] = [];

                    incomingUsers.forEach((newUser: User) => {
                        const index = updatedUsers.findIndex(u =>
                            (newUser.did && u.did && newUser.did === u.did) ||
                            (u.id === newUser.id)
                        );
                        if (index !== -1) {
                            updatedUsers[index] = { ...updatedUsers[index], ...newUser };
                        } else {
                            newUsers.push(newUser);
                        }
                    });

                    state.followers = [...updatedUsers, ...newUsers];
                }
                state.followersCursor = cursor;
                state.followersHasMore = incomingUsers.length > 0 && !!cursor;
            })
            .addCase(fetchFollowers.rejected, (state: UserState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Fetch Following
            .addCase(fetchFollowing.pending, (state: UserState, action) => {
                state.isLoading = true;
                state.error = null;
                if (!action.meta.arg.cursor) {
                    state.followingUsers = [];
                    state.followingCursor = null;
                }
            })
            .addCase(fetchFollowing.fulfilled, (state: UserState, action) => {
                state.isLoading = false;
                const { users, cursor } = action.payload;
                const incomingUsers = (users || []) as User[];

                if (!action.meta.arg.cursor) {
                    state.followingUsers = incomingUsers;
                } else {
                    // Stable identity upsert: prefers DID, falls back to ID
                    const updatedUsers = [...state.followingUsers];
                    const newUsers: User[] = [];

                    incomingUsers.forEach((newUser: User) => {
                        const index = updatedUsers.findIndex(u =>
                            (newUser.did && u.did && newUser.did === u.did) ||
                            (u.id === newUser.id)
                        );
                        if (index !== -1) {
                            updatedUsers[index] = { ...updatedUsers[index], ...newUser };
                        } else {
                            newUsers.push(newUser);
                        }
                    });

                    state.followingUsers = [...updatedUsers, ...newUsers];
                }
                state.followingCursor = cursor;
                state.followingHasMore = incomingUsers.length > 0 && !!cursor;
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
            .addCase(addMutedWordAsync.fulfilled, (state: UserState, action: PayloadAction<MutedWord>) => {
                state.mutedWords.push(action.payload);
            })
            .addCase(deleteMutedWordAsync.fulfilled, (state: UserState, action: PayloadAction<number>) => {
                state.mutedWords = state.mutedWords.filter(w => w.id !== action.payload);
            })
            .addCase(syncMutedWords.pending, (state: UserState) => {
                state.isLoading = true;
            })
            .addCase(syncMutedWords.fulfilled, (state: UserState) => {
                state.isLoading = false;
            })
            .addCase(syncMutedWords.rejected, (state: UserState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    }
});

export const {
    clearProfile,
    updateProfileLocal,
    setActiveProfileTab,
    clearUsers,
    clearMutedUsers,
    clearBlockedUsers,
    clearFollowers,
    clearFollowing
} = userSlice.actions;
export default userSlice.reducer;
