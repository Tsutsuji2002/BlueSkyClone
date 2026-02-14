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
    isLoading: false,
    error: null,
    actionLoading: {}, // Map of userId -> boolean
};

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
            .addCase(fetchUserProfile.pending, (state: UserState) => {
                state.isLoading = true;
                state.error = null;
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
            .addCase(fetchUserProfileById.pending, (state: UserState) => {
                state.isLoading = true;
                state.error = null;
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
            });
    }
});

export const { clearProfile, updateProfileLocal, toggleFollowSuggestedUser } = userSlice.actions;


export default userSlice.reducer;

