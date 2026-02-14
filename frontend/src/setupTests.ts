import '@testing-library/jest-dom';

// Mock react-i18next
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (str: string) => str,
        i18n: {
            changeLanguage: () => new Promise(() => { }),
        },
    }),
    initReactI18next: {
        type: '3rdParty',
        init: () => { },
    },
}));
