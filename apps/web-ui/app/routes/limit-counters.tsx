import { limitCounters } from '@restate/features/limits-route';

export function meta() {
  return [{ title: 'Restate - Limit counters' }];
}

export default limitCounters.Component;
