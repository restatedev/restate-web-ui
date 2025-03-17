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
import { Icon, IconName } from '@restate/ui/icons';
import { RestateContextProvider } from '@restate/features/restate-context';
import { Version } from '@restate/features/version';
import {
  HealthCheckNotification,
  HealthIndicator,
} from '@restate/features/health';
import {
  DeleteDeployment,
  DeploymentDetails,
  ServicePlayground,
  ServiceDetails,
  SERVICE_PLAYGROUND_QUERY_PARAM,
  SERVICE_QUERY_PARAM,
  DEPLOYMENT_QUERY_PARAM,
} from '@restate/features/overview-route';
import { Spinner } from '@restate/ui/loading';
import {
  DeleteInvocation,
  INVOCATION_QUERY_NAME,
  InvocationPanel,
} from '@restate/features/invocation-route';
import { Support } from '@restate/features/support';
import {
  STATE_QUERY_NAME,
  StatePanel,
} from '@restate/features/state-object-route';
import { EditState } from '@restate/features/edit-state';

export const links: LinksFunction = () => [
  // TODO: move to the its own lib
  {
    rel: 'stylesheet',
    href: '/ui/elements-web-components.min.css',
  },
  {
    rel: 'stylesheet',
    href: '/ui/inter.css',
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

export function Layout({ children }: { children: React.ReactNode }) {
  const remixNavigate = useNavigate();

  const navigate = useCallback(
    (to: string | Partial<Path>) => {
      remixNavigate(to, { preventScrollReset: true });
    },
    [remixNavigate]
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
    <QueryProvider>
      <RestateContextProvider adminBaseUrl={getCookieValue('adminBaseUrl')}>
        <EditState>
          <LayoutOutlet zone={LayoutZone.Content}>
            <Outlet />
          </LayoutOutlet>
          <LayoutOutlet zone={LayoutZone.AppBar}>
            <div className="flex items-stretch gap-2 flex-1 min-w-0">
              <div className="flex gap-2 items-center rounded-xl border bg-white p-3 shadow-sm h-full">
                <Icon
                  name={IconName.RestateEnvironment}
                  className="text-xl text-[#222452]"
                />
              </div>
              <Button
                variant="secondary"
                className="flex items-center gap-2 px-2 my-1 bg-transparent border-none shadow-none min-w-0"
              >
                <div className="truncate row-start-1 col-start-2 w-full flex items-center gap-2">
                  <HealthIndicator mini className="-mt-0.5" />
                  <HealthCheckNotification />
                  <span className="flex-auto truncate min-w-0 block">
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
          <DeleteInvocation />
          <Support />
        </EditState>
      </RestateContextProvider>
    </QueryProvider>
  );
}

// TODO: implement proper loader
export function HydrateFallback() {
  return (
    <p className="flex gap-2 items-center">
      <Spinner />
      Loading...
    </p>
  );
}
