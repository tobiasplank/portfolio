// astro.config.mjs
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
    // Enable SSR mode for live requests against MongoDB
    output: 'server',
    adapter: node({
        mode: 'standalone',
    }),
});