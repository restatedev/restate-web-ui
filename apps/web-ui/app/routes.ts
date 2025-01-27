import {
  type RouteConfig,
  route,
  index,
  prefix,
} from '@react-router/dev/routes';

export default [
  index('routes/_index.tsx'),
  route('overview', 'routes/overview.tsx'),
  route('invocations', 'routes/invocations.tsx'),
  ...prefix('state', [
    index('routes/state.tsx'),
    route(':virtualObject', 'routes/virtual-object.tsx'),
  ]),
] satisfies RouteConfig;
