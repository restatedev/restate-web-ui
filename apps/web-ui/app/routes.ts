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
  ...prefix('state', [
    index('routes/state.tsx'),
    route(':virtualObject', 'routes/virtual-object.tsx'),
  ]),
  ...prefix('invocations', [
    index('routes/invocations.tsx'),
    route(':id', 'routes/invocation.tsx'),
  ]),
  ...prefix('limits', [
    route('rules', 'routes/limits.tsx'),
    route('rules/:pattern', 'routes/limit-rule.tsx'),
  ]),
  route('features', 'routes/features.tsx'),
  route('feature-flags/:flag', 'routes/feature-flags.tsx'),
] satisfies RouteConfig;
