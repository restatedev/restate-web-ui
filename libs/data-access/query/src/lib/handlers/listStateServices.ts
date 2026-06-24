import { type QueryContext } from './shared';

const LIST_STATE_SERVICES_QUERY = `SELECT DISTINCT service_name
  FROM state
  ORDER BY service_name`;

export async function listStateServices(this: QueryContext) {
  const { rows } = await this.query(LIST_STATE_SERVICES_QUERY);

  return Response.json({
    services: rows.map((row) => String(row.service_name)),
  });
}
