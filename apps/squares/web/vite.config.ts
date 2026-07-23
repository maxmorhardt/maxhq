import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [reactRouter()],
  server: {
    port: 3000,
  },
  optimizeDeps: {
    needsInterop: ['react-use-websocket'],
  },
  build: {
    rollupOptions: {
      output: {
        codeSplitting: {
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
