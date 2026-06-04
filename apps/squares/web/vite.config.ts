import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  optimizeDeps: {
    needsInterop: ['react-use-websocket'],
  },
  build: {
    rollupOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'react-vendor', test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/ },
            {
              name: 'mui-core',
              test: /[\\/]node_modules[\\/](@mui[\\/]material|@emotion[\\/](react|styled))[\\/]/,
            },
            { name: 'mui-icons', test: /[\\/]node_modules[\\/]@mui[\\/]icons-material[\\/]/ },
            {
              name: 'redux',
              test: /[\\/]node_modules[\\/](@reduxjs[\\/]toolkit|react-redux)[\\/]/,
            },
            { name: 'router', test: /[\\/]node_modules[\\/]react-router(-dom)?[\\/]/ },
            { name: 'axios', test: /[\\/]node_modules[\\/]axios[\\/]/ },
          ],
        },
      },
    },
  },
});
