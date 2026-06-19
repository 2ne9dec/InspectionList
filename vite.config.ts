import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode !== 'production';

  // В production VITE_API_URL желателен — без него __API__ будет localhost:8443.
  // В CI (process.env.CI=true) — жёсткая ошибка, локально — только предупреждение.
  if (!isDev && !env.VITE_API_URL) {
    const msg =
      '[vite] VITE_API_URL не задан — сборка будет использовать http://localhost:8443.\n' +
      'Для продакшна задайте: VITE_API_URL=https://api.your-domain.com yarn build';
    if (process.env.CI) {
      throw new Error(msg);
    } else {
      console.warn('\x1b[33m⚠\x1b[0m  ' + msg);
    }
  }

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
