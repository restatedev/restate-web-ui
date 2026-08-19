// Turns a recorded page key ("/ui/invocations/:id · dialog:batch-retry-now")
// into user-facing wording ("Invocation details · Retry now dialog"). Path
// matching is suffix-based so host base paths (web-ui's /ui, cloud's
// environment prefixes) don't matter.
const PAGE_TITLES: [RegExp, string][] = [
  [/\/invocations\/[^/]+$/, 'Invocation details'],
  [/\/invocations$/, 'Invocations'],
  [/\/flow-control\/vqueues\/[^/]+$/, 'VQueue details'],
  [/\/flow-control\/vqueues$/, 'VQueues'],
  [/\/flow-control\/counters$/, 'Limit counters'],
  [/\/flow-control\/rules$/, 'Rules'],
  [/\/workflows\/[^/]+\/[^/]+$/, 'Workflow run'],
  [/\/workflows$/, 'Workflows'],
  [/\/virtual-objects\/[^/]+\/[^/]+$/, 'Virtual Object instance'],
  [/\/virtual-objects$/, 'Virtual Objects'],
  [/\/state\/[^/]+$/, 'Service state'],
  [/\/state$/, 'State'],
  [/\/overview2?$/, 'Overview'],
  [/\/introspection$/, 'Introspection'],
  [/\/query-stats$/, 'Query inspector'],
  [/\/features$/, 'Features'],
  [/^\/$/, 'Overview'],
];

const SURFACE_NAMES: Record<string, string> = {
  servicePlayground: 'Playground',
};

function humanizeSurfaceName(token: string): string {
  const spaced = token
    .replace(/^batch-/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll(/[-_]/g, ' ')
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatPageLabel(pageKey: string): string {
  const [path = '', ...surfaces] = pageKey.split(' · ');
  const title =
    PAGE_TITLES.find(([pattern]) => pattern.test(path))?.[1] ?? path;
  const surfaceLabels = surfaces.map((surface) => {
    const [kind, name] = surface.split(':');
    if (!name) {
      return 'Dialog';
    }
    return `${SURFACE_NAMES[name] ?? humanizeSurfaceName(name)} ${kind}`;
  });
  return [title, ...surfaceLabels].join(' · ');
}
