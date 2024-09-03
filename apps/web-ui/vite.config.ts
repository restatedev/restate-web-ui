import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig(({ mode }) => {
  return {
    root: __dirname,
    cacheDir: '../../node_modules/.vite/apps/web-ui',
    plugins: [
      !process.env.VITEST &&
        remix({
          ssr: false,
          future: {
            v3_fetcherPersist: true,
            v3_relativeSplatPath: true,
            v3_throwAbortReason: true,
          },
        }),
      nxViteTsPaths(),
    ],

    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [ nxViteTsPaths() ],
    // },

    server: {
      headers: {
        'Set-Cookie':
          'adminBaseUrl=http://localhost:9070; SameSite=Strict; Path=/',
      },
      hmr: {
        protocol: 'ws',
        port: 3001,
      },
    },
    preview: {
      headers: {
        'Set-Cookie':
          'adminBaseUrl=http://localhost:9070; SameSite=Strict; Path=/',
      },
    },
    define: {
      'globalThis.env': {},
    },

    test: {
      setupFiles: ['test-setup.ts'],
      globals: true,
      cache: {
        dir: '../../node_modules/.vitest',
      },
      environment: 'jsdom',
      include: ['./tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

      reporters: ['default'],
      coverage: {
        reportsDirectory: '../../coverage/apps/web-ui',
        provider: 'v8',
      },
    },
  };
});
