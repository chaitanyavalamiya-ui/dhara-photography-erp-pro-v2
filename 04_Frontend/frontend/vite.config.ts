import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { assertProductionApiBaseUrl } from './src/config/api-base-url';

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '../../');
  const env = loadEnv(mode, envDir, '');
  if (mode === 'production') {
    assertProductionApiBaseUrl(process.env.VITE_API_BASE_URL ?? env.VITE_API_BASE_URL);
  }

  return {
    envDir,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
