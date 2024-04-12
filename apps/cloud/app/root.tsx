import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import styles from './tailwind.css?url';
import type { LinksFunction } from '@remix-run/node';
import { CLOUD_API_BASE_URL } from '@restate/data-access/cloud-api-client';

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
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <div>
      //TODO: App layout
      <Outlet />
    </div>
  );
}

export function HydrateFallback() {
  return <p>Loading...</p>;
}
