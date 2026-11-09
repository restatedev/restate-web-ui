import {
  Fragment,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Badge } from '@restate/ui-badge';
import { ErrorBanner } from '@restate/ui-error';
import { Switch } from '@restate/ui-form-field';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { MarkdownDescription } from '@restate/ui-json-schema';
import { Spinner } from '@restate/ui-loading';
import { useRestateContext } from '@restate/features-restate-context';
import { tv } from '@restate/util-styles';
import {
  findOperation,
  type ContractHandler,
  type ContractInvocationTool,
  type ContractOperation,
  type HandlerMode,
  type InvocationToolKind,
  type RestateHandlerKind,
  type ServiceContract,
} from '@restate/util-openapi';
import { InfoButton } from './InfoButton';
import {
  operationKey,
  toolDraftName,
  toolId,
  type InvocationLookup,
} from './names';
import { OperationDocs } from './OperationDocs';
import { Method } from './RequestLine';
import { SegmentedControl } from './SegmentedControl';
import { TryIt } from './TryIt';
import { usePlaygroundFetcher } from './usePlaygroundFetcher';
import { useServiceContract } from './useServiceContract';

const LEGACY_OPERATION_HASH = '#/operations/';

type BaseMode = 'call' | 'send' | 'attach' | 'output';

const MODE_OPTIONS: Record<BaseMode, { label: string; description: string }> = {
  call: { label: 'Call', description: 'Waits for the result' },
  send: { label: 'Send', description: 'Returns the invocation ID' },
  attach: { label: 'Attach', description: 'Waits for an earlier call' },
  output: { label: 'Get output', description: 'Result of an earlier call' },
};

const KIND_LABEL: Record<RestateHandlerKind, string> = {
  Shared: 'shared',
  Exclusive: 'exclusive',
  Workflow: 'workflow',
};

function baseMode(mode: HandlerMode): BaseMode {
  if (mode === 'scopedCall') return 'call';
  if (mode === 'scopedSend') return 'send';
  return mode;
}

function withScope(mode: BaseMode, scoped: boolean): HandlerMode {
  if (!scoped) return mode;
  if (mode === 'call') return 'scopedCall';
  if (mode === 'send') return 'scopedSend';
  return mode;
}

function defaultMode(handler: ContractHandler): HandlerMode {
  return (Object.keys(handler.modes)[0] as HandlerMode | undefined) ?? 'call';
}

function readLegacyOperationId() {
  if (
    typeof window === 'undefined' ||
    !window.location.hash.startsWith(LEGACY_OPERATION_HASH)
  ) {
    return undefined;
  }
  const raw =
    window.location.hash.slice(LEGACY_OPERATION_HASH.length).split('#')[0] ??
    '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function Metadata({ extensions }: { extensions: Record<string, string> }) {
  const entries = Object.entries(extensions);
  if (entries.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([key, value]) => (
        <Badge key={key} size="xs">
          <span className="text-muted">{key}</span>
          <span className="ml-1 font-mono text-secondary">{value}</span>
        </Badge>
      ))}
    </div>
  );
}

const headingStyles = tv({
  base: 'min-w-0 text-lg font-semibold break-all text-primary',
  variants: { isCode: { true: 'font-mono' } },
});

function ViewHeader({
  title,
  isCode = false,
  badges,
  description,
}: {
  title: string;
  isCode?: boolean;
  badges?: ReactNode;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 className={headingStyles({ isCode })}>{title}</h2>
        {badges}
      </div>
      {description && (
        <MarkdownDescription className="text-sm" collapsible>
          {description}
        </MarkdownDescription>
      )}
    </div>
  );
}

const COLUMNS =
  'grid min-w-0 grid-cols-1 gap-8 @5xl/playground:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]';

function ScopeSwitch({
  isSelected,
  onChange,
}: {
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
}) {
  const { baseUrl } = useRestateContext();
  return (
    <div className="flex items-center gap-1 text-0.5xs text-secondary">
      <Switch
        isSelected={isSelected}
        onChange={onChange}
        className="text-0.5xs"
      >
        Flow control
      </Switch>
      <InfoButton label="Flow control">
        <p className="text-muted">
          Runs the invocation in a scope, so the cluster’s flow control rules
          apply to it, such as concurrency limits per scope. Use one scope per
          tenant, for example. An optional limit key narrows the rules further.
        </p>
        <div className="flex gap-3">
          <Link
            href={`${baseUrl}/flow-control/rules`}
            target="_blank"
            rel="noopener noreferrer"
          >
            See the rules
          </Link>
          <Link
            href="https://docs.restate.dev/services/flow-control"
            target="_blank"
            rel="noopener noreferrer"
          >
            Docs
          </Link>
        </div>
      </InfoButton>
    </div>
  );
}

function HandlerView({
  service,
  contract,
  handler,
  mode,
  onModeChange,
  ingressUrl,
  handlerKind,
  serviceType,
}: {
  service: string;
  contract: ServiceContract;
  handler: ContractHandler;
  mode: HandlerMode;
  onModeChange: (mode: HandlerMode) => void;
  ingressUrl: string;
  handlerKind?: RestateHandlerKind;
  serviceType?: ReturnType<typeof useServiceContract>['serviceType'];
}) {
  const fetcher = usePlaygroundFetcher(service, handler.name);
  const operation = handler.modes[mode] ?? handler.modes[defaultMode(handler)];
  const currentMode = handler.modes[mode] ? mode : defaultMode(handler);
  const base = baseMode(currentMode);
  const isScoped = currentMode === 'scopedCall' || currentMode === 'scopedSend';
  const baseModes = (['call', 'send', 'attach', 'output'] as const).filter(
    (candidate) => handler.modes[candidate],
  );
  const canScope =
    (base === 'call' && Boolean(handler.modes.scopedCall)) ||
    (base === 'send' && Boolean(handler.modes.scopedSend));

  if (!operation) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ViewHeader
        title={handler.name}
        isCode
        description={handler.description}
        badges={
          <>
            {handlerKind && <Badge size="xs">{KIND_LABEL[handlerKind]}</Badge>}
            {operation.deprecated && (
              <Badge size="xs" variant="warning">
                deprecated
              </Badge>
            )}
            <Metadata extensions={handler.extensions} />
          </>
        }
      />
      <div className={COLUMNS}>
        <TryIt
          service={service}
          contract={contract}
          operation={operation}
          ingressUrl={ingressUrl}
          fetcher={fetcher}
          handlerName={handler.name}
          handlerKind={handlerKind}
          serviceType={serviceType}
          mode={currentMode}
          runLabel={MODE_OPTIONS[base].label}
          toolbar={
            (baseModes.length > 1 || canScope) && (
              <>
                {baseModes.length > 1 && (
                  <SegmentedControl
                    label="How to invoke"
                    options={baseModes.map((value) => ({
                      value,
                      ...MODE_OPTIONS[value],
                    }))}
                    value={base}
                    onChange={(next) => onModeChange(withScope(next, isScoped))}
                  />
                )}
                {canScope && (
                  <div className="ml-auto">
                    <ScopeSwitch
                      isSelected={isScoped}
                      onChange={(scoped) =>
                        onModeChange(withScope(base, scoped))
                      }
                    />
                  </div>
                )}
              </>
            )
          }
        />
        <OperationDocs operation={operation} root={contract.document} />
      </div>
    </div>
  );
}

const TOOL_LABEL: Record<InvocationToolKind, string> = {
  attach: 'Attach to invocation',
  output: 'Get invocation output',
  status: 'Get invocation status',
};

const TOOL_RUN_LABEL: Record<InvocationToolKind, string> = {
  attach: 'Attach',
  output: 'Get output',
  status: 'Get status',
};

const LOOKUP_OPTIONS = [
  {
    value: 'byId' as const,
    label: 'By ID',
    description: 'Invocation ID',
  },
  {
    value: 'byTarget' as const,
    label: 'By target',
    description: 'Idempotency key or workflow ID',
  },
];

function toolLabel(tool: ContractInvocationTool) {
  return (
    (tool.byId ?? tool.byTarget)?.summary?.replace(
      /\s+by\s+(id|target)$/i,
      '',
    ) ?? TOOL_LABEL[tool.kind]
  );
}

function toolGroups(contract: ServiceContract) {
  return contract.invocationTools.length > 0
    ? [{ name: 'Invocations', tools: contract.invocationTools }]
    : [];
}

function operationLabel(operation: ContractOperation) {
  return operation.summary ?? `${operation.method} ${operation.path}`;
}

function ToolView({
  service,
  contract,
  tool,
  defaultLookup = 'byId',
  ingressUrl,
  serviceType,
}: {
  service: string;
  contract: ServiceContract;
  tool: ContractInvocationTool;
  defaultLookup?: InvocationLookup;
  ingressUrl: string;
  serviceType?: ReturnType<typeof useServiceContract>['serviceType'];
}) {
  const fetcher = usePlaygroundFetcher(service);
  const [lookup, setLookup] = useState<InvocationLookup>(defaultLookup);
  const operation = tool[lookup] ?? tool.byId ?? tool.byTarget;
  if (!operation) {
    return null;
  }
  const current = operation === tool.byTarget ? 'byTarget' : 'byId';

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ViewHeader title={toolLabel(tool)} description={operation.description} />
      <div className={COLUMNS}>
        <TryIt
          key={toolDraftName(tool.kind, current)}
          service={service}
          contract={contract}
          operation={operation}
          ingressUrl={ingressUrl}
          fetcher={fetcher}
          handlerName={toolDraftName(tool.kind, current)}
          serviceType={serviceType}
          runLabel={TOOL_RUN_LABEL[tool.kind]}
          toolbar={
            tool.byId &&
            tool.byTarget && (
              <SegmentedControl
                label="Find the invocation"
                options={LOOKUP_OPTIONS}
                value={current}
                onChange={setLookup}
              />
            )
          }
        />
        <OperationDocs operation={operation} root={contract.document} />
      </div>
    </div>
  );
}

function OperationView({
  service,
  contract,
  operation,
  ingressUrl,
}: {
  service: string;
  contract: ServiceContract;
  operation: ContractOperation;
  ingressUrl: string;
}) {
  const fetcher = usePlaygroundFetcher(service);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ViewHeader
        title={operationLabel(operation)}
        description={operation.description}
        badges={
          operation.deprecated && (
            <Badge size="xs" variant="warning">
              deprecated
            </Badge>
          )
        }
      />
      <div className={COLUMNS}>
        <TryIt
          service={service}
          contract={contract}
          operation={operation}
          ingressUrl={ingressUrl}
          fetcher={fetcher}
          handlerName={operationKey(operation.id)}
          runLabel="Send"
        />
        <OperationDocs operation={operation} root={contract.document} />
      </div>
    </div>
  );
}

type Selection =
  | { kind: 'handler'; handler: ContractHandler }
  | { kind: 'tool'; tool: ContractInvocationTool }
  | { kind: 'operation'; operation: ContractOperation };

function resolveSelection(
  contract: ServiceContract,
  name: string | null | undefined,
): Selection | undefined {
  const handler = contract.handlers.find(
    (candidate) => candidate.name === name,
  );
  if (handler) {
    return { kind: 'handler', handler };
  }
  const tool = contract.invocationTools.find(
    (candidate) => toolId(candidate.kind) === name,
  );
  if (tool) {
    return { kind: 'tool', tool };
  }
  const operation = contract.otherOperations.find(
    (candidate) => operationKey(candidate.id) === name,
  );
  if (operation) {
    return { kind: 'operation', operation };
  }
  const first = contract.handlers[0];
  if (first) {
    return { kind: 'handler', handler: first };
  }
  const firstOperation = contract.otherOperations[0];
  return firstOperation
    ? { kind: 'operation', operation: firstOperation }
    : undefined;
}

function selectionId(selection: Selection) {
  switch (selection.kind) {
    case 'handler':
      return selection.handler.name;
    case 'tool':
      return toolId(selection.tool.kind);
    case 'operation':
      return operationKey(selection.operation.id);
  }
}

interface LegacySelection {
  name: string;
  mode?: HandlerMode;
  lookup?: InvocationLookup;
}

function legacySelection(
  contract: ServiceContract,
  operationId: string,
): LegacySelection | undefined {
  const handlerMatch = findOperation(contract, operationId);
  if (handlerMatch) {
    return {
      name: handlerMatch.handler.name,
      mode: (Object.entries(handlerMatch.handler.modes).find(
        ([, operation]) => operation === handlerMatch.operation,
      )?.[0] ?? undefined) as HandlerMode | undefined,
    };
  }
  for (const tool of contract.invocationTools) {
    if (tool.byId?.id === operationId || tool.byTarget?.id === operationId) {
      return {
        name: toolId(tool.kind),
        lookup: tool.byTarget?.id === operationId ? 'byTarget' : 'byId',
      };
    }
  }
  const operation = contract.otherOperations.find(
    ({ id }) => id === operationId,
  );
  return operation ? { name: operationKey(operation.id) } : undefined;
}

const navItemStyles = tv({
  base: 'flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-left text-0.5xs outline-offset-2 outline-focus focus-visible:outline-2',
  variants: {
    isSelected: {
      true: 'bg-raised font-medium text-primary shadow-xs ring-1 ring-tint',
      false: 'text-tertiary hover:bg-tint-subtle hover:text-secondary',
    },
  },
});

function NavItem({
  id,
  method,
  label,
  isCode = false,
  hint,
  selected,
  onSelect,
}: {
  id: string;
  method?: string;
  label: string;
  isCode?: boolean;
  hint?: string;
  selected?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        aria-current={id === selected ? 'page' : undefined}
        className={navItemStyles({ isSelected: id === selected })}
        onClick={() => onSelect(id)}
      >
        {method && <Method method={method} variant="text" />}
        <span className={navLabelStyles({ isCode })}>{label}</span>
        {hint && <span className="shrink-0 text-2xs text-subtle">{hint}</span>}
      </button>
    </li>
  );
}

const navLabelStyles = tv({
  base: 'min-w-0 flex-auto truncate',
  variants: { isCode: { true: 'font-mono' } },
});

function NavGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 not-first:mt-2">
      <div className="px-2 text-2xs font-medium text-subtle uppercase">
        {title}
      </div>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </div>
  );
}

function HandlerNav({
  contract,
  handlerKinds,
  selected,
  onSelect,
  isSticky,
}: {
  contract: ServiceContract;
  handlerKinds: Map<string, RestateHandlerKind | undefined>;
  selected?: string;
  onSelect: (handler: string) => void;
  isSticky: boolean;
}) {
  const [filter, setFilter] = useState('');
  const handlers = contract.handlers.filter(({ name }) =>
    name.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  return (
    <nav aria-label="Handlers" className={navStyles({ isSticky })}>
      {contract.handlers.length > 8 && (
        <input
          type="search"
          value={filter}
          placeholder="Filter handlers"
          aria-label="Filter handlers"
          className="w-full rounded-lg border border-inset bg-inset px-2 py-1 text-xs text-primary placeholder:text-placeholder focus:outline-2 focus:outline-focus"
          onChange={(event) => setFilter(event.target.value)}
        />
      )}
      {contract.handlers.length > 0 && (
        <NavGroup title="Handlers">
          {handlers.map((handler) => {
            const kind = handlerKinds.get(handler.name);
            return (
              <NavItem
                key={handler.name}
                id={handler.name}
                method={handler.modes[defaultMode(handler)]?.method}
                label={handler.name}
                isCode
                hint={
                  kind && kind !== 'Exclusive' ? KIND_LABEL[kind] : undefined
                }
                selected={selected}
                onSelect={onSelect}
              />
            );
          })}
        </NavGroup>
      )}
      {toolGroups(contract).map(({ name, tools }) => (
        <NavGroup key={name} title={name}>
          {tools.map((tool) => (
            <NavItem
              key={tool.kind}
              id={toolId(tool.kind)}
              method={(tool.byId ?? tool.byTarget)?.method}
              label={toolLabel(tool)}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </NavGroup>
      ))}
      {contract.otherOperations.length > 0 && (
        <NavGroup title="Other">
          {contract.otherOperations.map((operation) => (
            <NavItem
              key={operation.id}
              id={operationKey(operation.id)}
              method={operation.method}
              label={operationLabel(operation)}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </NavGroup>
      )}
    </nav>
  );
}

function HandlerPicker({
  contract,
  selected,
  onSelect,
}: {
  contract: ServiceContract;
  selected?: string;
  onSelect: (handler: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-0.5xs text-muted">
      Handler
      <select
        value={selected}
        className="min-w-0 rounded-lg border border-inset bg-inset px-2 py-1 font-mono text-0.5xs text-primary focus:outline-2 focus:outline-focus"
        onChange={(event) => onSelect(event.target.value)}
      >
        {contract.handlers.length > 0 && (
          <optgroup label="Handlers">
            {contract.handlers.map(({ name }) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </optgroup>
        )}
        {toolGroups(contract).map(({ name, tools }) => (
          <optgroup key={name} label={name}>
            {tools.map((tool) => (
              <option key={tool.kind} value={toolId(tool.kind)}>
                {toolLabel(tool)}
              </option>
            ))}
          </optgroup>
        ))}
        {contract.otherOperations.length > 0 && (
          <optgroup label="Other">
            {contract.otherOperations.map((operation) => (
              <option key={operation.id} value={operationKey(operation.id)}>
                {operationLabel(operation)}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </label>
  );
}

function downloadSpec(contract: ServiceContract) {
  const blob = new Blob([JSON.stringify(contract.document, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${contract.name}.openapi.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function ServiceDetails({
  contract,
  ingressUrl,
}: {
  contract: ServiceContract;
  ingressUrl: string;
}) {
  return (
    <InfoButton label={contract.name}>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
        <dt className="text-muted">Ingress</dt>
        <dd className="font-mono break-all text-secondary">{ingressUrl}</dd>
        {Object.entries(contract.extensions).map(([key, value]) => (
          <Fragment key={key}>
            <dt className="text-muted">{key}</dt>
            <dd className="font-mono break-all text-secondary">{value}</dd>
          </Fragment>
        ))}
      </dl>
    </InfoButton>
  );
}

function ServiceHeader({
  contract,
  ingressUrl,
  showName,
  actions,
}: {
  contract: ServiceContract;
  ingressUrl: string;
  showName: boolean;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-1 border-b pb-3">
      <div className="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1">
        {showName && (
          <h1 className="text-lg font-semibold text-primary">
            {contract.name}
          </h1>
        )}
        {contract.version && (
          <Badge size="xs">revision {contract.version}</Badge>
        )}
        <ServiceDetails contract={contract} ingressUrl={ingressUrl} />
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted outline-offset-2 outline-focus hover:bg-tint hover:text-secondary focus-visible:outline-2"
            onClick={() => downloadSpec(contract)}
          >
            <Icon name={IconName.Download} className="h-3.5 w-3.5" />
            OpenAPI
          </button>
          {actions}
        </div>
      </div>
      {contract.description && (
        <MarkdownDescription className="text-sm" collapsible>
          {contract.description}
        </MarkdownDescription>
      )}
      {!contract.isSupportedVersion && (
        <div className="text-xs text-warning">
          This server returned OpenAPI {contract.openapi || 'unknown'}; the
          playground is built for 3.1 and may miss details.
        </div>
      )}
    </header>
  );
}

const containerStyles = tv({
  base: '@container/playground flex w-full min-w-0',
  variants: {
    scroll: { contained: 'h-full min-h-0', page: '' },
  },
});

const mainStyles = tv({
  base: 'min-w-0 flex-auto',
  variants: {
    scroll: { contained: 'overflow-auto', page: '' },
  },
});

const navStyles = tv({
  base: 'flex w-56 shrink-0 flex-col gap-2 overflow-auto p-3',
  variants: {
    isSticky: {
      true: 'sticky top-(--cp-content-top,0px) max-h-[calc(100dvh-var(--cp-content-top,0px))] self-start',
    },
  },
});

export interface PlaygroundProps {
  service: string;
  handler?: string | null;
  onSelect: (handler: string) => void;
  showServiceName?: boolean;
  showNavigation?: boolean;
  headerActions?: ReactNode;
  scroll?: 'contained' | 'page';
  className?: string;
}

export function Playground(props: PlaygroundProps) {
  return <ServicePlayground key={props.service} {...props} />;
}

function ServicePlayground({
  service,
  handler: handlerName,
  onSelect,
  showServiceName = true,
  showNavigation = true,
  headerActions,
  scroll = 'contained',
  className,
}: PlaygroundProps) {
  const { contract, handlerKinds, serviceType, ingressUrl, error, isPending } =
    useServiceContract(service);
  const [modes, setModes] = useState<Record<string, HandlerMode>>({});
  const [legacyOperationId] = useState(readLegacyOperationId);
  const legacy = useMemo(
    () =>
      contract && legacyOperationId
        ? legacySelection(contract, legacyOperationId)
        : undefined,
    [contract, legacyOperationId],
  );
  const isLegacyHandled = useRef(false);

  useEffect(() => {
    if (!contract || !legacyOperationId || isLegacyHandled.current) {
      return;
    }
    isLegacyHandled.current = true;
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}`,
    );
    if (legacy) {
      onSelect(legacy.name);
    }
  }, [contract, legacyOperationId, legacy, onSelect]);

  const [selectedName, setSelectedName] = useState(handlerName);
  const [urlHandlerName, setUrlHandlerName] = useState(handlerName);
  if (urlHandlerName !== handlerName) {
    setUrlHandlerName(handlerName);
    setSelectedName(handlerName);
  }
  const select = (next: string) => {
    setSelectedName(next);
    startTransition(() => onSelect(next));
  };

  const selection = contract
    ? resolveSelection(contract, selectedName ?? legacy?.name)
    : undefined;
  const modeFor = (handler: ContractHandler) =>
    modes[handler.name] ??
    (legacy?.name === handler.name ? legacy.mode : undefined) ??
    defaultMode(handler);

  if (error) {
    return (
      <div className="p-4">
        <ErrorBanner errors={[error]} />
      </div>
    );
  }
  if (!contract) {
    return (
      <div className="flex h-full min-h-40 items-center justify-center gap-2 text-sm text-muted">
        {isPending && <Spinner className="h-4 w-4" />}
        {isPending ? 'Loading…' : 'Select a service'}
      </div>
    );
  }

  return (
    <div className={containerStyles({ scroll, className })}>
      {showNavigation && (
        <div className="hidden border-r bg-subtle @3xl/playground:flex">
          <HandlerNav
            contract={contract}
            handlerKinds={handlerKinds}
            selected={selection && selectionId(selection)}
            onSelect={select}
            isSticky={scroll === 'page'}
          />
        </div>
      )}
      <div className={mainStyles({ scroll })}>
        <div className="mx-auto flex max-w-7xl min-w-0 flex-col gap-5 p-4 @3xl/playground:p-6">
          <ServiceHeader
            contract={contract}
            ingressUrl={ingressUrl}
            showName={showServiceName}
            actions={headerActions}
          />
          <div
            className={showNavigation ? '@3xl/playground:hidden' : undefined}
          >
            <HandlerPicker
              contract={contract}
              selected={selection && selectionId(selection)}
              onSelect={select}
            />
          </div>
          {selection?.kind === 'tool' ? (
            <ToolView
              key={toolId(selection.tool.kind)}
              service={service}
              contract={contract}
              tool={selection.tool}
              defaultLookup={
                legacy?.name === toolId(selection.tool.kind)
                  ? legacy.lookup
                  : undefined
              }
              ingressUrl={ingressUrl}
              serviceType={serviceType}
            />
          ) : selection?.kind === 'operation' ? (
            <OperationView
              key={selection.operation.id}
              service={service}
              contract={contract}
              operation={selection.operation}
              ingressUrl={ingressUrl}
            />
          ) : selection?.kind === 'handler' ? (
            <HandlerView
              key={selection.handler.name}
              service={service}
              contract={contract}
              handler={selection.handler}
              mode={modeFor(selection.handler)}
              onModeChange={(next) =>
                setModes((previous) => ({
                  ...previous,
                  [selection.handler.name]: next,
                }))
              }
              ingressUrl={ingressUrl}
              handlerKind={handlerKinds.get(selection.handler.name)}
              serviceType={serviceType}
            />
          ) : (
            <div className="text-sm text-muted">
              This service has no public handlers.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
