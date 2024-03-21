import type { MetaFunction } from '@remix-run/node';
import { ClientLoaderFunctionArgs, useLoaderData } from '@remix-run/react';
import {
  listAccounts,
  listEnvironments,
} from '@restate/data-access/cloud-api-client';
import { Button } from '@restate/ui/button';

export const meta: MetaFunction = () => {
  return [
    { title: 'New Remix SPA' },
    { name: 'description', content: 'Welcome to Remix (SPA Mode)!' },
  ];
};

export const clientLoader = async ({
  request,
  params,
  serverLoader,
}: ClientLoaderFunctionArgs) => {
  const { data: accountsList } = await listAccounts();
  const firstAccountId = accountsList?.accounts.at(0)?.accountId;

  if (firstAccountId) {
    const { data } = await listEnvironments({
      accountId: firstAccountId,
    });

    return data;
  }

  return null;
};

export default function Index() {
  const data = useLoaderData<typeof clientLoader>();

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.8' }}>
      <h1 className="text-3xl font-bold underline">Hello restate!</h1>
      <Button />
      <ul>
        <li>
          <a
            target="_blank"
            href="https://remix.run/future/spa-mode"
            rel="noreferrer"
          >
            SPA Mode Guide
          </a>
        </li>
        <li>
          <a target="_blank" href="https://remix.run/docs" rel="noreferrer">
            Remix Docs
          </a>
        </li>
      </ul>
      <pre>
        <code>{JSON.stringify(data, null, 4)}</code>
      </pre>
    </div>
  );
}
