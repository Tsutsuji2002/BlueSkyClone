import { createSlice, PayloadAction } from '@reduxjs/toolkit';
// Modals Slice
import { ModalsState, Post } from '../../types';

const initialState: ModalsState = {
    createPost: false,
    editProfile: false,
    imageViewer: {
        isOpen: false,
        images: [],
        currentIndex: 0,
    },
    reply: {
        isOpen: false,
        post: null,
    },
    confirmation: {
        isOpen: false,
        title: '',
        message: '',
        onConfirm: undefined,
    },
    mobileMenu: false,
    sharePost: {
        isOpen: false,
        post: null,
    },
    editPost: {
        isOpen: false,
        post: null,
    },
    quote: {
        isOpen: false,
        post: null,
    },
};

const modalsSlice = createSlice({
    name: 'modals',
    initialState,
    reducers: {
        openCreatePost: (state) => {
            state.createPost = true;
        },
        closeCreatePost: (state) => {
            state.createPost = false;
        },
        openEditProfile: (state) => {
            state.editProfile = true;
        },
        closeEditProfile: (state) => {
            state.editProfile = false;
        },
        openImageViewer: (state, action: PayloadAction<{ images: string[]; index?: number }>) => {
            state.imageViewer = {
                isOpen: true,
                images: action.payload.images,
                currentIndex: action.payload.index || 0,
            };
        },
        closeImageViewer: (state) => {
            state.imageViewer = {
                isOpen: false,
                images: [],
                currentIndex: 0,
            };
        },
        setImageViewerIndex: (state, action: PayloadAction<number>) => {
            state.imageViewer.currentIndex = action.payload;
        },
        openReply: (state, action: PayloadAction<Post>) => {
            state.reply = {
                isOpen: true,
                post: action.payload,
            };
        },
        closeReply: (state) => {
            state.reply = {
                isOpen: false,
                post: null,
            };
        },
        openConfirmation: (state, action: PayloadAction<{ title: string; message: string }>) => {
            state.confirmation = {
                isOpen: true,
                title: action.payload.title,
                message: action.payload.message,
            };
        },
        closeConfirmation: (state) => {
            state.confirmation = {
                isOpen: false,
                title: '',
                message: '',
                onConfirm: undefined,
            };
        },
        openMobileMenu: (state) => {
            state.mobileMenu = true;
        },
        closeMobileMenu: (state) => {
            state.mobileMenu = false;
        },
        openSharePost: (state, action: PayloadAction<Post>) => {
            state.sharePost = {
                isOpen: true,
                post: action.payload,
            };
        },
        closeSharePost: (state) => {
            state.sharePost = {
                isOpen: false,
                post: null,
            };
        },
        openEditPost: (state, action: PayloadAction<Post>) => {
            state.editPost = {
                isOpen: true,
                post: action.payload,
            };
            state.createPost = true;
        },
        closeEditPost: (state) => {
            state.editPost = {
                isOpen: false,
                post: null,
            };
            state.createPost = false;
        },
        openQuote: (state, action: PayloadAction<Post>) => {
            state.quote = {
                isOpen: true,
                post: action.payload,
            };
            state.createPost = true;
        },
        closeQuote: (state) => {
            state.quote = {
                isOpen: false,
                post: null,
            };
            state.createPost = false;
        },
    },
});

export const {
    openCreatePost,
    closeCreatePost,
    openEditProfile,
    closeEditProfile,
    openImageViewer,
    closeImageViewer,
    setImageViewerIndex,
    openReply,
    closeReply,
    openConfirmation,
    closeConfirmation,
    openMobileMenu,
    closeMobileMenu,
    openSharePost,
    closeSharePost,
    openEditPost,
    closeEditPost,
    openQuote,
    closeQuote,
} = modalsSlice.actions;

export default modalsSlice.reducer;
