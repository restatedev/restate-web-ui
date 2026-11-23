import type { Preview } from '@storybook/react-vite';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import { createContext, useContext, type ReactNode } from 'react';
import { RouterProvider as AriaRouterProvider } from 'react-aria-components';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './storybook.css';

const StoryContext = createContext<ReactNode>(null);

function StoryOutlet() {
  return useContext(StoryContext);
}

const router = createMemoryRouter([{ path: '*', element: <StoryOutlet /> }]);
const queryClient = new QueryClient();

const preview: Preview = {
  tags: ['autodocs'],
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
