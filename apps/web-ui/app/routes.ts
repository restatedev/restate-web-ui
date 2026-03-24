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
] satisfies RouteConfig;
