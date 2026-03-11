import { createSlice, createAsyncThunk, PayloadAction, ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { UserState, User } from '../../types';
import agent from '../../services/atpAgent';
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
    async ({ query, take }, { rejectWithValue }) => {
        try {
            const { data } = await agent.searchActors({
                term: query,
                limit: take
            });
            return data.actors.map(u => ({
                id: u.did,
                did: u.did,
                handle: u.handle,
                username: u.handle,
                displayName: u.displayName,
                avatarUrl: u.avatar,
                description: u.description,
                viewer: u.viewer
            } as any));
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
            const { data } = await agent.getProfile({ actor });

            const user: User = {
                id: data.did,
                did: data.did,
                handle: data.handle,
                username: data.handle,
                displayName: data.displayName || '',
                avatarUrl: data.avatar,
                coverImage: data.banner,
                bio: data.description,
                followersCount: data.followersCount || 0,
                followingCount: data.followsCount || 0,
                postsCount: data.postsCount || 0,
                isFollowing: !!data.viewer?.following,
                isBlocking: !!data.viewer?.blocking,
                isMuted: !!data.viewer?.muted,
                followingReference: data.viewer?.following,
                blockingReference: data.viewer?.blocking,
            } as any;

            return {
                user,
                isFollowing: !!data.viewer?.following,
                isBlockedBy: false,
                isBlocking: !!data.viewer?.blocking,
                isMuted: !!data.viewer?.muted
            };
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
            const { uri } = await agent.follow(userId);
            return { isFollowing: true, followersCount: 0, uri };
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
    async ({ followUri }, { rejectWithValue }) => {
        try {
            await agent.deleteFollow(followUri);
            return { isFollowing: false, followersCount: 0 };
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
            if (!agent.session) return rejectWithValue('Not logged in');
            const { uri } = await agent.app.bsky.graph.block.create(
                { repo: agent.session.did },
                { subject: userId, createdAt: new Date().toISOString() }
            );
            return { isBlocking: true, isFollowing: false, uri };
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
    async ({ blockUri }, { rejectWithValue }) => {
        try {
            if (!agent.session) return rejectWithValue('Not logged in');
            const rkey = blockUri.split('/').pop() || '';
            await agent.app.bsky.graph.block.delete({
                repo: agent.session.did,
                rkey
            });
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
            const { data } = await agent.app.bsky.graph.getMutes();
            return data.mutes.map(m => ({
                id: m.did,
                did: m.did,
                handle: m.handle,
                username: m.handle,
                displayName: m.displayName || '',
                avatarUrl: m.avatar,
                isMuted: true,
            } as any));
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchBlockedAccounts = createAsyncThunk<User[], void, { rejectValue: string }>(
    'user/fetchBlocks',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await agent.app.bsky.graph.getBlocks();
            return data.blocks.map(b => ({
                id: b.did,
                did: b.did,
                handle: b.handle,
                username: b.handle,
                displayName: b.displayName || '',
                avatarUrl: b.avatar,
                isBlocking: true,
            } as any));
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
            await agent.mute(userId);
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
            await agent.unmute(userId);
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
        updateProfileLocal: (state: UserState, action: PayloadAction<Partial<User>>) => {
            if (state.profile) {
                state.profile = { ...state.profile, ...action.payload };
            }
        }
    },
    extraReducers: (builder: ActionReducerMapBuilder<UserState>) => {
        builder
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
            })
            // Fetch Profile
            .addCase(fetchUserProfile.pending, (state: UserState, action) => {
                state.isLoading = true;
                state.error = null;
                if (state.profile?.handle !== action.meta.arg) {
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
            });
    }
});

export const { clearProfile, updateProfileLocal } = userSlice.actions;
export default userSlice.reducer;
