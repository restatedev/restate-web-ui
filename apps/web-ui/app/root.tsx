import {
  Links,
  Meta,
  Outlet,
  Path,
  Scripts,
  ScrollRestoration,
  useHref,
  useMatch,
  useNavigate,
} from 'react-router';
import styles from './tailwind.css?url';
import type { LinksFunction, NavigateOptions, To } from 'react-router';
import {
  LayoutOutlet,
  LayoutProvider,
  LayoutZone,
  SidebarFooter,
  SidebarHeader,
  SidebarNav,
  useSidebar,
} from '@restate/ui-layout';
import { HoverTooltip } from '@restate/ui-tooltip';
import {
  THEME_SCRIPT,
  ThemeSwitch,
  useThemePreference,
} from '@restate/features-theme';
import { tv } from '@restate/util-styles';
import {
  OverviewSidebarItem,
  InvocationsSidebarItem,
  WorkflowsSidebarItem,
  VirtualObjectsSidebarItem,
  StateSidebarItem,
  LimitsSidebarItem,
  IntrospectionSidebarItem,
} from '@restate/util-sidebar-nav';
import { RouterProvider } from 'react-aria-components';
import { Link } from '@restate/ui-link';
import { Button } from '@restate/ui-button';
import { useCallback } from 'react';
import { QueryProvider } from '@restate/util-react-query';
import { Nav, NavItem } from '@restate/ui-nav';
import { BreadcrumbsProvider } from '@restate/features-breadcrumbs';
import { Icon, IconName, Restate } from '@restate/ui-icons';
import { RestateContextProvider } from '@restate/features-restate-context';
import { CodecRuntimeProvider } from '@restate/features-codec';
import { createSystemHealthMonitor } from '@restate/features-system-health';
import { Version } from '@restate/features-version';
import {
  HealthCheckNotification,
  HealthIndicator,
} from '@restate/features-health';
import { Spinner } from '@restate/ui-loading';
import { InvocationActions } from '@restate/features-invocation-route';
import { Support } from '@restate/features-support';
import { EditState } from '@restate/features-edit-state';
import { FeatureFlags } from '@restate/util-feature-flag';
import { QueryCache, QueryClient } from '@tanstack/react-query';
import { DeleteDeployment } from '@restate/features-deployment';
import { ServicePlayground } from '@restate/features-service';
import { EditService } from '@restate/features-service-details';
import { GettingStarted } from '@restate/features-getting-started';
import {
  RegisterDeploymentDialog,
  UpdateDeploymentDialog,
} from '@restate/features-register-deployment';
import { queryCacheOnSuccess } from '@restate/data-access-admin-api-hooks';
import {
  setMetaFallback,
  setMetaPersister,
} from '@restate/data-access-admin-api';
import { setQueryClient } from '@restate/util-react-query';
import { experimental_createQueryPersister } from '@tanstack/react-query-persist-client';
import { PortalProvider } from '@restate/ui-portal';
import { BatchOperationsProvider } from '@restate/features-batch-operations';
import { CreateRuleDialog } from '@restate/features-vqueue-ui';
import {
  CommandPaletteProvider,
  CommandPaletteTrigger,
} from '@restate/features-command-palette';
import { MonacoWarmup } from '@restate/ui-editor';
import { elementsCssUrl, elementsJsUrl } from '@restate/ui-api/assets';
import { PRESERVED_QUERY_PARAMS } from '@restate/util-panel';
import { TenantPreview } from './TenantPreview';

const LAYOUT_MODE: 'appbar' | 'sidebar' = 'sidebar';

if (import.meta.env.DEV) {
  setInterval(() => {
    performance.clearMeasures();
    performance.clearMarks();
  }, 30_000);
}

export const links: LinksFunction = () => [
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // With SSR, we usually want to set some default staleTime
      // above 0 to avoid refetching immediately on the client
      staleTime: 5 * 60 * 1000,
      retry: false,
      refetchOnMount: false,
    },
  },
  queryCache: new QueryCache({
    onSuccess: (data, query) => {
      queryCacheOnSuccess(queryClient, data, query);
    },
  }),
});

// Expose the queryClient cross-lib so the admin-api middleware (and
// other non-React call sites like the codec fetcher) can read auth +
// meta straight from the cache without any DI ceremony.
setQueryClient(queryClient);

// Initial fallback for the meta cache slot. Web-ui only ever talks to
// the latest Restate, so we optimistically assume the freshest
// response shape via `'9999999.0.0'`. Multi-tenant cloud hosts will
// set their own (typically `'0.0.0'`). See `metaQueryOptions` —
// `initialData` + `initialDataUpdatedAt: 0` means this is returned on
// the very first read but `/version` still fetches once to replace it.
setMetaFallback({ version: '9999999.0.0' });

// Cross-session warm-up: persist the meta cache (`['meta', baseUrl]`)
// to `localStorage` via TanStack's `experimental_createPersister`. On
// subsequent loads, the cache entry is restored before the first read
// so `useFeatures` / `useVersion` / `/query/*` middleware get
// last-session values immediately and the background `/version` fetch
// just confirms/refreshes them.
setMetaPersister(
  experimental_createQueryPersister({
    storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    prefix: 'restate-meta',
    refetchOnRestore: 'always',
  }).persisterFn,
);

const monitor = createSystemHealthMonitor(queryClient);

export function Layout({ children }: { children: React.ReactNode }) {
  const remixNavigate = useNavigate();

  const navigate = useCallback(
    (to: string | Partial<Path>, options?: NavigateOptions) => {
      const hasSearchParams =
        typeof to === 'string' ? to.includes('?') : Boolean(to.search);
      remixNavigate(to, { preventScrollReset: hasSearchParams, ...options });
    },
    [remixNavigate],
  );

  useThemePreference();

  return (
    <html
      lang="en"
      className="h-full scrollbar-gutter-stable overflow-y-scroll bg-canvas"
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
        <meta name="msapplication-TileColor" content="#222452" />
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
          <span className="block min-w-0 flex-auto truncate text-sm font-medium text-secondary">
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

const footerItemStyles = tv({
  slots: {
    item: 'flex w-full items-center gap-2 rounded-xl border border-transparent p-0.5 text-0.5xs text-muted no-underline outline-offset-2 outline-focus transition-all duration-300 group-data-[collapsed=false]/sidebar:w-full group-data-[collapsed=false]/sidebar:translate-x-0 group-data-[collapsed=false]/sidebar:gap-2 group-data-[collapsed=true]/sidebar:w-fit group-data-[collapsed=true]/sidebar:translate-x-[5px] group-data-[collapsed=true]/sidebar:gap-0 hover:bg-tint-subtle hover:text-secondary focus-visible:outline-2 max-xl:w-fit max-xl:translate-x-[5px] max-xl:gap-0',
    iconBox: 'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
    icon: 'h-4.5 w-4.5 shrink-0 text-subtle',
    label:
      'max-w-full min-w-0 flex-auto truncate overflow-hidden pr-1 text-left opacity-100 transition-[max-width,opacity,padding] duration-300 group-data-[collapsed=false]/sidebar:max-w-full group-data-[collapsed=false]/sidebar:pr-1 group-data-[collapsed=false]/sidebar:opacity-100 group-data-[collapsed=true]/sidebar:max-w-0 group-data-[collapsed=true]/sidebar:pr-0 group-data-[collapsed=true]/sidebar:opacity-0 max-xl:max-w-0 max-xl:pr-0 max-xl:opacity-0',
  },
})();

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
            className={footerItemStyles.item()}
          >
            <span className={footerItemStyles.iconBox()}>
              <Icon name={item.icon} className={footerItemStyles.icon()} />
            </span>
            <span className={footerItemStyles.label()}>{item.label}</span>
          </Link>
        </HoverTooltip>
      ))}
      <HoverTooltip
        content="Theme"
        placement="right"
        disabled={!isCollapsed}
        offset={12}
      >
        <ThemeSwitch
          className={footerItemStyles.item({ className: 'cursor-default' })}
        >
          {({ icon, label }) => (
            <>
              <span className={footerItemStyles.iconBox()}>
                <Icon name={icon} className={footerItemStyles.icon()} />
              </span>
              <span className={footerItemStyles.label()}>Theme: {label}</span>
            </>
          )}
        </ThemeSwitch>
      </HoverTooltip>
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
        <CommandPaletteTrigger />
        <OverviewSidebarItem preserveSearchParams={PRESERVED_QUERY_PARAMS} />
        <InvocationsSidebarItem preserveSearchParams={PRESERVED_QUERY_PARAMS} />
        <WorkflowsSidebarItem preserveSearchParams={PRESERVED_QUERY_PARAMS} />
        <VirtualObjectsSidebarItem
          preserveSearchParams={PRESERVED_QUERY_PARAMS}
        />
        <StateSidebarItem preserveSearchParams={PRESERVED_QUERY_PARAMS} />
        <LimitsSidebarItem preserveSearchParams={PRESERVED_QUERY_PARAMS} />
        <IntrospectionSidebarItem
          preserveSearchParams={PRESERVED_QUERY_PARAMS}
        />
      </SidebarNav>
      <SidebarFooter>
        <SidebarFooterContent />
      </SidebarFooter>
    </>
  );
}

function TopbarPanels() {
  const navItems = [
    { href: '/overview', label: 'Overview' },
    { href: '/invocations', label: 'Invocations' },
    { href: '/workflows', label: 'Workflows' },
    { href: '/virtual-objects', label: 'Virtual Objects' },
    { href: '/state', label: 'State' },
    { href: '/flow-control/rules', label: 'Flow control' },
    { href: '/introspection', label: 'Introspection' },
  ];

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
              {navItems.map(({ href, label }) => (
                <NavItem
                  key={href}
                  preserveSearchParams={PRESERVED_QUERY_PARAMS}
                  href={href}
                >
                  {label}
                </NavItem>
              ))}
            </Nav>
          </LayoutOutlet>
        </div>
      </LayoutOutlet>
      {LAYOUT_MODE === 'appbar' && <Support />}
    </>
  );
}

function AppContent() {
  // Tenant view uses a separate shell and URL prefix for shared invocation links.
  const tenantMatch = useMatch('/tenants/:scope/*');

  return (
    <QueryProvider queryClient={queryClient}>
      <PortalProvider>
        <RestateContextProvider
          adminBaseUrl={getCookieValue('adminBaseUrl')}
          schemaRegistryUrl={getCookieValue('schemaRegistryUrl')}
          ingressMuxUrl={getCookieValue('ingressMuxUrl')}
          baseUrl={
            tenantMatch
              ? `/tenants/${encodeURIComponent(tenantMatch.params.scope ?? '')}`
              : ''
          }
          GettingStarted={RestateGettingStarted}
          systemHealthMonitor={monitor}
          queryHealthCheckEnabled
        >
          <CodecRuntimeProvider>
            {/* Tenant view reuses the normal server header, API and codecs, without admin panels. */}
            {tenantMatch ? (
              <TenantPreview
                scope={tenantMatch.params.scope ?? ''}
                header={<SidebarHeaderContent />}
              />
            ) : (
              <BatchOperationsProvider>
                <EditState>
                  <CommandPaletteProvider>
                    <BreadcrumbsProvider>
                      <LayoutOutlet zone={LayoutZone.Content}>
                        <Outlet />
                      </LayoutOutlet>
                    </BreadcrumbsProvider>
                    <SidebarPanels />
                    <TopbarPanels />
                    <DeleteDeployment />
                    <ServicePlayground />
                    <EditService />
                    <InvocationActions />
                    <RegisterDeploymentDialog />
                    <UpdateDeploymentDialog />
                    <CreateRuleDialog />
                    <MonacoWarmup />
                  </CommandPaletteProvider>
                </EditState>
              </BatchOperationsProvider>
            )}
          </CodecRuntimeProvider>
        </RestateContextProvider>
      </PortalProvider>
    </QueryProvider>
  );
}

export default function App() {
  return (
    <FeatureFlags>
      <AppContent />
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
