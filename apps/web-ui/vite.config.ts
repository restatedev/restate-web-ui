import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig, loadEnv } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import license from 'rollup-plugin-license';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const BASE_URL = '/ui/';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const ADMIN_BASE_URL = env['ADMIN_BASE_URL'] || '';
  const SERVER_HEADERS = {
    'Set-Cookie': `adminBaseUrl=${ADMIN_BASE_URL}; SameSite=Strict; Path=/`,
  };

  return {
    base: BASE_URL,
    root: __dirname,
    cacheDir: '../../node_modules/.vite/apps/web-ui',
    plugins: [
      {
        ...license({
          cwd: path.join(__dirname, '../..'),
          thirdParty: {
            output: {
              file: path.join(
                __dirname,
                '../../dist/apps/web-ui',
                'vendor.LICENSE.txt'
              ),
            },
          },
        }),
        apply(config, env) {
          return !env.isSsrBuild;
        },
      },
      !process.env.VITEST &&
        remix({
          ssr: false,
          basename: BASE_URL,
          future: {
            v3_fetcherPersist: true,
            v3_relativeSplatPath: true,
            v3_throwAbortReason: true,
          },
        }),
      nxViteTsPaths(),
      nodePolyfills(),
    ],

    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [ nxViteTsPaths() ],
    // },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },

    server: {
      headers: SERVER_HEADERS,
      hmr: {
        protocol: 'ws',
        port: 3001,
      },
    },
    preview: {
      headers: SERVER_HEADERS,
    },
    define: {
      'globalThis.env': {
        VERSION: env.VERSION ?? 'dev',
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
        reportsDirectory: '../../coverage/apps/web-ui',
        provider: 'v8',
      },
    },
  };
});
