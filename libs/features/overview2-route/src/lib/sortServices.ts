import type { Service } from '@restate/data-access/admin-api-spec';
import type { SortDescriptor } from 'react-aria-components';
import {
  issuesSortScore,
  type ServiceIssue,
} from '@restate/features/system-health';

export function sortServices(
  services: Service[],
  descriptor: SortDescriptor,
  invocationCounts?: Map<string, number>,
  serviceIssuesMap?: Map<string, ServiceIssue[]>,
): Service[] {
  const { column, direction } = descriptor;
  const modifier = direction === 'descending' ? -1 : 1;
  return [...services].sort((a, b) => {
    switch (column) {
      case 'name':
        return modifier * a.name.localeCompare(b.name);
      case 'ty':
        return modifier * a.ty.localeCompare(b.ty);
      case 'revision':
        return modifier * (a.revision - b.revision);
      case 'invocations':
        return (
          modifier *
          ((invocationCounts?.get(a.name) ?? 0) -
            (invocationCounts?.get(b.name) ?? 0))
        );
      case 'health':
        return (
          modifier *
          (issuesSortScore(serviceIssuesMap?.get(a.name) ?? []) -
            issuesSortScore(serviceIssuesMap?.get(b.name) ?? []))
        );
      default:
        return 0;
    }
  });
}
