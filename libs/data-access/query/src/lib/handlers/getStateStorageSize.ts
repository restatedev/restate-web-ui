import { type QueryContext } from './shared';

const STATE_STORAGE_SIZE_QUERY = `SELECT service_name, COALESCE(SUM(value_length), 0) AS size
  FROM state
  GROUP BY service_name
  ORDER BY service_name`;

export async function getStateStorageSize(this: QueryContext) {
  const { rows } = await this.query(STATE_STORAGE_SIZE_QUERY);

  return Response.json({
    services: rows.map((row) => ({
      service_name: String(row.service_name),
      size: Number(row.size ?? 0),
    })),
  });
}
