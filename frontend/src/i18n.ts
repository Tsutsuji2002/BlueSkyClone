import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import vi from './locales/vi.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ko from './locales/ko.json';

const resources = {
    en: {
        translation: en,
    },
    vi: {
        translation: vi,
    },
    ja: {
        translation: ja,
    },
    zh: {
        translation: zh,
    },
    es: {
        translation: es,
    },
    fr: {
        translation: fr,
    },
    de: { translation: de },
    ko: { translation: ko },
    // Registering other requested codes (fallback to en/vi for now as they are placeholder for UI)
    an: { translation: en },
    ast: { translation: en },
    ca: { translation: en },
    cy: { translation: en },
    da: { translation: en },
    el: { translation: en },
    "en-GB": { translation: en },
    eo: { translation: en },
    eu: { translation: en },
    fi: { translation: en },
    fy: { translation: en },
    ga: { translation: en },
    gd: { translation: en },
    gl: { translation: en },
    hi: { translation: en },
    hu: { translation: en },
    ia: { translation: en },
    id: { translation: en },
    it: { translation: en },
    km: { translation: en },
    ne: { translation: en },
    nl: { translation: en },
    pl: { translation: en },
    "pt-BR": { translation: en },
    "pt-PT": { translation: en },
    ro: { translation: en },
    ru: { translation: en },
    sv: { translation: en },
    th: { translation: en },
    tr: { translation: en },
    uk: { translation: en },
    "zh-CN": { translation: zh },
    "zh-TW": { translation: zh },
    "zh-HK": { translation: zh },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
