import type { Config } from '@react-router/dev/config';

export default {
  appDirectory: 'src',
  buildDirectory: 'dist',
  future: {
    unstable_optimizeDeps: true,
  },
  ssr: false,
  async prerender() {
    return [
      '/',
      '/apps',
      '/projects',
      '/about',
      '/contact',
      '/terms-of-service',
      '/privacy-policy',
      '/404',
    ];
  },
} satisfies Config;
