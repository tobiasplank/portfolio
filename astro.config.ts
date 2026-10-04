// astro.config.ts
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import {
    locales,
    defaultLocale,
} from '@/lib/i18n/locales';

export default defineConfig({
    output: 'server',
    adapter: node({
        mode: 'standalone',
    }),
    i18n: {
        defaultLocale,
        locales: locales.map((locale) => locale.code),
        routing: {
            prefixDefaultLocale: true,
            redirectToDefaultLocale: false
        }
    }
});