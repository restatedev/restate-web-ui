import type { Handler } from '@restate/data-access/admin-api-spec';
import type { QueryContext } from './shared';

function getSizeFromSysInbox(
  this: QueryContext,
  key: string,
  service: string,
  invocationId?: string,
) {
  return this.query(
    `SELECT COUNT(*) AS size FROM sys_inbox WHERE service_key = '${key}' AND service_name = '${service}'`,
  ).then(({ rows }) => rows.at(0)?.size);
}

function getVqueueId(
  this: QueryContext,
  key: string,
  service: string,
  invocationId?: string,
): Promise<{ id?: string; sequence_number?: string }> {
  return this.query(
    `SELECT id, sequence_number FROM sys_vqueues WHERE entry_id = '${invocationId}'`,
  ).then(({ rows }) => ({
    id: rows.at(0)?.id,
    sequence_number: rows.at(0)?.sequence_number,
  }));
}

async function getSizeFromSysVqueues(
  this: QueryContext,
  key: string,
  service: string,
  invocationId?: string,
): Promise<string | undefined> {
  const { id } = await getVqueueId.call(this, key, service, invocationId);
  if (id === undefined) {
    return undefined;
  }
  return this.query(
    `SELECT COUNT(*) AS size FROM sys_vqueues WHERE id = '${id}'`,
  ).then(({ rows }) => rows.at(0)?.size);
}

function getPositionFromSysInbox(
  this: QueryContext,
  key: string,
  service: string,
  invocationId?: string,
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
  key: string,
  service: string,
  invocationId?: string,
) {
  const { id, sequence_number } = await getVqueueId.call(
    this,
    key,
    service,
    invocationId,
  );
  if (id === undefined || sequence_number === undefined) {
    return undefined;
  }

  return this.query(
    `SELECT COUNT(*) AS position FROM sys_vqueues WHERE id = '${id}' AND sequence_number < ${
      sequence_number
    }`,
  ).then(({ rows }) => rows.at(0)?.position - 1);
}

async function getSize(
  this: QueryContext,
  key: string,
  service: string,
  invocationId?: string,
) {
  const [inbox, vqueue] = await Promise.allSettled([
    getSizeFromSysInbox.call(this, key, service, invocationId),
    getSizeFromSysVqueues.call(this, key, service, invocationId),
  ]);
  const inboxValue = inbox.status === 'fulfilled' ? inbox.value : undefined;
  const vqueueValue = vqueue.status === 'fulfilled' ? vqueue.value : undefined;
  console.log(inboxValue, vqueueValue);

  return vqueueValue ?? inboxValue;
}

async function getPosition(
  this: QueryContext,
  key: string,
  service: string,
  invocationId?: string,
) {
  const [inbox, vqueue] = await Promise.allSettled([
    getPositionFromSysInbox.call(this, key, service, invocationId),
    getPositionFromSysVqueues.call(this, key, service, invocationId),
  ]);
  const inboxValue = inbox.status === 'fulfilled' ? inbox.value : undefined;
  const vqueueValue = vqueue.status === 'fulfilled' ? vqueue.value : undefined;
  console.log(inboxValue, vqueueValue);
  return vqueueValue ?? inboxValue;
}

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
    getSize.call(this, key, service, invocationId),
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
