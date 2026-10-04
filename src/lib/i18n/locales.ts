// lib/i18n/locales.ts
export const locales = [
    {
        name: 'English',
        code: 'en'
    },
    {
        name: 'Deutsch',
        code: 'de'
    }
] as const;

export const defaultLocale = "en";
export type locale = (typeof locales)[number]['code'];