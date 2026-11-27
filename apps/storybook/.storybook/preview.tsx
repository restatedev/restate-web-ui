import type { Preview } from '@storybook/react-vite';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { RouterProvider as AriaRouterProvider } from 'react-aria-components';
import {
  createMemoryRouter,
  RouterProvider,
  useRouteError,
} from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './storybook.css';

const StoryContext = createContext<ReactNode>(null);

function StoryOutlet() {
  return useContext(StoryContext);
}

const renderErrors: unknown[] = [];

function StoryRenderError() {
  const error = useRouteError();
  useEffect(() => {
    renderErrors.push(error);
  }, [error]);
  return (
    <p role="alert">
      This story failed to render:{' '}
      {error instanceof Error ? error.message : String(error)}
    </p>
  );
}

const router = createMemoryRouter([
  { path: '*', element: <StoryOutlet />, ErrorBoundary: StoryRenderError },
]);
const queryClient = new QueryClient();

const preview: Preview = {
  tags: ['autodocs'],
  beforeEach: () => {
    renderErrors.length = 0;
  },
  afterEach: () => {
    const [error] = renderErrors;
    if (error) throw error;
  },
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
    backgrounds: { disable: true },
    options: {
      storySort: {
        order: [
          'Introduction',
          'Foundations',
          'Actions',
          'Forms',
          'Feedback',
          'Overlays',
          'Navigation',
          'Layout',
          'Data display',
        ],
      },
    },
  },
  decorators: [
    withThemeByDataAttribute({
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
    (Story) => (
      <StoryContext.Provider
        value={
          <AriaRouterProvider navigate={() => undefined}>
            <Story />
          </AriaRouterProvider>
        }
      >
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </StoryContext.Provider>
    ),
  ],
};

export default preview;
