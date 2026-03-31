import { STATUS_ORDER, STATUS_STYLE, DEFAULT_STYLE } from './constants';

export type StatusEntry = { name: string; count: number };

export function getOrderedStatuses(byStatus: StatusEntry[]) {
  const map = new Map(byStatus.map((s) => [s.name, s.count]));
  return STATUS_ORDER.filter((name) => (map.get(name) ?? 0) > 0).map(
    (name) => ({
      name,
      count: map.get(name) ?? 0,
      ...(STATUS_STYLE[name] ?? DEFAULT_STYLE),
    }),
  );
}
