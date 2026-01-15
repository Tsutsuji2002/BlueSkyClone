import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LanguageState } from '../../types';

const initialState: LanguageState = {
    appLanguage: localStorage.getItem('appLanguage') || 'vi',
    primaryLanguage: localStorage.getItem('primaryLanguage') || 'ja',
    contentLanguages: JSON.parse(localStorage.getItem('contentLanguages') || '["vi", "en", "ja"]'),
};

const languageSlice = createSlice({
    name: 'language',
    initialState,
    reducers: {
        setAppLanguage: (state, action: PayloadAction<string>) => {
            state.appLanguage = action.payload;
            localStorage.setItem('appLanguage', action.payload);
        },
        setPrimaryLanguage: (state, action: PayloadAction<string>) => {
            state.primaryLanguage = action.payload;
            localStorage.setItem('primaryLanguage', action.payload);
        },
        setContentLanguages: (state, action: PayloadAction<string[]>) => {
            state.contentLanguages = action.payload;
            localStorage.setItem('contentLanguages', JSON.stringify(action.payload));
        },
        toggleContentLanguage: (state, action: PayloadAction<string>) => {
            const index = state.contentLanguages.indexOf(action.payload);
            if (index > -1) {
                state.contentLanguages.splice(index, 1);
            } else {
                state.contentLanguages.push(action.payload);
            }
            localStorage.setItem('contentLanguages', JSON.stringify(state.contentLanguages));
        },
    },
});

export const { setAppLanguage, setPrimaryLanguage, setContentLanguages, toggleContentLanguage } = languageSlice.actions;
export default languageSlice.reducer;
