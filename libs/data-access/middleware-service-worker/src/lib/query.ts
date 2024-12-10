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
    if (isKilled) {
      return 'killed';
    }
    if (isCancelled) {
      return 'cancelled';
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
  const totalCountPromise = query(
    'SELECT COUNT(*) AS total_count FROM sys_invocation',
    { baseUrl }
  )
    .then((res) => res.json())
    .then(({ rows }) => rows?.at(0)?.total_count);
  return query(
    'SELECT * FROM sys_invocation ORDER BY modified_at DESC LIMIT 1000',
    {
      baseUrl,
    }
  ).then(async (res) => {
    if (res.ok) {
      const jsonResponse = await res.json();
      const total_count = await totalCountPromise;
      return new Response(
        JSON.stringify({
          ...jsonResponse,
          limit: 1000,
          total_count,
          rows: jsonResponse.rows.map((invocation: RawInvocation) => ({
            ...invocation,
            status: getComputedStatus(invocation),
            last_start_at:
              invocation.last_start_at && `${invocation.last_start_at}Z`,
            running_at: invocation.running_at && `${invocation.running_at}Z`,
            modified_at: invocation.modified_at && `${invocation.modified_at}Z`,
            inboxed_at: invocation.inboxed_at && `${invocation.inboxed_at}Z`,
            scheduled_at:
              invocation.scheduled_at && `${invocation.scheduled_at}Z`,
            completed_at:
              invocation.completed_at && `${invocation.completed_at}Z`,
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
  });
}

export function queryMiddlerWare(req: Request) {
  const { url, method } = req;
  if (url.endsWith('/query/invocations') && method.toUpperCase() === 'GET') {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    return listInvocations(baseUrl);
  }
}
