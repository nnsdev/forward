import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://127.0.0.1:3000',
      '/characters': 'http://127.0.0.1:3000',
      '/chats': 'http://127.0.0.1:3000',
      '/debug': 'http://127.0.0.1:3000',
      '/health': 'http://127.0.0.1:3000',
      '/media': 'http://127.0.0.1:3000',
      '/messages': 'http://127.0.0.1:3000',
      '/presets': 'http://127.0.0.1:3000',
      '/providers': 'http://127.0.0.1:3000',
      '/settings': 'http://127.0.0.1:3000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
