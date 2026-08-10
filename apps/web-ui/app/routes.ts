import {
  type RouteConfig,
  route,
  index,
  prefix,
} from '@react-router/dev/routes';

export default [
  index('routes/_index.tsx'),
  route('overview', 'routes/overview.tsx'),
  route('overview2', 'routes/overview2.tsx'),
  route('introspection', 'routes/introspection.tsx'),
  ...prefix('virtual-objects', [
    index('routes/virtual-objects.tsx'),
    route(':service/:key', 'routes/virtual-object-instance.tsx'),
  ]),
  ...prefix('workflows', [
    index('routes/workflows.tsx'),
    route(':service/:workflowId', 'routes/workflow-run.tsx'),
  ]),
  ...prefix('state', [
    index('routes/state.tsx'),
    route(':virtualObject', 'routes/virtual-object.tsx'),
  ]),
  ...prefix('invocations', [
    index('routes/invocations.tsx'),
    route(':id', 'routes/invocation.tsx'),
  ]),
  route('flow-control/rules', 'routes/limits.tsx'),
  route('features', 'routes/features.tsx'),
  route('feature-flags/:flag', 'routes/feature-flags.tsx'),
] satisfies RouteConfig;
