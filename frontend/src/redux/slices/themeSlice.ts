import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ThemeState } from '../../types';

const initialState: ThemeState = {
    mode: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
    colorMode: (localStorage.getItem('colorMode') as any) || 'system',
    darkVariant: (localStorage.getItem('darkVariant') as any) || 'dark',
    fontFamily: (localStorage.getItem('fontFamily') as any) || 'ui',
    fontSize: (localStorage.getItem('fontSize') as any) || 'md',
};

const applyThemeSettings = (mode: 'light' | 'dark', variant: 'dim' | 'dark') => {
    const root = document.documentElement;
    if (mode === 'dark') {
        root.classList.add('dark');
        if (variant === 'dark') {
            root.classList.add('lights-out');
            root.classList.remove('dim');
        } else {
            root.classList.add('dim');
            root.classList.remove('lights-out');
        }
    } else {
        root.classList.remove('dark');
        root.classList.remove('lights-out');
        root.classList.remove('dim');
    }
};

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        setColorMode: (state, action: PayloadAction<ThemeState['colorMode']>) => {
            state.colorMode = action.payload;
            localStorage.setItem('colorMode', action.payload);

            let actualMode = action.payload;
            if (action.payload === 'system') {
                actualMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }

            state.mode = actualMode as 'light' | 'dark';
            localStorage.setItem('theme', state.mode);
            applyThemeSettings(state.mode, state.darkVariant);
        },
        setDarkVariant: (state, action: PayloadAction<ThemeState['darkVariant']>) => {
            state.darkVariant = action.payload;
            localStorage.setItem('darkVariant', action.payload);
            applyThemeSettings(state.mode, state.darkVariant);
        },
        setFontFamily: (state, action: PayloadAction<ThemeState['fontFamily']>) => {
            state.fontFamily = action.payload;
            localStorage.setItem('fontFamily', action.payload);
        },
        setFontSize: (state, action: PayloadAction<ThemeState['fontSize']>) => {
            state.fontSize = action.payload;
            localStorage.setItem('fontSize', action.payload);
            document.documentElement.setAttribute('data-font-size', action.payload);
        },
        toggleTheme: (state) => {
            state.mode = state.mode === 'light' ? 'dark' : 'light';
            state.colorMode = state.mode;
            localStorage.setItem('theme', state.mode);
            localStorage.setItem('colorMode', state.mode);
            applyThemeSettings(state.mode, state.darkVariant);
        },
    },
});

export const { setColorMode, setDarkVariant, setFontFamily, setFontSize, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
