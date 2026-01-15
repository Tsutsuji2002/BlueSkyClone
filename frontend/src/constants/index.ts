// API Base URL
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Placeholder images
export const AVATAR_PLACEHOLDER = '/placeholders/avatar-default.png';
export const COVER_PLACEHOLDER = '/placeholders/cover-default.png';


// Navigation items
export const NAV_ITEMS = [
    { id: 'home', label: 'nav.home', path: '/', icon: 'home' },
    { id: 'explore', label: 'nav.explore', path: '/explore', icon: 'search' },
    { id: 'notifications', label: 'nav.notifications', path: '/notifications', icon: 'bell' },
    { id: 'messages', label: 'nav.messages', path: '/messages', icon: 'mail' },
    { id: 'feeds', label: 'nav.feeds', path: '/feeds', icon: 'feeds' },
    { id: 'lists', label: 'nav.lists', path: '/lists', icon: 'lists' },
    { id: 'saved', label: 'nav.saved', path: '/saved', icon: 'saved' },
    { id: 'profile', label: 'nav.profile', path: '/profile', icon: 'user' },
    { id: 'settings', label: 'nav.settings', path: '/settings', icon: 'settings' },
];

// Profile tabs
export const PROFILE_TABS = [
    { id: 'posts', label: 'nav.posts' },
    { id: 'replies', label: 'nav.replies' },
    { id: 'media', label: 'nav.media' },
    { id: 'video', label: 'nav.video' },
    { id: 'likes', label: 'nav.likes' },
    { id: 'feeds', label: 'nav.feeds' },
    { id: 'lists', label: 'nav.lists' },
    { id: 'bookmarks', label: 'nav.bookmarks' },
];

// Theme colors
export const THEME_COLORS = {
    light: {
        primary: '#0087ff',
        background: '#ffffff',
        surface: '#f7f9f9',
        text: '#0f1419',
        textSecondary: '#536471',
        border: '#eff3f4',
    },
    dark: {
        primary: '#0087ff',
        background: '#15202b',
        surface: '#192734',
        text: '#e7e9ea',
        textSecondary: '#8b98a5',
        border: '#38444d',
    },
};

// Post character limit
export const POST_CHARACTER_LIMIT = 1000;

// Image upload limits
export const MAX_IMAGES_PER_POST = 4;
export const MAX_IMAGE_SIZE_MB = 5;

// Hosting providers for signup
export const HOSTING_PROVIDERS = [
    { value: 'bsky.social', label: 'Bluesky Social' },
    { value: 'custom', label: 'Custom hosting provider' },
];

// Date format
export const DATE_FORMAT = 'dd/MM/yyyy';
export const DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';
