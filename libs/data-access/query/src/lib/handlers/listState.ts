import { hexToBase64 } from '@restate/util/binary';
import { queryFetcher } from './shared';

export async function listState(
  service: string,
  baseUrl: string,
  headers: Headers,
  keys: string[],
) {
  if (keys.length === 0) {
    return new Response(JSON.stringify({ objects: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const query = `SELECT service_key, key, value
    FROM state WHERE service_name = '${service}' AND service_key IN (${keys.map((key) => `'${key}'`).join(', ')})`;

  const resultsPromise: Promise<
    {
      key: string;
      state: { name: string; value: string }[];
    }[]
  > = queryFetcher(query, {
    baseUrl,
    headers,
  }).then(async ({ rows }) => {
    const results: Record<
      string,
      { key: string; state: Record<string, string> }
    > = rows.reduce(
      (p, c) => {
        return {
          ...p,
          [c.service_key]: {
            ...p[c.service_key],
            state: {
              ...p[c.service_key].state,
              [c.key]: hexToBase64(c.value),
            },
          },
        };
      },
      keys.reduce((p, c) => {
        return { ...p, [c]: { key: c, state: {} } };
      }, {}),
    );
    return Object.values(results).map((object) => ({
      key: object.key,
      state: Object.entries(object.state).map(([name, value]) => ({
        name,
        value,
      })),
    }));
  });

  const objects = await resultsPromise;

  return new Response(JSON.stringify({ objects }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
