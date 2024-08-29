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
import { CLOUD_API_BASE_URL } from '@restate/data-access/cloud/api-client';
import { LayoutOutlet, LayoutProvider, LayoutZone } from '@restate/ui/layout';
import { RouterProvider } from 'react-aria-components';
import { Spinner } from '@restate/ui/button';
import { useCallback, useEffect } from 'react';
import { QueryProvider } from '@restate/util/react-query';

export const links: LinksFunction = () => [
  {
    rel: 'preconnect',
    href: CLOUD_API_BASE_URL,
  },
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
        <meta name="version" content={globalThis.env.VERSION} />
        <title>Restate Cloud</title>
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
  useEffect(() => {
    const _mtm = ((window as any)._mtm = (window as any)._mtm || []);
    _mtm.push({ 'mtm.startTime': new Date().getTime(), event: 'mtm.Start' });
    const d = document,
      g = d.createElement('script'),
      s = d.getElementsByTagName('script')[0];
    g.async = true;
    g.src =
      'https://cdn.matomo.cloud/restatedev.matomo.cloud/container_W6OTDw83.js';
    s?.parentNode?.insertBefore(g, s);
  }, []);

  return (
    <QueryProvider>
      <LayoutOutlet zone={LayoutZone.Content}>
        <Outlet />
      </LayoutOutlet>
    </QueryProvider>
  );
}

// TODO: implement proper loader
export function HydrateFallback() {
  return (
    <p className="flex gap-2 items-center">
      <Spinner style={{ width: '1.25rem', height: '1.25rem' }} />
      Loading...
    </p>
  );
}
