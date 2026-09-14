# Tenant invocation viewer

Import the tenant UI from `@restate/features/tenant-view`.

```tsx
import { TenantSidebar, TenantView } from '@restate/features/tenant-view';
import { RestateContextProvider } from '@restate/features/restate-context';

const baseUrl = `/tenant-view/${accountId}/${environmentId}/${scope}`;

<RestateContextProvider
  adminBaseUrl={adminBaseUrl}
  ingressUrl={ingressUrl}
  baseUrl={baseUrl}
>
  <TenantSidebar scope={scope} header={cloudAccountAndEnvironmentSwitchers} />
  <TenantView scope={scope} invocationId={id} />
</RestateContextProvider>;
```

`TenantView` renders the list when `invocationId` is omitted, and the journal
when it is supplied. `TenantInvocations` and `TenantInvocation` are also
exported for hosts that register separate route components. The host supplies
`baseUrl` through its existing `RestateContextProvider`; tenant components
read that context directly. No nested URL provider is needed.

Mount the list at `${baseUrl}/invocations` and details at
`${baseUrl}/invocations/:id`. Cloud resolves the account, environment, scope,
and invocation ID from its route parameters. `baseUrl` excludes any React
Router basename.

Cloud should register these routes under a separate tenant layout, outside
the normal environment sidebar layout. Reuse its existing authentication,
React Router, React Query, RestateContextProvider, and codec runtime setup.
`TenantSidebar` uses the shared layout's sidebar slots and accepts an optional
header for the existing Cloud account/environment switchers. Their links can
continue pointing to `/accounts/...`. Cloud retains its account menu and
owns the route registration and content outlet. No web-ui client loader is
required by this library.

The Service filter matches an exact service name. `service` and `status`
query parameters survive navigation back from a journal. The list and scoped
status chart refresh manually; journals retain live updates and payload
inspection. The shared status header, breadcrumb, Lifecycle card, and journal
keep the main app's styling. Targets hide scope badges and administrative
links within tenant mode.

Scope is sent as an ordinary filter in the invocation list and status summary
request bodies. Journal and payload requests use invocation IDs normally.
The tenant pages install `ServiceTargetProvider` with `TenantServiceTarget`,
which omits scope and service links everywhere, including journal entries
and popovers. The main app keeps the default renderer. Journal introspection
is hidden with `showIntrospection={false}`. Invocation links use the standard
app query handling. This demo uses existing Cloud permissions.

Preview at `http://localhost:4300/ui/tenant-view/workflows/invocations`,
replacing `workflows` with an existing scope. The standalone web-ui route uses
this library and the dev server's configured Restate connection.
