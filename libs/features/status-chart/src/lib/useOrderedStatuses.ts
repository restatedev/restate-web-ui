import { STATUS_STYLE, DEFAULT_STYLE } from './constants';

export type StatusEntry = {
  name: string;
  label?: string;
  statuses?: string[];
  count: number;
};

export function getOrderedStatuses(byStatus: StatusEntry[]) {
  return byStatus
    .filter((entry) => entry.count > 0)
    .map((entry) => ({
      ...entry,
      ...(STATUS_STYLE[entry.name] ?? DEFAULT_STYLE),
    }));
}
