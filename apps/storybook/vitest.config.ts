import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/storybook',
  plugins: [react()],
  test: {
    name: 'storybook',
    watch: false,
    fsModuleCache: false,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['stories.spec.tsx'],
  },
});
