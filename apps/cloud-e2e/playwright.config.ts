import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';

export const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';
/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    // permissions: ['clipboard-read', 'clipboard-write'],
  },
  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: `pnpm nx start cloud -c ${appEnv}`,
  //   url: baseURL,
  //   reuseExistingServer: !process.env.CI,
  //   cwd: workspaceRoot,
  // },
  workers: 1,
  projects: [
    { name: 'auth', testMatch: 'auth.setup.ts', retries: 3 },
    {
      name: 'cleanup',
      testMatch: 'cleanup.teardown.ts',
      use: {
        storageState: 'playwright/.auth/user.json',
      },
    },
    {
      name: 'onboarding',
      testMatch: 'onboarding.setup.ts',
      dependencies: ['auth'],
      teardown: 'cleanup',
      use: {
        storageState: 'playwright/.auth/user.json',
      },
    },

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
        contextOptions: {
          // chromium-specific permissions
          permissions: ['clipboard-read', 'clipboard-write'],
        },
      },
      dependencies: ['onboarding'],
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
        launchOptions: {
          firefoxUserPrefs: {
            'dom.events.asyncClipboard.readText': true,
            'dom.events.testing.asyncClipboard': true,
          },
        },
      },
      dependencies: ['onboarding'],
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['onboarding'],
    },

    // Uncomment for mobile browsers support
    /* {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    }, */

    // Uncomment for branded browsers
    /* {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    } */
  ],
});
