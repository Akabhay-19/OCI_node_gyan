import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        "jwt-decode": "jwt-decode",
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-core': ['react', 'react-dom', 'react-router-dom'],
            'ui-kit': ['lucide-react', 'framer-motion'],
            'data-viz': ['recharts', 'd3'],
            'utils': ['jwt-decode', 'bcryptjs', 'dotenv']
          }
        }
      },
      chunkSizeWarningLimit: 1000,
      cssCodeSplit: true,
      sourcemap: false,
      minify: 'esbuild',
      assetsInlineLimit: 4096
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    }
  };
});
