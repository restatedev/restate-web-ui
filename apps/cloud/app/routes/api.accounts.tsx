import { LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import { listAccounts } from '@restate/data-access/cloud/api-client';

export const loader = async ({
  request,
  params,
  context,
}: LoaderFunctionArgs) => {
  switch (request.method) {
    case 'GET': {
      const response = await listAccounts({
        headers: request.headers,
      });
      if (response.data) {
        return json({ accounts: response.data.accounts });
      } else {
        return json({ error: response.error }, { status: 500 });
      }
    }

    default:
      return json({}, { status: 501 });
  }
};
