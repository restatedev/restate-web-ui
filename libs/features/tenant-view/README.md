# Tenant invocation viewer

Import the tenant UI from `@restate/features/tenant-view`.

```tsx
import { TenantSidebar, TenantView } from '@restate/features/tenant-view';
import { RestateContextProvider } from '@restate/features/restate-context';

const baseUrl = `/tenants/${encodeURIComponent(scope)}`;

<RestateContextProvider
  adminBaseUrl={adminBaseUrl}
  ingressUrl={ingressUrl}
  baseUrl={baseUrl}
>
  <TenantSidebar scope={scope} header={header} />
  <TenantView scope={scope} invocationId={id} />
</RestateContextProvider>;
```

`TenantView` renders the list when `invocationId` is omitted, and the journal
when it is supplied. `TenantInvocations` and `TenantInvocation` are also
exported for hosts that register separate route components. The host supplies
`baseUrl` through its existing `RestateContextProvider`; tenant components
read that context directly. No nested URL provider is needed.

Mount the list at `${baseUrl}/invocations` and details at
`${baseUrl}/invocations/:id`. Resolve the scope and invocation ID from the
route parameters. `baseUrl` excludes any React Router basename.

Use a tenant layout with the existing React Router, React Query,
RestateContextProvider, and codec runtime setup. `TenantSidebar` uses the
shared layout's sidebar slots and accepts an optional header. No web-ui
client loader is required by this library.

The Service filter matches an exact service name. `service` and `status`
query parameters survive navigation back from a journal. The list and scoped
status chart refresh manually; journals retain live updates and payload
inspection. Both pages include the shared invocation action menus and confirmation
dialogs, with actions available according to invocation status and server version.
The list supports row selection and batch Cancel, Pause, Resume, Retry now,
Restart as new, Kill, and Purge using the shared `InvocationBatchActions` menu and batch confirmation dialogs.
With no selection, batch actions apply to all matches using the tenant scope
and active service/status filters. Selection resets when those filters change.
The list also shows Modified at beside Created at. Hosts do not need to mount
additional invocation dialogs. The shared status header, breadcrumb, Lifecycle card, and journal
keep the main app's styling. Targets hide scope badges and administrative
links within tenant mode.

Scope is sent as an ordinary filter in the invocation list and status summary
request bodies. Journal and payload requests use invocation IDs normally.
The tenant pages install `ServiceTargetProvider` with `TenantServiceTarget`,
which omits scope and service links everywhere, including journal entries
and popovers. The main app keeps the default renderer. Journal introspection
is hidden with `showIntrospection={false}`. Invocation links use the standard
app query handling. The host controls authentication and permissions.

Preview at `http://localhost:4300/ui/tenants/workflows/invocations`,
replacing `workflows` with an existing scope. The standalone web-ui route uses
this library and the dev server's configured Restate connection.
