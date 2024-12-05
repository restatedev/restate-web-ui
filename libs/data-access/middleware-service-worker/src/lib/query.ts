import {
  InvocationComputedStatus,
  RawInvocation,
} from '@restate/data-access/admin-api';

function query(query: string, { baseUrl }: { baseUrl: string }) {
  return fetch(`${baseUrl}/query`, {
    method: 'POST',
    body: JSON.stringify({ query }),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  });
}

function getComputedStatus(
  invocation: RawInvocation
): InvocationComputedStatus {
  const isSuccessful = invocation.completion_result === 'success';
  const isCancelled = Boolean(
    invocation.completion_result === 'failure' &&
      invocation.completion_failure?.startsWith('[409]')
  );
  const isKilled = Boolean(
    isCancelled && invocation.completion_failure?.includes('killed')
  );
  const isRunning = invocation.status === 'running';
  const isCompleted = invocation.status === 'completed';
  const isRetrying = Boolean(
    invocation.retry_count &&
      invocation.retry_count > 1 &&
      (isRunning || invocation.status === 'backing-off')
  );

  if (isCompleted) {
    if (isSuccessful) {
      return 'succeeded';
    }
    if (isCancelled) {
      return 'cancelled';
    }
    if (isKilled) {
      return 'killed';
    }
    if (invocation.completion_result === 'failure') {
      return 'failed';
    }
  }

  if (isRetrying) {
    return 'retrying';
  }

  switch (invocation.status) {
    case 'pending':
      return 'pending';
    case 'ready':
      return 'ready';
    case 'scheduled':
      return 'scheduled';
    case 'running':
      return 'running';
    case 'suspended':
      return 'suspended';

    default:
      throw new Error('Cannot calculate status');
  }
}

function listInvocations(baseUrl: string) {
  return query('SELECT * FROM sys_invocation', { baseUrl }).then(
    async (res) => {
      if (res.ok) {
        const jsonResponse = await res.json();
        return new Response(
          JSON.stringify({
            ...jsonResponse,
            rows: jsonResponse.rows.map((invocation: RawInvocation) => ({
              ...invocation,
              status: getComputedStatus(invocation),
              last_start_at:
                invocation.last_start_at && `${invocation.last_start_at}Z`,
              running_at: invocation.running_at && `${invocation.running_at}Z`,
              modified_at:
                invocation.modified_at && `${invocation.modified_at}Z`,
              inboxed_at: invocation.inboxed_at && `${invocation.inboxed_at}Z`,
            })),
          }),
          {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
          }
        );
      }
      return res;
    }
  );
}

export function queryMiddlerWare(req: Request) {
  const { url, method } = req;
  if (url.endsWith('/query/invocations') && method.toUpperCase() === 'GET') {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return listInvocations(baseUrl);
  }
}
