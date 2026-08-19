import { queryStats } from '@restate/features/query-stats-route';

export function meta() {
  return [{ title: 'Restate - Query stats' }];
}

export default queryStats.Component;
