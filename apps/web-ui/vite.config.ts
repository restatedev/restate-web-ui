import { reactRouter } from '@react-router/dev/vite';
import { defineConfig, loadEnv, Plugin } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import license from 'rollup-plugin-license';
import path from 'path';
import { BASE_URL } from './constants';
import { defaultClientConditions, defaultServerConditions } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Add this plugin to your Vite config
const prismaFixPlugin = {
  name: 'prisma-fix',
  enforce: 'post',
  config() {
    return {
      resolve: {
        conditions: [...defaultClientConditions],
      },
      ssr: {
        resolve: {
          conditions: [...defaultServerConditions],
          externalConditions: [...defaultServerConditions],
        },
      },
    };
  },
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const ADMIN_BASE_URL = env['ADMIN_BASE_URL'] || '';
  const SERVER_HEADERS = {
    'Set-Cookie': `adminBaseUrl=${ADMIN_BASE_URL}; SameSite=Strict; Path=/`,
    'Service-Worker-Allowed': '/',
  };

  return {
    base: BASE_URL,
    root: __dirname,
    cacheDir: '../../node_modules/.vite/apps/web-ui',
    resolve: {
      alias: {
        '@prisma/client': '@prisma/client/index.js',
      },
    },
    plugins: [
      prismaFixPlugin,
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
      !process.env.VITEST && reactRouter(),
      nxViteTsPaths(),
      tailwindcss(),
    ] as Plugin[],
    // Uncomment this if you are using workers.
    worker: {
      plugins: () => [nxViteTsPaths()],
    },
    build: {
      outDir: './dist',
      emptyOutDir: true,
      reportCompressedSize: true,
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
