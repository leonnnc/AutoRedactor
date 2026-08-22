import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192.png', 'pwa-512.png', 'favicon.svg', 'icon-512.jpg'],
      manifest: {
        name: 'AutoRedactor - Editor de Diapositivas',
        short_name: 'AutoRedactor',
        description: 'Editor de diapositivas de prédicas con IA y Biblia RVR 1960',
        theme_color: '#0d1117',
        background_color: '#0d1117',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache the bible JSON (large file) with stale-while-revalidate strategy
        runtimeCaching: [
          {
            urlPattern: /\/bibles\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'bibles-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // allow up to 10 MB
      },
    }),
  ],
  base: process.env.BUILD_FOR_PAGES === 'true' ? '/AutoRedactor/' : '/',
  build: {
    chunkSizeWarningLimit: 1600,
  }
})
