import type { OverviewDeployment } from './sortDeployments';

export type OverviewDeploymentService = OverviewDeployment['services'][number];

export function sortDeploymentServices(services: OverviewDeploymentService[]) {
  return [...services].sort(
    (a, b) => a.name.localeCompare(b.name) || b.revision - a.revision,
  );
}
