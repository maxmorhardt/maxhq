import type { Config } from '@react-router/dev/config';

export default {
  appDirectory: 'src',
  buildDirectory: 'dist',
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
