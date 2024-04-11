import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig, loadEnv } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    root: __dirname,
    cacheDir: '../../node_modules/.vite/apps/cloud',
    plugins: [
      !process.env.VITEST &&
        remix({
          ssr: false,
        }),
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
      'process.env.RESTATE_CLOUD_API_URL': JSON.stringify(
        env.RESTATE_CLOUD_API_URL
      ),
      'process.env.MOCK': JSON.stringify(
        Boolean(env.NX_TASK_TARGET_CONFIGURATION)
      ),
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
