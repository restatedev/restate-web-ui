import { hexToBase64 } from '@restate/util/binary';
import { stateVersion } from '../stateVersion';
import type { QueryContext } from './shared';

export async function getState(
  this: QueryContext,
  service: string,
  key: string,
) {
  const state: { name: string; value: string }[] = await this.query(
    `SELECT key, value FROM state WHERE service_name = '${service}' AND service_key = '${key}'`,
  ).then(({ rows }) =>
    rows.map((row) => ({
      name: row.key,
      value: hexToBase64(row.value) as string,
    })),
  );
  const version = stateVersion(state);

  return new Response(JSON.stringify({ state, version }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
