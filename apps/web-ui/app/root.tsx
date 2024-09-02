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
import { AdminBaseURLProvider } from '@restate/data-access/admin-api';
import { Nav, NavItem } from '@restate/ui/nav';
import { Icon, IconName } from '@restate/ui/icons';

export const links: LinksFunction = () => [
  {
    rel: 'preconnect',
    href: 'https://rsms.me/',
  },
  { rel: 'stylesheet', href: styles },
  { rel: 'stylesheet', href: 'https://rsms.me/inter/inter.css' },
  { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
  {
    rel: 'icon',
    type: 'image/png',
    href: '/favicon-32x32.png',
    sizes: '32x32',
  },
  {
    rel: 'icon',
    type: 'image/png',
    href: '/favicon-16x16.png',
    sizes: '16x16',
  },
  { rel: 'manifest', href: '/site.webmanifest' },
  { rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: '#222452' },
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

export default function App() {
  return (
    <AdminBaseURLProvider>
      <QueryProvider>
        <LayoutOutlet zone={LayoutZone.Content}>
          <Outlet />
        </LayoutOutlet>
        <LayoutOutlet zone={LayoutZone.AppBar}>
          <div className="flex items-center gap-2 flex-1">
            <Button
              variant="secondary"
              className="flex gap-2 items-center bg-white pl-3 pr-2 shadow-sm h-full"
            >
              <Icon
                name={IconName.RestateEnvironment}
                className="text-xl text-[#222452]"
              />
              <Icon name={IconName.ChevronsUpDown} className="text-gray-400" />
            </Button>
            <LayoutOutlet zone={LayoutZone.Nav}>
              <Nav ariaCurrentValue="page">
                <NavItem href={'/overview'}>Overview</NavItem>
              </Nav>
            </LayoutOutlet>
          </div>
        </LayoutOutlet>
      </QueryProvider>
    </AdminBaseURLProvider>
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
