import type { Handler } from '@restate/data-access/admin-api-spec';
import type { QueryContext } from './shared';

function scopeClause(scope?: string) {
  return scope !== undefined ? ` AND scope = '${scope}'` : ` AND scope IS NULL`;
}

function getSizeFromSysInbox(this: QueryContext, key: string, service: string) {
  return this.query(
    `SELECT COUNT(*) AS size FROM sys_inbox WHERE service_key = '${key}' AND service_name = '${service}'`,
  ).then(({ rows }) => rows.at(0)?.size);
}

function getSizeFromSysVqueueMeta(
  this: QueryContext,
  key: string,
  service: string,
  scope?: string,
) {
  return this.query(
    `SELECT (num_inbox + num_running + num_suspended + num_paused) AS size FROM sys_vqueue_meta WHERE service_name = '${service}' AND lock_name = '${service}/${key}' AND is_active = true${scopeClause(scope)}`,
  ).then(({ rows }) => rows.at(0)?.size ?? 0);
}

async function getVqueueId(
  this: QueryContext,
  invocationId: string,
): Promise<{ id?: string; sequence_number?: string }> {
  return this.query(
    `SELECT id, sequence_number FROM sys_vqueues WHERE entry_id = '${invocationId}'`,
  ).then(({ rows }) => ({
    id: rows.at(0)?.id,
    sequence_number: rows.at(0)?.sequence_number,
  }));
}

function getPositionFromSysInbox(
  this: QueryContext,
  key: string,
  service: string,
  invocationId: string,
) {
  return this.query(
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
    .then(({ rows }) => rows.at(0)?.position);
}

async function getPositionFromSysVqueues(
  this: QueryContext,
  invocationId: string,
) {
  const { id, sequence_number } = await getVqueueId.call(this, invocationId);
  if (id === undefined || sequence_number === undefined) {
    return undefined;
  }

  return this.query(
    `SELECT COUNT(*) AS position FROM sys_vqueues WHERE id = '${id}' AND sequence_number < ${sequence_number}`,
  ).then(({ rows }) => rows.at(0)?.position - 1);
}

function getSize(
  this: QueryContext,
  key: string,
  service: string,
  scope?: string,
) {
  return this.features.has('vqueues')
    ? getSizeFromSysVqueueMeta.call(this, key, service, scope)
    : getSizeFromSysInbox.call(this, key, service);
}

function getPosition(
  this: QueryContext,
  key: string,
  service: string,
  invocationId: string,
) {
  return this.features.has('vqueues')
    ? getPositionFromSysVqueues.call(this, invocationId)
    : getPositionFromSysInbox.call(this, key, service, invocationId);
}

export async function getInbox(
  this: QueryContext,
  service: string,
  key: string,
  invocationId: string | undefined,
  scope?: string,
) {
  const hasVqueues = this.features.has('vqueues');
  const headScopeClause = hasVqueues ? scopeClause(scope) : '';
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
              )})${headScopeClause}`,
            )
          : { rows: [] },
      )
      .then(({ rows }) => rows.at(0)?.id),
    getSize.call(this, key, service, scope),
    invocationId ? getPosition.call(this, key, service, invocationId) : null,
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
