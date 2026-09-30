import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Electron 使用 file:// 打开页面，资源需要采用相对路径。
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: [
        'icons/apple-touch-icon.png',
        'icons/favicon-32x32.png',
      ],
      manifest: {
        name: '黄金数独 · Bucciarati Edition',
        short_name: '黄金数独',
        description: '布加拉提主题、可以离线玩的数独游戏',
        lang: 'zh-CN',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#120d1f',
        theme_color: '#1a102b',
        categories: ['games', 'puzzle'],
        icons: [
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,png,svg,webp,ico}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
});
