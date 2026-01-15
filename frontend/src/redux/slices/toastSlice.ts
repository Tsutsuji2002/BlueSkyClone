import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ToastState {
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
}

const initialState: ToastState = {
    isOpen: false,
    message: '',
    type: 'success',
};

const toastSlice = createSlice({
    name: 'toast',
    initialState,
    reducers: {
        showToast: (state, action: PayloadAction<{ message: string; type?: 'success' | 'error' | 'info' }>) => {
            state.isOpen = true;
            state.message = action.payload.message;
            state.type = action.payload.type || 'success';
        },
        hideToast: (state) => {
            state.isOpen = false;
        },
    },
});

export const { showToast, hideToast } = toastSlice.actions;
export default toastSlice.reducer;
