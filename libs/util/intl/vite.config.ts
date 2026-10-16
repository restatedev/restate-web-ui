import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../../node_modules/.vite/libs/util/intl',
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    passWithNoTests: true,
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../coverage/libs/util/intl',
      provider: 'v8',
    },
  },
});
