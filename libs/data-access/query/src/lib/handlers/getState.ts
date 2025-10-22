import { hexToBase64 } from '@restate/util/binary';
import { stateVersion } from '../stateVersion';
import { queryFetcher } from './shared';

export async function getState(
  service: string,
  key: string,
  baseUrl: string,
  headers: Headers,
) {
  const state: { name: string; value: string }[] = await queryFetcher(
    `SELECT key, value_utf8, value FROM state WHERE service_name = '${service}' AND service_key = '${key}'`,
    { baseUrl, headers },
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
