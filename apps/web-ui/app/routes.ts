import { type RouteConfig, route, index } from '@remix-run/route-config';

export default [
  index('routes/_index.tsx'),
  route('overview', 'routes/overview.tsx'),
  route('invocations', 'routes/invocations.tsx'),
] satisfies RouteConfig;
