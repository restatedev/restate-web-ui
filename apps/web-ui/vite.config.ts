import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vitest/config';
import { loadEnv, Plugin } from 'vite';
import license from 'rollup-plugin-license';
import path from 'path';
import { BASE_URL } from './constants.ts';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const ADMIN_BASE_URL = env['ADMIN_BASE_URL'] || '';
  const SERVER_HEADERS = {
    'Set-Cookie': `adminBaseUrl=${ADMIN_BASE_URL}; SameSite=Strict; Path=/`,
  };
  const ADMIN_PROXY = {
    '^(?!/ui)': {
      target: 'http://127.0.0.1:9070/',
      changeOrigin: true,
    },
  };

  return {
    base: BASE_URL,
    root: import.meta.dirname,
    cacheDir: '../../node_modules/.vite/apps/web-ui',
    resolve: { tsconfigPaths: true },
    plugins: [
      {
        ...license({
          cwd: path.join(import.meta.dirname, '../..'),
          thirdParty: {
            output: {
              file: path.join(
                import.meta.dirname,
                '../../dist/apps/web-ui',
                'vendor.LICENSE.txt',
              ),
            },
          },
        }),
        apply(config, env) {
          return !env.isSsrBuild;
        },
      },
      !process.env.VITEST && reactRouter(),
      tailwindcss(),
    ] as Plugin[],
    build: {
      outDir: './dist',
      emptyOutDir: true,
      reportCompressedSize: true,
    },
    server: {
      headers: SERVER_HEADERS,
      hmr: {
        protocol: 'ws',
        port: 3001,
      },
      proxy: ADMIN_PROXY,
    },
    preview: {
      headers: SERVER_HEADERS,
      proxy: ADMIN_PROXY,
    },
    define: {
      'globalThis.env': {
        VERSION: env.VERSION ?? 'dev',
      },
    },

    test: {
      passWithNoTests: true,
      watch: false,
      setupFiles: ['test-setup.ts'],
      globals: true,
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
