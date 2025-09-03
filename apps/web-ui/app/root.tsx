import {
  Links,
  Meta,
  Outlet,
  Path,
  Scripts,
  ScrollRestoration,
  useHref,
  useNavigate,
} from 'react-router';
import styles from './tailwind.css?url';
import type { LinksFunction, To } from 'react-router';
import { LayoutOutlet, LayoutProvider, LayoutZone } from '@restate/ui/layout';
import { RouterProvider } from 'react-aria-components';
import { Button } from '@restate/ui/button';
import { useCallback } from 'react';
import { QueryProvider } from '@restate/util/react-query';
import { Nav, NavItem } from '@restate/ui/nav';
import { Icon, IconName, Restate } from '@restate/ui/icons';
import { RestateContextProvider } from '@restate/features/restate-context';
import { Version } from '@restate/features/version';
import {
  HealthCheckNotification,
  HealthIndicator,
} from '@restate/features/health';
import { Spinner } from '@restate/ui/loading';
import {
  InvocationActions,
  INVOCATION_QUERY_NAME,
  InvocationPanel,
} from '@restate/features/invocation-route';
import { Support } from '@restate/features/support';
import {
  STATE_QUERY_NAME,
  StatePanel,
} from '@restate/features/state-object-route';
import { EditState } from '@restate/features/edit-state';
import { FeatureFlags } from '@restate/util/feature-flag';
import { QueryClient } from '@tanstack/react-query';
import {
  DEPLOYMENT_QUERY_PARAM,
  DeleteDeployment,
} from '@restate/features/deployment';
import {
  SERVICE_PLAYGROUND_QUERY_PARAM,
  SERVICE_QUERY_PARAM,
  ServicePlayground,
} from '@restate/features/service';
import { DeploymentDetails } from '@restate/features/deployment-details';
import { EditService, ServiceDetails } from '@restate/features/service-details';

export const links: LinksFunction = () => [
  // TODO: move to the its own lib
  {
    rel: 'stylesheet',
    href: '/ui/elements-web-components.min.scoped.css',
  },
  {
    rel: 'stylesheet',
    href: '/ui/font/inter.css',
  },
  {
    rel: 'stylesheet',
    href: '/ui/font/jetbrains.css',
  },
  { rel: 'stylesheet', href: styles },
  {
    rel: 'apple-touch-icon',
    href: '/ui/apple-touch-icon.png',
    sizes: '180x180',
  },
  {
    rel: 'icon',
    type: 'image/png',
    href: '/ui/favicon-32x32.png',
    sizes: '32x32',
  },
  {
    rel: 'icon',
    type: 'image/png',
    href: '/ui/favicon-16x16.png',
    sizes: '16x16',
  },
  { rel: 'manifest', href: '/ui/site.webmanifest' },
  { rel: 'mask-icon', href: '/ui/safari-pinned-tab.svg', color: '#222452' },
];

function useRefWithSupportForAbsolutePath(path: To) {
  const url = useHref(path);

  if (path.toString().startsWith('http')) {
    return path.toString();
  }

  return url;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // With SSR, we usually want to set some default staleTime
      // above 0 to avoid refetching immediately on the client
      staleTime: 5 * 60 * 1000,
      retry: false,
      refetchOnMount: false,
      experimental_prefetchInRender: true,
    },
  },
});

export function Layout({ children }: { children: React.ReactNode }) {
  const remixNavigate = useNavigate();

  const navigate = useCallback(
    (to: string | Partial<Path>) => {
      remixNavigate(to, { preventScrollReset: true });
    },
    [remixNavigate],
  );

  return (
    <html lang="en" className="h-full bg-gray-100 dark:bg-gray-900">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="msapplication-TileColor" content="#222452" />
        <meta name="theme-color" content="#f3f4f6"></meta>
        <meta name="version" content={globalThis.env.VERSION} />
        <title>Restate</title>
        <Meta />
        <Links />
      </head>
      <body className="h-full font-sans">
        <RouterProvider
          navigate={navigate}
          useHref={useRefWithSupportForAbsolutePath}
        >
          <LayoutProvider>{children}</LayoutProvider>
        </RouterProvider>
        <ScrollRestoration />
        <Scripts />
        {/* TODO: move to its own lib */}
        <script src="/ui/elements-web-components.min.js" async defer></script>
      </body>
    </html>
  );
}

function getCookieValue(name: string) {
  const cookies = document.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('='));
  const cookieValue = cookies.find(([key]) => key === name)?.at(1);
  return cookieValue && decodeURIComponent(cookieValue);
}

export default function App() {
  return (
    <FeatureFlags>
      <QueryProvider queryClient={queryClient}>
        <RestateContextProvider adminBaseUrl={getCookieValue('adminBaseUrl')}>
          <EditState>
            <LayoutOutlet zone={LayoutZone.Content}>
              <Outlet />
            </LayoutOutlet>
            <LayoutOutlet zone={LayoutZone.AppBar}>
              <div className="flex min-w-0 flex-1 items-stretch gap-1">
                <div className="border1 bg1-white shadow2-xs flex h-full items-center gap-2 rounded-xl p-3 pr-0">
                  <Restate />
                </div>
                <Button
                  variant="secondary"
                  className="my-1 flex min-w-0 items-center gap-2 border-none bg-transparent px-2 shadow-none"
                >
                  <div className="flex w-full items-center gap-2 truncate">
                    <HealthIndicator mini className="-mt-0.5" />
                    <HealthCheckNotification />
                    <span className="block min-w-0 flex-auto truncate">
                      Restate server
                    </span>
                    <Version />
                  </div>
                </Button>
                <LayoutOutlet zone={LayoutZone.Nav}>
                  <Nav ariaCurrentValue="page">
                    <NavItem
                      preserveSearchParams={[
                        SERVICE_PLAYGROUND_QUERY_PARAM,
                        SERVICE_QUERY_PARAM,
                        DEPLOYMENT_QUERY_PARAM,
                        INVOCATION_QUERY_NAME,
                        STATE_QUERY_NAME,
                      ]}
                      href={'/overview'}
                    >
                      Overview
                    </NavItem>
                    <NavItem
                      preserveSearchParams={[
                        SERVICE_PLAYGROUND_QUERY_PARAM,
                        SERVICE_QUERY_PARAM,
                        DEPLOYMENT_QUERY_PARAM,
                        INVOCATION_QUERY_NAME,
                        STATE_QUERY_NAME,
                      ]}
                      href={'/invocations'}
                    >
                      Invocations
                    </NavItem>
                    <NavItem
                      preserveSearchParams={[
                        SERVICE_PLAYGROUND_QUERY_PARAM,
                        SERVICE_QUERY_PARAM,
                        DEPLOYMENT_QUERY_PARAM,
                        INVOCATION_QUERY_NAME,
                        STATE_QUERY_NAME,
                      ]}
                      href={'/state'}
                    >
                      State
                    </NavItem>
                    <NavItem
                      preserveSearchParams={[
                        SERVICE_PLAYGROUND_QUERY_PARAM,
                        SERVICE_QUERY_PARAM,
                        DEPLOYMENT_QUERY_PARAM,
                        INVOCATION_QUERY_NAME,
                        STATE_QUERY_NAME,
                      ]}
                      href={'/introspection'}
                    >
                      Introspection
                    </NavItem>
                  </Nav>
                </LayoutOutlet>
              </div>
            </LayoutOutlet>
            <DeploymentDetails />
            <ServiceDetails />
            <DeleteDeployment />
            <ServicePlayground />
            <InvocationPanel />
            <StatePanel />
            <EditService />
            <InvocationActions />
            <Support />
          </EditState>
        </RestateContextProvider>
      </QueryProvider>
    </FeatureFlags>
  );
}

// TODO: implement proper loader
export function HydrateFallback() {
  return (
    <p className="flex items-center gap-2">
      <Spinner />
      Loading...
    </p>
  );
}
