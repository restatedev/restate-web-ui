import {
  vitePlugin as remix,
  cloudflareDevProxyVitePlugin as remixCloudflareDevProxy,
} from '@remix-run/dev';
import { defineConfig, loadEnv } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    root: __dirname,
    cacheDir: '../../node_modules/.vite/apps/cloud',
    plugins: [
      !process.env.VITEST && remixCloudflareDevProxy(),
      !process.env.VITEST
        ? remix({
            future: {
              v3_fetcherPersist: true,
              v3_relativeSplatPath: true,
              v3_throwAbortReason: true,
            },
          })
        : react(),
      nxViteTsPaths(),
    ],

    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [ nxViteTsPaths() ],
    // },

    server: {
      headers: {
        'Service-Worker-Allowed': '/',
      },
      hmr: {
        protocol: 'ws',
        port: 3000,
      },
    },
    define: {
      'globalThis.env': {
        RESTATE_CLOUD_API_URL: env.RESTATE_CLOUD_API_URL ?? '',
        RESTATE_AUTH_URL: env.RESTATE_AUTH_URL ?? '',
        RESTATE_AUTH_REDIRECT_URL: env.RESTATE_AUTH_REDIRECT_URL ?? '',
        RESTATE_AUTH_CLIENT_ID: env.RESTATE_AUTH_CLIENT_ID ?? '',
        SLACK_API_URL: env.SLACK_API_URL ?? '',
        MOCK: Boolean(env.NX_TASK_TARGET_CONFIGURATION === 'mock'),
        VERSION: env.VERSION ?? 'dev',
        FEATURE_OVERVIEW_PAGE: env.FEATURE_OVERVIEW_PAGE,
      },
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
        reportsDirectory: '../../coverage/apps/cloud',
        provider: 'v8',
      },
    },
  };
});
