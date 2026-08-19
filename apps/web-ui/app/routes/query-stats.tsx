import { queryStats } from '@restate/features/query-stats-route';

export function meta() {
  return [{ title: 'Restate - Query inspector' }];
}

export default queryStats.Component;
