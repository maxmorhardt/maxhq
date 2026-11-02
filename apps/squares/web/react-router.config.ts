import type { Config } from '@react-router/dev/config';

export default {
  appDirectory: 'src',
  buildDirectory: 'dist',
  ssr: false,
  async prerender() {
    return ['/', '/learn-more', '/printable-football-squares', '/contact', '/404'];
  },
} satisfies Config;
