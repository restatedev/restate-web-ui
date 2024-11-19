import {
  Links,
  Meta,
  Outlet,
  Path,
  Scripts,
  ScrollRestoration,
  useNavigate,
} from '@remix-run/react';
import styles from './tailwind.css?url';
import type { LinksFunction } from '@remix-run/node';
import { LayoutOutlet, LayoutProvider, LayoutZone } from '@restate/ui/layout';
import { RouterProvider } from 'react-aria-components';
import { Button, Spinner } from '@restate/ui/button';
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
} from '@restate/features/overview-route';

export const links: LinksFunction = () => [
  {
    rel: 'preconnect',
    href: 'https://rsms.me/',
  },
  { rel: 'stylesheet', href: styles },
  { rel: 'stylesheet', href: 'https://rsms.me/inter/inter.css' },
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
        <title>Restate UI</title>
        <Meta />
        <Links />
      </head>
      <body className="h-full font-sans">
        <RouterProvider navigate={navigate}>
          <LayoutProvider>{children}</LayoutProvider>
        </RouterProvider>
        <ScrollRestoration />
        <Scripts />
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
      <RestateContextProvider
        adminBaseUrl={getCookieValue('adminBaseUrl')}
        ingressUrl="http://localhost:8080"
      >
        <LayoutOutlet zone={LayoutZone.Content}>
          <Outlet />
        </LayoutOutlet>
        <LayoutOutlet zone={LayoutZone.AppBar}>
          <div className="flex items-stretch gap-2 flex-1">
            <div className="flex gap-2 items-center rounded-xl border bg-white p-3 shadow-sm h-full">
              <Icon
                name={IconName.RestateEnvironment}
                className="text-xl text-[#222452]"
              />
            </div>
            <Button
              variant="secondary"
              className="flex items-center gap-2 px-2 my-1 bg-transparent border-none shadow-none"
            >
              <div className="truncate row-start-1 col-start-2 w-full flex items-center gap-2">
                <HealthIndicator mini className="-mt-0.5" />
                <HealthCheckNotification />
                <span className="flex-auto truncate">Restate server</span>
                <Version />
              </div>
            </Button>
            <LayoutOutlet zone={LayoutZone.Nav}>
              <Nav ariaCurrentValue="page">
                <NavItem href={'/overview'}>Overview</NavItem>
                <NavItem href={'/invocations'}>Invocations</NavItem>
              </Nav>
            </LayoutOutlet>
          </div>
        </LayoutOutlet>
        <DeploymentDetails />
        <ServiceDetails />
        <DeleteDeployment />
        <ServicePlayground />
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
