import ky from 'ky';
import type { Handler } from '@restate/data-access/admin-api/spec';
import { queryFetcher } from './shared';

export async function getInbox(
  service: string,
  key: string,
  invocationId: string | undefined,
  baseUrl: string,
  headers: Headers,
) {
  const [head, size, position] = await Promise.all([
    ky
      .get(`${baseUrl}/services/${service}/handlers`)
      .json<{ handlers: Handler[] }>()
      .then(({ handlers }) =>
        handlers
          .filter((handler) => handler.ty === 'Exclusive')
          .map((handler) => `'${handler.name}'`),
      )
      .then((handlers) =>
        handlers.length > 0
          ? queryFetcher(
              `SELECT id FROM sys_invocation WHERE target_service_key = '${key}' AND target_service_name = '${service}' AND status NOT IN ('completed', 'pending', 'scheduled') AND target_handler_name IN (${handlers.join(
                ', ',
              )})`,
              {
                baseUrl,
                headers,
              },
            )
          : { rows: [] },
      )
      .then(({ rows }) => rows.at(0)?.id),
    queryFetcher(
      `SELECT COUNT(*) AS size FROM sys_inbox WHERE service_key = '${key}' AND service_name = '${service}'`,
      {
        baseUrl,
        headers,
      },
    ).then(({ rows }) => rows.at(0)?.size),
    invocationId
      ? queryFetcher(
          `SELECT sequence_number FROM sys_inbox WHERE id = '${invocationId}'`,
          { baseUrl, headers },
        )
          .then(({ rows }) =>
            rows.length === 0
              ? { rows: [{ position: -1 }] }
              : queryFetcher(
                  `SELECT COUNT(*) AS position FROM sys_inbox WHERE service_key = '${key}' AND service_name = '${service}' AND sequence_number < ${
                    rows.at(0).sequence_number
                  }`,
                  {
                    baseUrl,
                    headers,
                  },
                ),
          )
          .then(({ rows }) => rows.at(0)?.position)
      : null,
  ]);

  if (typeof size === 'number') {
    const isInvocationHead = head === invocationId;
    return new Response(
      JSON.stringify({
        head,
        size: size + Number(!!head),
        ...(typeof position === 'number' &&
          (position >= 0 || isInvocationHead) &&
          invocationId && {
            [invocationId]: isInvocationHead ? 0 : position + 1,
          }),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  return new Response(JSON.stringify({ message: 'Not found' }), {
    status: 404,
    statusText: 'Not found',
    headers: { 'Content-Type': 'application/json' },
  });
}
