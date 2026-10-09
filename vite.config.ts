import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// base, start_url and scope must all agree on '/life-admin/'. A mismatch fails silently:
// a blank page with 404s on every asset, or an installed app that opens in a Safari tab
// instead of standalone.
const BASE = '/life-admin/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Never 'autoUpdate': it can swap the app out while you're typing a task.
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png', 'fonts/*.woff2'],
      workbox: {
        // The fonts are precached with the app so it renders the same offline.
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
      },
      manifest: {
        name: 'Life Admin',
        short_name: 'Life Admin',
        description: 'Bills, paperwork, errands, and chores in four priority lists.',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        background_color: '#eceef1',
        theme_color: '#eceef1',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
