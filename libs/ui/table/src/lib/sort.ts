import type { Key, SortDescriptor } from 'react-aria-components';

type SortDirection = SortDescriptor['direction'];

const DEFAULT_SORT_DIRECTIONS: readonly SortDirection[] = [
  'ascending',
  'descending',
];

export function getNextSortDescriptor(
  current: SortDescriptor | undefined,
  column: Key,
  preferredDirection: SortDirection = 'ascending',
  supportedDirections: readonly SortDirection[] = DEFAULT_SORT_DIRECTIONS,
): SortDescriptor | undefined {
  const directions = supportedDirections.includes(preferredDirection)
    ? [
        preferredDirection,
        ...supportedDirections.filter(
          (direction) => direction !== preferredDirection,
        ),
      ]
    : supportedDirections;
  const currentIndex =
    current?.column === column ? directions.indexOf(current.direction) : -1;
  const nextDirection = directions[currentIndex + 1];

  return nextDirection ? { column, direction: nextDirection } : undefined;
}
