import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode !== 'production';

  return {
    server: {
      open: true,
      port: 3000,
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          // Используем legacy Sass API (vite 4 / sass 1.57):
          // здесь работает `includePaths`, а не современный `loadPaths`.
          // Подключаем src/, чтобы любые .scss разрешали модули вида
          // `@use 'shared/styles/mixins'`.
          includePaths: [path.resolve(__dirname, 'src')],
        },
      },
    },
    define: {
      __IS_DEV__: JSON.stringify(isDev),
      __API__: JSON.stringify(env.VITE_API_URL ?? 'http://localhost:8443'),
      __PROJECT__: JSON.stringify(env.VITE_PROJECT ?? 'frontend'),
    },
    optimizeDeps: {
      include: ['exceljs'],
    },
    build: {
      target: 'es2020',
      sourcemap: isDev,
      // ExcelJS после gzip ~271 KB — приемлемо для on-demand экспорта
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor':   ['react', 'react-dom', 'react-router-dom'],
            'redux-vendor':   ['@reduxjs/toolkit', 'react-redux'],
            'exceljs-vendor': ['exceljs'],
            'docx-vendor':    ['docx'],
            'jszip-vendor':   ['jszip'],
          },
        },
      },
    },
  };
});
