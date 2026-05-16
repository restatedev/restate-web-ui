import {
  Links,
  Meta,
  Outlet,
  Path,
  Scripts,
  ScrollRestoration,
  useHref,
  useNavigate,
} from 'react-router';
import styles from './tailwind.css?url';
import elementsCssUrl from '@stoplight/elements/elements-web-components.min.scoped.css?url';
import elementsJsUrl from '@stoplight/elements/elements-web-components.min.js?url';
import type { LinksFunction, To } from 'react-router';
import {
  LayoutOutlet,
  LayoutProvider,
  LayoutZone,
  SidebarFooter,
  SidebarHeader,
  SidebarNav,
  useSidebar,
} from '@restate/ui/layout';
import { HoverTooltip } from '@restate/ui/tooltip';
import {
  OverviewSidebarItem,
  InvocationsSidebarItem,
  StateSidebarItem,
  IntrospectionSidebarItem,
} from '@restate/util/sidebar-nav';
import { RouterProvider } from 'react-aria-components';
import { Link } from '@restate/ui/link';
import { Button } from '@restate/ui/button';
import { useCallback } from 'react';
import { QueryProvider } from '@restate/util/react-query';
import { Nav, NavItem } from '@restate/ui/nav';
import { Icon, IconName, Restate } from '@restate/ui/icons';
import { RestateContextProvider } from '@restate/features/restate-context';
import { CodecRuntimeProvider } from '@restate/features/codec';
import { createSystemHealthMonitor } from '@restate/features/system-health';
import { Version } from '@restate/features/version';
import {
  HealthCheckNotification,
  HealthIndicator,
} from '@restate/features/health';
import { Spinner } from '@restate/ui/loading';
import {
  InvocationActions,
  INVOCATION_QUERY_NAME,
  InvocationPanel,
} from '@restate/features/invocation-route';
import { Support } from '@restate/features/support';
import {
  STATE_QUERY_NAME,
  StatePanel,
} from '@restate/features/state-object-route';
import { EditState } from '@restate/features/edit-state';
import { FeatureFlags } from '@restate/util/feature-flag';
import { QueryCache, QueryClient } from '@tanstack/react-query';
import {
  DEPLOYMENT_QUERY_PARAM,
  DeleteDeployment,
} from '@restate/features/deployment';
import { PruneDrainedDeploymentsDialog } from '@restate/features/prune-deployments';
import {
  HANDLER_QUERY_PARAM,
  SERVICE_PLAYGROUND_QUERY_PARAM,
  SERVICE_QUERY_PARAM,
  ServicePlayground,
} from '@restate/features/service';
import { DeploymentDetails } from '@restate/features/deployment-details';
import { EditService, ServiceDetails } from '@restate/features/service-details';
import { GettingStarted } from '@restate/features/getting-started';
import {
  RegisterDeploymentDialog,
  UpdateDeploymentDialog,
} from '@restate/features/register-deployment';
import {
  isVersionQuery,
  queryCacheOnSuccess,
} from '@restate/data-access/admin-api-hooks';
import { createLocalStorageMetaStorage } from '@restate/util/api-config';
import { PortalProvider } from '@restate/ui/portal';
import { BatchOperationsProvider } from '@restate/features/batch-operations';
import { MonacoWarmup } from '@restate/ui/editor';
import { PANEL_QUERY_PARAM } from '@restate/util/panel';

const LAYOUT_MODE: 'appbar' | 'sidebar' = 'sidebar';

if (import.meta.env.DEV) {
  setInterval(() => {
    performance.clearMeasures();
    performance.clearMarks();
  }, 30_000);
}

export const links: LinksFunction = () => [
  // TODO: move to the its own lib
  {
    rel: 'stylesheet',
    href: elementsCssUrl,
  },
  {
    rel: 'stylesheet',
    href: '/ui/font/inter.css',
  },
  {
    rel: 'stylesheet',
    href: '/ui/font/jetbrains.css',
  },
  { rel: 'stylesheet', href: styles },
  {
    rel: 'apple-touch-icon',
    href: '/ui/apple-touch-icon.png',
    sizes: '180x180',
  },
  {
    rel: 'icon',
    type: 'image/png',
    href: '/ui/favicon-32x32.png',
    sizes: '32x32',
  },
  {
    rel: 'icon',
    type: 'image/png',
    href: '/ui/favicon-16x16.png',
    sizes: '16x16',
  },
  { rel: 'manifest', href: '/ui/site.webmanifest' },
  { rel: 'mask-icon', href: '/ui/safari-pinned-tab.svg', color: '#222452' },
];

function useRefWithSupportForAbsolutePath(path: To) {
  const url = useHref(path);

  if (
    path.toString().startsWith('http') ||
    path.toString().startsWith('mailto')
  ) {
    return path.toString();
  }

  return url;
}

const metaStorage = createLocalStorageMetaStorage();
void metaStorage.hydrate();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // With SSR, we usually want to set some default staleTime
      // above 0 to avoid refetching immediately on the client
      staleTime: 5 * 60 * 1000,
      retry: false,
      refetchOnMount: false,
      experimental_prefetchInRender: true,
    },
  },
  queryCache: new QueryCache({
    onSuccess: (data, query) => {
      if (isVersionQuery(data, query)) {
        metaStorage.persist({
          version: data.version,
          features: data.features,
        });
      }
      queryCacheOnSuccess(queryClient, data, query);
    },
  }),
});

const monitor = createSystemHealthMonitor(queryClient);

export function Layout({ children }: { children: React.ReactNode }) {
  const remixNavigate = useNavigate();

  const navigate = useCallback(
    (to: string | Partial<Path>) => {
      const hasSearchParams =
        typeof to === 'string' ? to.includes('?') : Boolean(to.search);
      remixNavigate(to, { preventScrollReset: hasSearchParams });
    },
    [remixNavigate],
  );

  return (
    <html
      lang="en"
      className="h-full scrollbar-gutter-stable overflow-y-scroll bg-gray-100 dark:bg-gray-900"
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="msapplication-TileColor" content="#222452" />
        <meta name="theme-color" content="#f3f4f6"></meta>
        <meta name="version" content={globalThis.env.VERSION} />
        <title>Restate</title>
        <Meta />
        <Links />
      </head>
      <body className="h-full font-sans">
        <RouterProvider
          navigate={navigate}
          useHref={useRefWithSupportForAbsolutePath}
        >
          <LayoutProvider variant={LAYOUT_MODE}>{children}</LayoutProvider>
        </RouterProvider>
        <ScrollRestoration />
        <Scripts />
        {/* TODO: move to its own lib */}
        <script src={elementsJsUrl} async defer></script>
      </body>
    </html>
  );
}

function RestateGettingStarted({ className }: { className?: string }) {
  return (
    <GettingStarted
      className={className}
      left={{
        title: 'AI Agents',
        type: 'Tutorial',
        description:
          'Build stateful, observable AI agents that recover from failures.',
        icon: IconName.AiExample,
        href: 'https://docs.restate.dev/tour/ai-agents',
      }}
      right={{
        title: 'Workflows',
        type: 'Tutorial',
        description:
          'Build resilient workflows with familiar programming patterns.',
        icon: IconName.Workflow,
        href: 'https://docs.restate.dev/tour/workflows',
      }}
      middle={{
        title: 'Getting started',
        description: 'Develop and run your first Restate service',
        icon: IconName.Restate,
        href: 'https://docs.restate.dev/quickstart',
      }}
    />
  );
}
function getCookieValue(name: string) {
  if (typeof document === 'undefined') return undefined;
  const cookies = document.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('='));
  const cookieValue = cookies.find(([key]) => key === name)?.at(1);
  return cookieValue && decodeURIComponent(cookieValue);
}

const PRESERVED_PARAMS = [
  SERVICE_PLAYGROUND_QUERY_PARAM,
  SERVICE_QUERY_PARAM,
  DEPLOYMENT_QUERY_PARAM,
  INVOCATION_QUERY_NAME,
  STATE_QUERY_NAME,
  HANDLER_QUERY_PARAM,
  PANEL_QUERY_PARAM,
];

const SUPPORT_LINKS: { href: string; label: string; icon: IconName }[] = [
  {
    href: 'https://docs.restate.dev/',
    label: 'Documentation',
    icon: IconName.Docs,
  },
  {
    href: 'https://github.com/restatedev/examples',
    label: 'Examples',
    icon: IconName.Example,
  },
  {
    href: 'https://github.com/restatedev/ai-examples',
    label: 'AI Examples',
    icon: IconName.AiExample,
  },
  {
    href: 'https://discord.gg/skW3AZ6uGd',
    label: 'Discord',
    icon: IconName.Discord,
  },
  {
    href: 'https://slack.restate.dev/',
    label: 'Slack',
    icon: IconName.Slack,
  },
  {
    href: 'https://github.com/restatedev/restate/issues/new',
    label: 'Open Github issue',
    icon: IconName.Github,
  },
];

function SidebarHeaderContent() {
  return (
    <>
      <Restate className="shrink-0 transition-[width,height,transform] duration-300 group-data-[collapsed=false]/sidebar:h-[1.5em] group-data-[collapsed=false]/sidebar:w-[1.5em] group-data-[collapsed=false]/sidebar:translate-x-0 group-data-[collapsed=true]/sidebar:h-[1.75em] group-data-[collapsed=true]/sidebar:w-[1.75em] group-data-[collapsed=true]/sidebar:translate-x-[2px] max-xl:h-[1.75em] max-xl:w-[1.75em] max-xl:translate-x-[2px]" />
      <div className="flex max-h-20 max-w-full min-w-0 flex-1 flex-col items-start gap-0 overflow-hidden opacity-100 transition-[max-width,max-height,opacity] duration-300 group-data-[collapsed=false]/sidebar:max-h-20 group-data-[collapsed=false]/sidebar:max-w-full group-data-[collapsed=false]/sidebar:opacity-100 group-data-[collapsed=true]/sidebar:max-h-0 group-data-[collapsed=true]/sidebar:max-w-0 group-data-[collapsed=true]/sidebar:opacity-0 max-xl:max-h-0 max-xl:max-w-0 max-xl:opacity-0">
        <div className="flex h-[1.5em] min-w-0 items-center gap-1.5 self-stretch pl-1">
          <HealthIndicator mini />
          <span className="block min-w-0 flex-auto truncate text-sm font-medium text-gray-700">
            Restate server
          </span>
        </div>
        <div className="-mt-1.5 pl-5">
          <Version />
        </div>
      </div>
      <HealthCheckNotification />
    </>
  );
}

function SidebarFooterContent() {
  const { isCollapsed } = useSidebar();
  return (
    <div className="flex flex-col gap-0.5">
      {SUPPORT_LINKS.map((item) => (
        <HoverTooltip
          key={item.href}
          content={item.label}
          placement="right"
          disabled={!isCollapsed}
          offset={12}
        >
          <Link
            href={item.href}
            preserveQueryParams={false}
            target="_blank"
            rel="noreferrer noopener"
            className="flex w-full items-center gap-2 rounded-xl border border-transparent p-0.5 text-0.5xs text-gray-500 no-underline outline-offset-2 outline-blue-600 transition-all duration-300 hover:bg-black/3 hover:text-gray-700 focus-visible:outline-2 group-data-[collapsed=false]/sidebar:w-full group-data-[collapsed=false]/sidebar:translate-x-0 group-data-[collapsed=false]/sidebar:gap-2 group-data-[collapsed=true]/sidebar:w-fit group-data-[collapsed=true]/sidebar:translate-x-[5px] group-data-[collapsed=true]/sidebar:gap-0 max-xl:w-fit max-xl:translate-x-[5px] max-xl:gap-0"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
              <Icon
                name={item.icon}
                className="h-4.5 w-4.5 shrink-0 text-zinc-400"
              />
            </span>
            <span className="max-w-full min-w-0 flex-auto truncate overflow-hidden pr-1 text-left opacity-100 transition-[max-width,opacity,padding] duration-300 group-data-[collapsed=false]/sidebar:max-w-full group-data-[collapsed=false]/sidebar:pr-1 group-data-[collapsed=false]/sidebar:opacity-100 group-data-[collapsed=true]/sidebar:max-w-0 group-data-[collapsed=true]/sidebar:pr-0 group-data-[collapsed=true]/sidebar:opacity-0 max-xl:max-w-0 max-xl:pr-0 max-xl:opacity-0">
              {item.label}
            </span>
          </Link>
        </HoverTooltip>
      ))}
    </div>
  );
}

function SidebarPanels() {
  return (
    <>
      <SidebarHeader>
        <SidebarHeaderContent />
      </SidebarHeader>
      <SidebarNav>
        <OverviewSidebarItem preserveSearchParams={PRESERVED_PARAMS} />
        <InvocationsSidebarItem preserveSearchParams={PRESERVED_PARAMS} />
        <StateSidebarItem preserveSearchParams={PRESERVED_PARAMS} />
        <IntrospectionSidebarItem preserveSearchParams={PRESERVED_PARAMS} />
      </SidebarNav>
      <SidebarFooter>
        <SidebarFooterContent />
      </SidebarFooter>
    </>
  );
}

function TopbarPanels() {
  return (
    <>
      <LayoutOutlet zone={LayoutZone.AppBar}>
        <div className="flex min-w-0 flex-1 items-stretch gap-1">
          <div className="border1 bg1-white shadow2-xs flex h-full items-center gap-2 rounded-xl p-3 pr-0">
            <Restate />
          </div>
          <Button
            variant="secondary"
            className="my-1 flex min-w-0 items-center gap-2 border-none bg-transparent px-2 shadow-none"
          >
            <div className="flex w-full items-center gap-2 truncate">
              <HealthIndicator mini className="-mt-0.5" />
              <HealthCheckNotification />
              <span className="block min-w-0 flex-auto truncate">
                Restate server
              </span>
              <Version />
            </div>
          </Button>
          <LayoutOutlet zone={LayoutZone.Nav}>
            <Nav ariaCurrentValue="page">
              <NavItem
                preserveSearchParams={PRESERVED_PARAMS}
                href={'/overview'}
              >
                Overview
              </NavItem>
              <NavItem
                preserveSearchParams={PRESERVED_PARAMS}
                href={'/invocations'}
              >
                Invocations
              </NavItem>
              <NavItem preserveSearchParams={PRESERVED_PARAMS} href={'/state'}>
                State
              </NavItem>
              <NavItem
                preserveSearchParams={PRESERVED_PARAMS}
                href={'/introspection'}
              >
                Introspection
              </NavItem>
            </Nav>
          </LayoutOutlet>
        </div>
      </LayoutOutlet>
      {LAYOUT_MODE === 'appbar' && <Support />}
    </>
  );
}

export default function App() {
  return (
    <FeatureFlags>
      <QueryProvider queryClient={queryClient}>
        <PortalProvider>
          <RestateContextProvider
            adminBaseUrl={getCookieValue('adminBaseUrl')}
            GettingStarted={RestateGettingStarted}
            systemHealthMonitor={monitor}
            queryHealthCheckEnabled
          >
            <CodecRuntimeProvider>
              <BatchOperationsProvider>
                <EditState>
                  <LayoutOutlet zone={LayoutZone.Content}>
                    <Outlet />
                  </LayoutOutlet>
                  <SidebarPanels />
                  <TopbarPanels />
                  <DeploymentDetails />
                  <ServiceDetails />
                  <DeleteDeployment />
                  <ServicePlayground />
                  <InvocationPanel />
                  <StatePanel />
                  <EditService />
                  <InvocationActions />
                  <PruneDrainedDeploymentsDialog />
                  <RegisterDeploymentDialog />
                  <UpdateDeploymentDialog />
                  <MonacoWarmup />
                </EditState>
              </BatchOperationsProvider>
            </CodecRuntimeProvider>
          </RestateContextProvider>
        </PortalProvider>
      </QueryProvider>
    </FeatureFlags>
  );
}

// TODO: implement proper loader
export function HydrateFallback() {
  return (
    <p className="flex items-center gap-2 px-8">
      <Spinner />
      Loading...
    </p>
  );
}
