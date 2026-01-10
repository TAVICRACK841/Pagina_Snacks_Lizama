import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import AstroPWA from '@vite-pwa/astro';

export default defineConfig({
  integrations: [
    tailwind(), 
    react(),
    AstroPWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Snacks Lizama',
        short_name: 'Snacks Lizama',
        description: 'La mejor comida rápida de la ciudad',
        theme_color: '#fbbf24', // Amarillo Lizama
        background_color: '#18181b', // Gris Oscuro
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{css,js,html,svg,png,ico,txt}']
      }
    })
  ],
  adapter: netlify()
});