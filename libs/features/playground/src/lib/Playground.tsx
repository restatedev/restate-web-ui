import {
  startTransition,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Badge } from '@restate/ui-badge';
import { Copy } from '@restate/ui-copy';
import { ErrorBanner } from '@restate/ui-error';
import { FormFieldLabel, Switch } from '@restate/ui-form-field';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { MarkdownDescription } from '@restate/ui-json-schema';
import { Spinner } from '@restate/ui-loading';
import { RadioCard, RadioCards, RadioGroup } from '@restate/ui-radio-group';
import { useRestateContext } from '@restate/features-restate-context';
import { tv } from '@restate/util-styles';
import {
  findOperation,
  joinUrl,
  type ContractHandler,
  type ContractOperation,
  type HandlerMode,
  type RestateHandlerKind,
  type ServiceContract,
} from '@restate/util-openapi';
import { InfoButton } from './InfoButton';
import { OperationDocs } from './OperationDocs';
import { TryIt } from './TryIt';
import { usePlaygroundFetcher } from './usePlaygroundFetcher';
import { useServiceContract } from './useServiceContract';

const LEGACY_OPERATION_HASH = '#/operations/';

type BaseMode = 'call' | 'send' | 'attach' | 'output';

const MODE_OPTIONS: Record<BaseMode, { label: string; description: string }> = {
  call: { label: 'Call', description: 'Waits for the result' },
  send: {
    label: 'Send',
    description: 'Returns an invocation ID right away',
  },
  attach: {
    label: 'Attach',
    description: 'Waits for an earlier call with this idempotency key',
  },
  output: {
    label: 'Get output',
    description: 'Returns the result of an earlier call, if done',
  },
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
  return decodeURIComponent(
    window.location.hash.slice(LEGACY_OPERATION_HASH.length).split('#')[0] ??
      '',
  );
}

const methodStyles = tv({
  base: 'shrink-0 font-mono text-2xs font-semibold',
  variants: {
    method: {
      GET: '',
      POST: '',
      DELETE: '',
      other: '',
    },
    variant: {
      badge: 'rounded-md border px-1.5 py-0.5',
      text: 'w-8',
    },
  },
  compoundVariants: [
    {
      variant: 'badge',
      method: 'GET',
      className:
        'border-success-strong/20 bg-success-subtle text-success-strong',
    },
    {
      variant: 'badge',
      method: 'POST',
      className: 'border-info-strong/20 bg-info-subtle text-info-strong',
    },
    {
      variant: 'badge',
      method: 'DELETE',
      className: 'border-danger-strong/20 bg-danger-subtle text-danger-strong',
    },
    {
      variant: 'badge',
      method: 'other',
      className:
        'border-warning-strong/20 bg-warning-subtle text-warning-strong',
    },
    { variant: 'text', method: 'GET', className: 'text-success' },
    { variant: 'text', method: 'POST', className: 'text-info' },
    { variant: 'text', method: 'DELETE', className: 'text-danger' },
    { variant: 'text', method: 'other', className: 'text-warning' },
  ],
});

function Method({
  method,
  variant = 'badge',
}: {
  method: string;
  variant?: 'badge' | 'text';
}) {
  return (
    <span
      className={methodStyles({
        variant,
        method:
          method === 'GET' || method === 'POST' || method === 'DELETE'
            ? method
            : 'other',
      })}
    >
      {method}
    </span>
  );
}

function OperationUrl({
  operation,
  ingressUrl,
}: {
  operation: ContractOperation;
  ingressUrl: string;
}) {
  const fullUrl = joinUrl(ingressUrl, operation.path);
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border bg-surface py-1 pr-1 pl-1.5 shadow-xs">
      <Method method={operation.method} />
      <span
        className="min-w-0 flex-auto truncate font-mono text-0.5xs select-all"
        title={fullUrl}
      >
        <span className="text-subtle">{ingressUrl.replace(/\/+$/, '')}</span>
        <span className="text-primary">{operation.path}</span>
      </span>
      <Copy copyText={fullUrl} className="p-1.5" />
    </div>
  );
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

const modeCardsStyles = tv({
  base: 'grid grid-cols-2',
  variants: {
    count: {
      2: '',
      3: '@3xl/playground:grid-cols-3',
      4: '@3xl/playground:grid-cols-4',
    },
  },
});

function ModePicker({
  modes,
  value,
  onChange,
}: {
  modes: BaseMode[];
  value: BaseMode;
  onChange: (mode: BaseMode) => void;
}) {
  return (
    <RadioGroup
      name="playground-mode"
      value={value}
      onChange={(next) => onChange(next as BaseMode)}
    >
      <FormFieldLabel className="sr-only">How to invoke</FormFieldLabel>
      <RadioCards
        className={modeCardsStyles({
          count: Math.min(Math.max(modes.length, 2), 4) as 2 | 3 | 4,
        })}
      >
        {modes.map((mode) => (
          <RadioCard
            key={mode}
            value={mode}
            label={MODE_OPTIONS[mode].label}
            description={MODE_OPTIONS[mode].description}
          />
        ))}
      </RadioCards>
    </RadioGroup>
  );
}

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
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold text-primary">
            <span className="truncate font-mono">{handler.name}</span>
            {handlerKind && <Badge size="xs">{KIND_LABEL[handlerKind]}</Badge>}
            {operation.deprecated && (
              <Badge size="xs" variant="warning">
                deprecated
              </Badge>
            )}
          </h2>
          {canScope && (
            <div className="ml-auto">
              <ScopeSwitch
                isSelected={isScoped}
                onChange={(scoped) => onModeChange(withScope(base, scoped))}
              />
            </div>
          )}
        </div>
        {handler.description && (
          <MarkdownDescription className="text-sm" collapsible>
            {handler.description}
          </MarkdownDescription>
        )}
        {baseModes.length > 1 && (
          <ModePicker
            modes={baseModes}
            value={base}
            onChange={(next) => onModeChange(withScope(next, isScoped))}
          />
        )}
        <OperationUrl operation={operation} ingressUrl={ingressUrl} />
        <Metadata extensions={handler.extensions} />
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-8 @5xl/playground:grid-cols-2">
        <div className="order-first min-w-0 @5xl/playground:order-last">
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
          />
        </div>
        <OperationDocs operation={operation} root={contract.document} />
      </div>
    </div>
  );
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

function HandlerNav({
  contract,
  handlerKinds,
  selected,
  onSelect,
}: {
  contract: ServiceContract;
  handlerKinds: Map<string, RestateHandlerKind | undefined>;
  selected?: string;
  onSelect: (handler: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const handlers = contract.handlers.filter(({ name }) =>
    name.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  return (
    <nav
      aria-label="Handlers"
      className="flex w-56 shrink-0 flex-col gap-2 overflow-auto border-r bg-subtle p-3"
    >
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
      <div className="px-2 text-2xs font-medium text-subtle uppercase">
        Handlers
      </div>
      <ul className="flex flex-col gap-0.5">
        {handlers.map((handler) => {
          const kind = handlerKinds.get(handler.name);
          const method = handler.modes[defaultMode(handler)]?.method;
          return (
            <li key={handler.name}>
              <button
                type="button"
                aria-current={handler.name === selected ? 'page' : undefined}
                className={navItemStyles({
                  isSelected: handler.name === selected,
                })}
                onClick={() => onSelect(handler.name)}
              >
                {method && <Method method={method} variant="text" />}
                <span className="min-w-0 flex-auto truncate font-mono">
                  {handler.name}
                </span>
                {kind && kind !== 'Exclusive' && (
                  <span className="shrink-0 text-2xs text-subtle">
                    {KIND_LABEL[kind]}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
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
        {contract.handlers.map(({ name }) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
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

function ServiceHeader({
  contract,
  ingressUrl,
  actions,
}: {
  contract: ServiceContract;
  ingressUrl: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2 border-b pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold text-primary">{contract.name}</h1>
        {contract.version && (
          <Badge size="xs">revision {contract.version}</Badge>
        )}
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
      <Metadata extensions={contract.extensions} />
      <div className="flex items-center gap-1.5 text-xs text-muted">
        Ingress
        <code className="font-mono text-secondary">{ingressUrl}</code>
      </div>
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
  base: '@container/playground flex h-full min-h-0 w-full min-w-0',
});

export interface PlaygroundProps {
  service: string;
  handler?: string | null;
  onSelect: (handler: string) => void;
  showServiceHeader?: boolean;
  showNavigation?: boolean;
  headerActions?: ReactNode;
  className?: string;
}

export function Playground({
  service,
  handler: handlerName,
  onSelect,
  showServiceHeader = true,
  showNavigation = true,
  headerActions,
  className,
}: PlaygroundProps) {
  const { contract, handlerKinds, serviceType, ingressUrl, error, isPending } =
    useServiceContract(service);
  const [modes, setModes] = useState<Record<string, HandlerMode>>({});
  const [legacyOperationId] = useState(readLegacyOperationId);
  const legacy = useMemo(
    () =>
      contract && legacyOperationId
        ? findOperation(contract, legacyOperationId)
        : undefined,
    [contract, legacyOperationId],
  );

  useEffect(() => {
    if (!contract || !legacyOperationId) {
      return;
    }
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}`,
    );
    if (legacy) {
      onSelect(legacy.handler.name);
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

  const selectedHandler = useMemo(
    () =>
      contract?.handlers.find(({ name }) => name === selectedName) ??
      legacy?.handler ??
      contract?.handlers[0],
    [contract, selectedName, legacy],
  );
  const modeFor = (handler: ContractHandler) =>
    modes[handler.name] ??
    (legacy?.handler === handler
      ? (Object.entries(handler.modes).find(
          ([, operation]) => operation === legacy.operation,
        )?.[0] as HandlerMode | undefined)
      : undefined) ??
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
    <div className={containerStyles({ className })}>
      {showNavigation && (
        <div className="hidden @3xl/playground:flex">
          <HandlerNav
            contract={contract}
            handlerKinds={handlerKinds}
            selected={selectedHandler?.name}
            onSelect={select}
          />
        </div>
      )}
      <div className="min-w-0 flex-auto overflow-auto">
        <div className="mx-auto flex max-w-7xl min-w-0 flex-col gap-5 p-4 @3xl/playground:p-6">
          {showServiceHeader && (
            <ServiceHeader
              contract={contract}
              ingressUrl={ingressUrl}
              actions={headerActions}
            />
          )}
          <div
            className={showNavigation ? '@3xl/playground:hidden' : undefined}
          >
            <HandlerPicker
              contract={contract}
              selected={selectedHandler?.name}
              onSelect={select}
            />
          </div>
          {selectedHandler ? (
            <HandlerView
              key={selectedHandler.name}
              service={service}
              contract={contract}
              handler={selectedHandler}
              mode={modeFor(selectedHandler)}
              onModeChange={(next) =>
                setModes((previous) => ({
                  ...previous,
                  [selectedHandler.name]: next,
                }))
              }
              ingressUrl={ingressUrl}
              handlerKind={handlerKinds.get(selectedHandler.name)}
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
