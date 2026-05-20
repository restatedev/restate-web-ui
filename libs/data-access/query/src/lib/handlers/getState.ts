import { hexToBase64 } from '@restate/util/binary';
import { stateVersion } from '../stateVersion';
import {
  scopeClause,
  type QueryContext,
  type StateServiceType,
} from './shared';

export async function getState(
  this: QueryContext,
  service: string,
  key: string,
  scope?: string,
  serviceType?: StateServiceType,
) {
  const state: { name: string; value: string }[] = await this.query(
    `SELECT key, value FROM state WHERE service_name = '${service}' AND service_key = '${key}'${scopeClause(this, scope, serviceType)}`,
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
