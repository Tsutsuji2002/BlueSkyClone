import { createSlice, createAsyncThunk, PayloadAction, ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { UserState, User, MutedWord } from '../../types';
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
    actionLoading: {}, // Map of userId -> boolean
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
            const response = await fetch(`${API_BASE_URL}/search/users?q=${encodeURIComponent(query)}&skip=${skip}&take=${take}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to search users');
            return data;
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
    async (handle: string, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/profile/${handle}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch profile');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchUserProfileById = createAsyncThunk<
    { user: User, isFollowing: boolean, isBlockedBy: boolean, isBlocking: boolean, isMuted: boolean },
    string,
    { rejectValue: string }
>(
    'user/fetchProfileById',
    async (userId: string, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/profile/id/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch profile');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchFollowers = createAsyncThunk<
    User[],
    string,
    { rejectValue: string }
>(
    'user/fetchFollowers',
    async (userId: string, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/${userId}/followers`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch followers');
            return data;
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
    async (userId: string, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/${userId}/following`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch following');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchMutedAccounts = createAsyncThunk<
    User[],
    void,
    { rejectValue: string }
>(
    'user/fetchMuted',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/muted`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch muted accounts');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchBlockedAccounts = createAsyncThunk<
    User[],
    void,
    { rejectValue: string }
>(
    'user/fetchBlocked',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/blocked`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch blocked accounts');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const followUserAsync = createAsyncThunk<
    { isFollowing: boolean, followersCount: number },
    string,
    { rejectValue: string }
>(
    'user/follow',
    async (userId: string, { rejectWithValue, getState }) => {
        console.log('followUser thunk started for:', userId);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/follow/${userId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to follow user');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const unfollowUserAsync = createAsyncThunk<
    { isFollowing: boolean, followersCount: number },
    string,
    { rejectValue: string }
>(
    'user/unfollow',
    async (userId: string, { rejectWithValue, getState }) => {
        console.log('unfollowUser thunk started for:', userId);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/unfollow/${userId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to unfollow user');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const blockUserAsync = createAsyncThunk<
    { isBlocking: boolean, isFollowing: boolean },
    string,
    { rejectValue: string }
>(
    'user/block',
    async (userId: string, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/block/${userId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to block user');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const unblockUserAsync = createAsyncThunk<
    { isBlocking: boolean },
    string,
    { rejectValue: string }
>(
    'user/unblock',
    async (userId: string, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/unblock/${userId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to unblock user');
            return data;
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
    async (userId: string, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/mute/${userId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to mute user');
            return data;
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
    async (userId: string, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/unmute/${userId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to unmute user');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchMutedWords = createAsyncThunk<
    MutedWord[],
    void,
    { rejectValue: string }
>(
    'user/fetchMutedWords',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/muted-words`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch muted words');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const addMutedWordAsync = createAsyncThunk<
    MutedWord,
    { word: string, muteBehavior: string },
    { rejectValue: string }
>(
    'user/addMutedWord',
    async (payload, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/muted-words`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to add muted word');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const deleteMutedWordAsync = createAsyncThunk<
    number,
    number,
    { rejectValue: string }
>(
    'user/deleteMutedWord',
    async (id, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/users/muted-words/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
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

export const fetchSelectedInterests = createAsyncThunk<
    string[],
    void,
    { rejectValue: string }
>(
    'user/fetchInterests',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                const stored = localStorage.getItem('selected_interests');
                return stored ? JSON.parse(stored) : [];
            }
            const response = await fetch(`${API_BASE_URL}/user/interests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch interests');

            // Sync local storage
            localStorage.setItem('selected_interests', JSON.stringify(data));
            return data;
        } catch (error: any) {
            const stored = localStorage.getItem('selected_interests');
            if (stored) return JSON.parse(stored);
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
            // Optimistic update of localStorage
            localStorage.setItem('selected_interests', JSON.stringify(interests));

            if (!token) return interests;

            const response = await fetch(`${API_BASE_URL}/user/interests`, {
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
        updateProfileLocal: (state: UserState, action: PayloadAction<Partial<User>>) => {
            if (state.profile) {
                state.profile = { ...state.profile, ...action.payload };
            }
        },
        toggleFollowSuggestedUser: (state: UserState, action: PayloadAction<string>) => {
            const user = state.suggestedUsers.find((u: User) => u.id === action.payload);
            if (user) {
                user.isFollowing = !user.isFollowing;
                user.followersCount += user.isFollowing ? 1 : -1;
            }
        }
    },
    extraReducers: (builder: ActionReducerMapBuilder<UserState>) => {
        builder
            // Fetch Profile
            .addCase(fetchUserProfile.pending, (state: UserState, action) => {
                state.isLoading = true;
                state.error = null;
                // Clear profile only if requested handle is different from current
                if (state.profile?.handle !== action.meta.arg) {
                    state.profile = null;
                }
            })
            .addCase(fetchUserProfile.fulfilled, (state: UserState, action) => {
                state.isLoading = false;
                state.profile = {
                    ...action.payload.user,
                    isFollowing: action.payload.isFollowing,
                    isBlockedBy: action.payload.isBlockedBy,
                    isBlocking: action.payload.isBlocking,
                    isMuted: action.payload.isMuted
                };
            })
            .addCase(fetchUserProfile.rejected, (state: UserState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Fetch Profile by ID
            .addCase(fetchUserProfileById.pending, (state: UserState, action) => {
                state.isLoading = true;
                state.error = null;
                // Clear profile only if requested id is different from current
                if (state.profile?.id !== action.meta.arg) {
                    state.profile = null;
                }
            })
            .addCase(fetchUserProfileById.fulfilled, (state: UserState, action) => {
                state.isLoading = false;
                state.profile = {
                    ...action.payload.user,
                    isFollowing: action.payload.isFollowing,
                    isBlockedBy: action.payload.isBlockedBy,
                    isBlocking: action.payload.isBlocking,
                    isMuted: action.payload.isMuted
                };
            })
            .addCase(fetchUserProfileById.rejected, (state: UserState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Follow User
            .addCase(followUserAsync.pending, (state: UserState, action) => {
                state.actionLoading[action.meta.arg] = true;
            })
            .addCase(followUserAsync.fulfilled, (state: UserState, action) => {
                const userId = action.meta.arg as string;
                state.actionLoading[userId] = false;
                const { isFollowing, followersCount } = action.payload;

                if (state.profile && state.profile.id === userId) {
                    state.profile.isFollowing = isFollowing;
                    state.profile.followersCount = followersCount;
                }

                // Update in users and suggestedUsers if present
                const suggestedUser = state.suggestedUsers.find((u: User) => u.id === userId);
                if (suggestedUser) {
                    suggestedUser.isFollowing = isFollowing;
                    suggestedUser.followersCount = followersCount;
                }

                const listUser = state.users.find((u: User) => u.id === userId);
                if (listUser) {
                    listUser.isFollowing = isFollowing;
                    listUser.followersCount = followersCount;
                }
            })
            .addCase(followUserAsync.rejected, (state: UserState, action) => {
                state.actionLoading[action.meta.arg as string] = false;
            })
            // Unfollow User
            .addCase(unfollowUserAsync.pending, (state: UserState, action) => {
                state.actionLoading[action.meta.arg] = true;
            })
            .addCase(unfollowUserAsync.fulfilled, (state: UserState, action) => {
                const userId = action.meta.arg as string;
                state.actionLoading[userId] = false;
                const { isFollowing, followersCount } = action.payload;

                if (state.profile && state.profile.id === userId) {
                    state.profile.isFollowing = isFollowing;
                    state.profile.followersCount = followersCount;
                }

                // Update in users and suggestedUsers if present
                const suggestedUser = state.suggestedUsers.find((u: User) => u.id === userId);
                if (suggestedUser) {
                    suggestedUser.isFollowing = isFollowing;
                    suggestedUser.followersCount = followersCount;
                }

                const listUser = state.users.find((u: User) => u.id === userId);
                if (listUser) {
                    listUser.isFollowing = isFollowing;
                    listUser.followersCount = followersCount;
                }
            })
            .addCase(unfollowUserAsync.rejected, (state: UserState, action) => {
                state.actionLoading[action.meta.arg as string] = false;
            })
            // Block User
            .addCase(blockUserAsync.fulfilled, (state: UserState, action) => {
                const { isBlocking, isFollowing } = action.payload;
                const userId = action.meta.arg as string;
                if (state.profile && state.profile.id === userId) {
                    state.profile.isBlocking = isBlocking;
                    state.profile.isFollowing = isFollowing;
                    // Optimistically update followers count if needed, but not returned by API currently
                    if (!isFollowing) state.profile.followersCount = Math.max(0, state.profile.followersCount - 1);
                }
            })
            // Unblock User
            .addCase(unblockUserAsync.fulfilled, (state: UserState, action) => {
                const { isBlocking } = action.payload;
                const userId = action.meta.arg as string;
                if (state.profile && state.profile.id === userId) {
                    state.profile.isBlocking = isBlocking;
                }
            })
            // Mute User
            .addCase(muteUserAsync.fulfilled, (state: UserState, action) => {
                const { isMuted } = action.payload;
                const userId = action.meta.arg as string;
                if (state.profile && state.profile.id === userId) {
                    state.profile.isMuted = isMuted;
                }
            })
            // Unmute User
            .addCase(unmuteUserAsync.fulfilled, (state: UserState, action) => {
                const { isMuted } = action.payload;
                const userId = action.meta.arg as string;
                if (state.profile && state.profile.id === userId) {
                    state.profile.isMuted = isMuted;
                }
            })
            // Fetch Followers/Following
            .addCase(fetchFollowers.fulfilled, (state: UserState, action: PayloadAction<User[]>) => {
                state.isLoading = false;
                state.users = action.payload;
            })
            .addCase(fetchFollowing.fulfilled, (state: UserState, action: PayloadAction<User[]>) => {
                state.isLoading = false;
                state.users = action.payload;
            })
            // Fetch Muted/Blocked
            .addCase(fetchMutedAccounts.pending, (state: UserState) => {
                state.isLoading = true;
            })
            .addCase(fetchMutedAccounts.fulfilled, (state: UserState, action: PayloadAction<User[]>) => {
                state.isLoading = false;
                state.users = action.payload;
            })
            .addCase(fetchMutedAccounts.rejected, (state: UserState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchBlockedAccounts.pending, (state: UserState) => {
                state.isLoading = true;
            })
            .addCase(fetchBlockedAccounts.fulfilled, (state: UserState, action: PayloadAction<User[]>) => {
                state.isLoading = false;
                state.users = action.payload;
            })
            .addCase(fetchBlockedAccounts.rejected, (state: UserState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Muted Words
            .addCase(fetchMutedWords.fulfilled, (state: UserState, action: PayloadAction<MutedWord[]>) => {
                state.mutedWords = action.payload;
            })
            .addCase(addMutedWordAsync.fulfilled, (state: UserState, action: PayloadAction<MutedWord>) => {
                state.mutedWords = [action.payload, ...state.mutedWords];
            })
            .addCase(deleteMutedWordAsync.fulfilled, (state: UserState, action: PayloadAction<number>) => {
                state.mutedWords = state.mutedWords.filter(w => w.id !== action.payload);
            })
            // Selected Interests
            .addCase(fetchSelectedInterests.pending, (state: UserState) => {
                state.interestsLoading = true;
            })
            .addCase(fetchSelectedInterests.fulfilled, (state: UserState, action: PayloadAction<string[]>) => {
                state.interestsLoading = false;
                state.selectedInterests = action.payload;
            })
            .addCase(fetchSelectedInterests.rejected, (state: UserState) => {
                state.interestsLoading = false;
            })
            .addCase(saveSelectedInterests.fulfilled, (state: UserState, action: PayloadAction<string[]>) => {
                state.selectedInterests = action.payload;
            })
            // Search Users
            .addCase(searchUsers.pending, (state: UserState) => {
                state.searchLoading = true;
                state.error = null;
            })
            .addCase(searchUsers.fulfilled, (state: UserState, action: PayloadAction<User[]>) => {
                state.searchLoading = false;
                state.searchResults = action.payload;
            })
            .addCase(searchUsers.rejected, (state: UserState, action) => {
                state.searchLoading = false;
                state.error = action.payload as string;
            });
    }
});

export const { clearProfile, updateProfileLocal, toggleFollowSuggestedUser } = userSlice.actions;


export default userSlice.reducer;
