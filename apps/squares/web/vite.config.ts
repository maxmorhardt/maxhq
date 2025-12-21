import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'mui-core': ['@mui/material', '@emotion/react', '@emotion/styled'],
          'mui-icons': ['@mui/icons-material'],
          'redux': ['@reduxjs/toolkit', 'react-redux'],
          'router': ['react-router-dom'],
          'axios': ['axios'],
        },
      },
    },
  },
});
