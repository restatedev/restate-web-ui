import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate,
} from '@remix-run/react';
import styles from './tailwind.css?url';
import type { LinksFunction } from '@remix-run/node';
import { CLOUD_API_BASE_URL } from '@restate/data-access/cloud-api-client';
import { LayoutOutlet, LayoutProvider, LayoutZone } from '@restate/ui/layout';
import { RouterProvider } from 'react-aria-components';

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
];

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
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
    <>
      <LayoutOutlet zone={LayoutZone.AppBar}>Restate</LayoutOutlet>
      <LayoutOutlet zone={LayoutZone.Content}>
        <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </LayoutOutlet>
    </>
  );
}

export function HydrateFallback() {
  return <p>Loading...</p>;
}
