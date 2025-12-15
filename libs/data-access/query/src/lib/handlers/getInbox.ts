import type { Handler } from '@restate/data-access/admin-api/spec';
import type { QueryContext } from './shared';

export async function getInbox(
  this: QueryContext,
  service: string,
  key: string,
  invocationId: string | undefined,
) {
  const [head, size, position] = await Promise.all([
    this.adminApi<{ handlers: Handler[] }>(`/services/${service}/handlers`)
      .then(({ handlers }) =>
        handlers
          .filter((handler) => handler.ty === 'Exclusive')
          .map((handler) => `'${handler.name}'`),
      )
      .then((handlers) =>
        handlers.length > 0
          ? this.query(
              `SELECT id FROM sys_invocation WHERE target_service_key = '${key}' AND target_service_name = '${service}' AND status NOT IN ('completed', 'pending', 'scheduled') AND target_handler_name IN (${handlers.join(
                ', ',
              )})`,
            )
          : { rows: [] },
      )
      .then(({ rows }) => rows.at(0)?.id),
    this.query(
      `SELECT COUNT(*) AS size FROM sys_inbox WHERE service_key = '${key}' AND service_name = '${service}'`,
    ).then(({ rows }) => rows.at(0)?.size),
    invocationId
      ? this.query(
          `SELECT sequence_number FROM sys_inbox WHERE id = '${invocationId}'`,
        )
          .then(({ rows }) =>
            rows.length === 0
              ? { rows: [{ position: -1 }] }
              : this.query(
                  `SELECT COUNT(*) AS position FROM sys_inbox WHERE service_key = '${key}' AND service_name = '${service}' AND sequence_number < ${
                    rows.at(0).sequence_number
                  }`,
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
