import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import {
    setColorMode,
    setDarkVariant,
    setFontFamily,
    setFontSize,
    toggleTheme
} from '../redux/slices/themeSlice';
import { useEffect } from 'react';

export const useTheme = () => {
    const theme = useAppSelector((state) => state.theme);
    const dispatch = useAppDispatch();

    useEffect(() => {
        // Apply theme class on mount/change
        if (theme.mode === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Apply font size attribute
        document.documentElement.setAttribute('data-font-size', theme.fontSize);
    }, [theme.mode, theme.fontSize]);

    const toggle = () => {
        dispatch(toggleTheme());
    };

    return {
        ...theme,
        toggle,
        setColorMode: (mode: any) => dispatch(setColorMode(mode)),
        setDarkVariant: (variant: any) => dispatch(setDarkVariant(variant)),
        setFontFamily: (family: any) => dispatch(setFontFamily(family)),
        setFontSize: (size: any) => dispatch(setFontSize(size)),
        isDark: theme.mode === 'dark',
        isLight: theme.mode === 'light',
    };
};
