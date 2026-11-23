import { startTransition, useRef, useState, type ReactNode } from 'react';
import { Button } from '@restate/ui-button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui-dropdown';
import { ErrorBanner } from '@restate/ui-error';
import { tv } from '@restate/util-styles';
import { Icon, IconName } from '@restate/ui-icons';
import { Spinner } from '@restate/ui-loading';
import { ServiceTarget } from '@restate/features-service-target';
import { isJsonContentType } from '@restate/util-openapi';
import type {
  ContractHandler,
  ContractResponse,
  HandlerMode,
  InvocationToolKind,
  RestateClientSnippetInput,
  RestateHandlerKind,
  RestateServiceType,
  ServiceContract,
} from '@restate/util-openapi';
import { CodeSamples } from './CodeSamples';
import { toolId } from './names';
import { API_KEY_PLACEHOLDER } from './useRunner';
import { JsonSchemaTree, MarkdownDescription } from '@restate/ui-json-schema';
import { statusText } from './status';
import { SegmentedControl } from './SegmentedControl';
import { useServiceContract } from './useServiceContract';
import type { HandlerRun, OperationRun } from './useHandlerRun';

export function useServiceHandler(
  service: string,
  handlerName: string | null | undefined,
  onSelect: (handler: string, isHandler: boolean) => void,
) {
  const loaded = useServiceContract(service);
  const [selected, setSelected] = useState(handlerName);
  const [urlName, setUrlName] = useState(handlerName);
  if (urlName !== handlerName) {
    setUrlName(handlerName);
    setSelected(handlerName);
  }
  const handlers = loaded.contract?.handlers ?? [];
  const tool = loaded.contract?.invocationTools.find(
    (candidate) => toolId(candidate.kind) === selected,
  );
  const handler = tool
    ? undefined
    : (handlers.find((candidate) => candidate.name === selected) ??
      handlers[0]);
  const select = (next: string) => {
    setSelected(next);
    startTransition(() =>
      onSelect(
        next,
        handlers.some((candidate) => candidate.name === next),
      ),
    );
  };
  return { ...loaded, handler, tool, select };
}

export function LoadingState({
  error,
  isPending,
  actions,
}: {
  error?: Error | null;
  isPending: boolean;
  actions?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-40 flex-col">
      {actions && (
        <div className="flex justify-end gap-2 px-4 pt-4">{actions}</div>
      )}
      {error ? (
        <div className="p-4">
          <ErrorBanner errors={[error]} />
        </div>
      ) : (
        <div className="flex flex-auto items-center justify-center gap-2 text-sm text-muted">
          {isPending && <Spinner size="md" />}
          {isPending ? 'Loading…' : 'This service has no handlers to run.'}
        </div>
      )}
    </div>
  );
}

export const targetStyles = tv({
  base: 'min-w-0 flex-none self-start [&_[data-chip-root]]:text-0.5xs [&_[data-chip]]:[--chip-height:1.75rem]',
});

const KIND_NOTE: Partial<Record<RestateHandlerKind, string>> = {
  Shared: 'shared',
  Workflow: 'workflow',
};

export function HandlerSwitcher({
  contract,
  handler,
  tool,
  handlerKinds,
  serviceType,
  serviceKey,
  withTools = false,
  showMore = false,
  onSelect,
}: {
  contract: ServiceContract;
  handler?: ContractHandler;
  tool?: InvocationToolKind;
  handlerKinds: Map<string, RestateHandlerKind | undefined>;
  serviceType?: RestateServiceType;
  serviceKey?: string;
  withTools?: boolean;
  showMore?: boolean;
  onSelect: (id: string) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tools = withTools ? contract.invocationTools : [];
  if (handler && contract.handlers.length + tools.length < 2) {
    return (
      <ServiceTarget
        service={contract.name}
        serviceKey={serviceKey || undefined}
        handler={handler.name}
        serviceType={serviceType}
        showHandler
        links={false}
        density="default"
        className={targetStyles()}
      />
    );
  }
  const label = handler ? `${handler.name}()` : tool ? TOOL_LABEL[tool] : '';
  const selected = handler ? handler.name : tool ? toolId(tool) : '';
  const others = contract.handlers.length - (handler ? 1 : 0);
  const switcher = (
    <ServiceTarget
      service={contract.name}
      serviceKey={serviceKey || undefined}
      serviceType={serviceType}
      showHandler={false}
      links={false}
      density="default"
      className={targetStyles()}
    >
      <Dropdown>
        <DropdownTrigger>
          <Button
            ref={triggerRef}
            variant="icon"
            aria-label={`${label}, choose another handler`}
            className="-mx-1.5 flex h-full min-w-0 items-center gap-1 rounded-sm py-0 pr-1 pl-0.5 [font-size:inherit] [line-height:inherit] text-inherit shadow-none hover:bg-tint-subtle pressed:bg-tint-strong"
          >
            {handler && (
              <Icon
                name={IconName.Function}
                size="lg"
                className="-mr-1 text-subtle"
              />
            )}
            <span
              className={switcherLabelStyles({ isHandler: Boolean(handler) })}
            >
              {label}
            </span>
            <Icon
              name={IconName.ChevronsUpDown}
              size="sm"
              className="text-subtle"
            />
          </Button>
        </DropdownTrigger>
        <DropdownPopover placement="bottom start" className="w-72">
          <DropdownSection title="Handlers">
            <DropdownMenu
              selectable
              selectedItems={[selected]}
              onSelect={(key) => onSelect(String(key))}
            >
              {contract.handlers.map((candidate) => {
                const kind = handlerKinds.get(candidate.name);
                return (
                  <DropdownItem key={candidate.name} value={candidate.name}>
                    <span className="flex min-w-0 flex-auto flex-col gap-0.5">
                      <span className="flex items-baseline gap-1.5">
                        <span className="italic">{candidate.name}()</span>
                        {kind && KIND_NOTE[kind] && (
                          <span className="text-2xs opacity-70">
                            {KIND_NOTE[kind]}
                          </span>
                        )}
                      </span>
                      {candidate.description && (
                        <span className="line-clamp-1 text-xs whitespace-normal opacity-70">
                          {candidate.description}
                        </span>
                      )}
                    </span>
                  </DropdownItem>
                );
              })}
            </DropdownMenu>
          </DropdownSection>
          {tools.length > 0 && (
            <DropdownSection title="Invocations">
              <DropdownMenu
                selectable
                selectedItems={[selected]}
                onSelect={(key) => onSelect(String(key))}
              >
                {tools.map((candidate) => (
                  <DropdownItem
                    key={candidate.kind}
                    value={toolId(candidate.kind)}
                  >
                    {TOOL_LABEL[candidate.kind]}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </DropdownSection>
          )}
        </DropdownPopover>
      </Dropdown>
    </ServiceTarget>
  );
  if (!showMore || others < 1) {
    return switcher;
  }
  return (
    <>
      {switcher}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className="shrink-0 rounded-md px-1.5 py-0.5 text-xs text-muted hover:bg-tint-subtle hover:text-secondary"
        onClick={() => triggerRef.current?.click()}
      >
        {others} more {others === 1 ? 'handler' : 'handlers'}
      </button>
    </>
  );
}

const switcherLabelStyles = tv({
  base: 'min-w-0 truncate font-medium text-muted',
  variants: { isHandler: { true: 'italic', false: '' } },
});

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

export function handlerClient(
  run: HandlerRun,
  ingressUrl: string,
  handlerKind?: RestateHandlerKind,
): RestateClientSnippetInput | undefined {
  const { runner, serviceType, contract, handler, operation, base } = run;
  if (!serviceType || run.availableModes.length === 0) {
    return undefined;
  }
  return {
    ingressUrl: ingressUrl.replace(/\/+$/, ''),
    serviceName: contract.name,
    serviceType,
    handlerName: handler.name,
    handlerKind,
    mode: (run.isScoped
      ? base === 'send'
        ? 'scopedSend'
        : 'scopedCall'
      : base) as HandlerMode,
    key: runner.roleValue('key'),
    scope: runner.roleValue('scope'),
    idempotencyKey: runner.roleValue('idempotencyKey') || undefined,
    limitKey: runner.roleValue('limitKey') || undefined,
    delayMs: runner.delayMs,
    body:
      runner.draft.bodyMode === 'text'
        ? runner.bodyText || undefined
        : undefined,
    hasFileBody: runner.draft.bodyMode === 'file',
    bodyContentType: operation.body?.contentType,
    authorization:
      run.requiresApiKey || run.apiKeyState.isVisible
        ? `Bearer ${API_KEY_PLACEHOLDER}`
        : undefined,
  };
}

export function CodeView({
  run,
  client,
}: {
  run: OperationRun;
  client?: RestateClientSnippetInput;
}) {
  const { runner, contract } = run;
  return (
    <div className="flex flex-col gap-2 [&_code]:text-xs [&_code]:leading-normal">
      <button
        type="button"
        className="flex items-center gap-1 self-end rounded-lg px-2 py-1 text-xs text-muted outline-offset-2 outline-focus hover:bg-tint hover:text-secondary focus-visible:outline-2"
        onClick={() => downloadSpec(contract)}
      >
        <Icon name={IconName.Download} size="sm" />
        Download OpenAPI
      </button>
      <CodeSamples samples={{ request: runner.sampleRequest, client }} />
    </div>
  );
}

const schemaSectionStyles = tv({
  slots: {
    section:
      'flex min-w-0 flex-col gap-2 rounded-xl border bg-surface p-4 shadow-xs',
    header: 'flex min-h-6 flex-wrap items-center gap-2',
    title: 'text-0.5xs font-medium text-secondary',
    empty: 'text-sm text-muted',
    note: 'text-0.5xs text-muted',
  },
});

const HANDLER_RESPONSE_MODES = ['call', 'send', 'attach', 'output'] as const;

const MODE_NAME: Record<(typeof HANDLER_RESPONSE_MODES)[number], string> = {
  call: 'Call',
  send: 'Send',
  attach: 'Attach',
  output: 'Get output',
};

type OutputOption = { response: ContractResponse; label: string };

function statusOrder(status: string) {
  if (status === 'default') {
    return 1000;
  }
  const code = Number(status);
  return Number.isNaN(code) ? 999 : code;
}

function uniqueResponses(responses: ContractResponse[]) {
  const byStatus = new Map<string, ContractResponse>();
  for (const response of responses) {
    if (!byStatus.has(response.status)) {
      byStatus.set(response.status, response);
    }
  }
  return Array.from(byStatus.values()).sort(
    (a, b) => statusOrder(a.status) - statusOrder(b.status),
  );
}

function responseLabel(status: string) {
  return status === 'default'
    ? 'Error'
    : [status, statusText(status)].filter(Boolean).join(' ');
}

function handlerOutputs(handler: ContractHandler): OutputOption[] {
  const modes = HANDLER_RESPONSE_MODES.filter((mode) => handler.modes[mode]);
  const sources = new Map<string, string[]>();
  for (const mode of modes) {
    for (const { status } of handler.modes[mode]?.responses ?? []) {
      sources.set(status, [...(sources.get(status) ?? []), MODE_NAME[mode]]);
    }
  }
  return uniqueResponses(
    modes.flatMap((mode) => handler.modes[mode]?.responses ?? []),
  ).map((response) => {
    const from = sources.get(response.status) ?? [];
    const label = responseLabel(response.status);
    return {
      response,
      label:
        from.length < modes.length ? `${from.join(', ')} · ${label}` : label,
    };
  });
}

function OutputSection({
  options,
  root,
  nothingText,
}: {
  options: OutputOption[];
  root: unknown;
  nothingText: string;
}) {
  const [selected, setSelected] = useState(options[0]?.response.status ?? '');
  const response = (
    options.find((option) => option.response.status === selected) ?? options[0]
  )?.response;
  const styles = schemaSectionStyles();
  const hasBody =
    response !== undefined &&
    (response.schema !== undefined || response.contentType !== undefined);
  return (
    <section aria-label="Output" className={styles.section()}>
      <div className={styles.header()}>
        <h3 className={styles.title()}>Output</h3>
        {options.length > 1 && response && (
          <SegmentedControl
            label="Response status"
            className="ml-auto"
            value={response.status}
            onChange={setSelected}
            options={options.map((option) => ({
              value: option.response.status,
              label: option.label,
            }))}
          />
        )}
      </div>
      {response?.description && (
        <MarkdownDescription className={styles.note()}>
          {response.description}
        </MarkdownDescription>
      )}
      {hasBody ? (
        <JsonSchemaTree
          schema={response.schema}
          root={root}
          mode="read"
          emptyText={
            response.contentType && !isJsonContentType(response.contentType)
              ? `Raw ${response.contentType} content`
              : 'Any JSON value'
          }
        />
      ) : (
        !response?.description && (
          <p className={styles.empty()}>
            {response?.status.startsWith('2') || !response
              ? nothingText
              : 'No body'}
          </p>
        )
      )}
    </section>
  );
}

export function SchemaView({ run }: { run: HandlerRun }) {
  const { handler, contract } = run;
  const operation =
    handler.modes.call ??
    handler.modes.send ??
    Object.values(handler.modes).find(Boolean);
  const body = operation?.body;
  const styles = schemaSectionStyles();
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Input" className={styles.section()}>
        <h3 className={styles.title()}>Input</h3>
        {body ? (
          <JsonSchemaTree
            schema={body.schema}
            root={contract.document}
            mode="write"
            emptyText={
              isJsonContentType(body.contentType)
                ? 'Any JSON value'
                : `Raw ${body.contentType} content`
            }
          />
        ) : (
          <p className={styles.empty()}>This handler takes no input</p>
        )}
      </section>
      <OutputSection
        key={handler.name}
        options={handlerOutputs(handler)}
        root={contract.document}
        nothingText="This handler returns nothing"
      />
    </div>
  );
}

export function ToolSchemaView({ run }: { run: OperationRun }) {
  const { operation, contract } = run;
  const body = operation.body;
  const styles = schemaSectionStyles();
  return (
    <div className="flex flex-col gap-4">
      {body && (
        <section aria-label="Target" className={styles.section()}>
          <h3 className={styles.title()}>Target</h3>
          <JsonSchemaTree
            schema={body.schema}
            root={contract.document}
            mode="write"
            emptyText="Any JSON value"
          />
        </section>
      )}
      <OutputSection
        key={operation.id}
        options={uniqueResponses(operation.responses).map((response) => ({
          response,
          label: responseLabel(response.status),
        }))}
        root={contract.document}
        nothingText="No body"
      />
    </div>
  );
}

const railItemStyles = tv({
  base: 'flex w-full min-w-0 flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left outline-offset-2 outline-focus focus-visible:outline-2',
  variants: {
    isSelected: {
      true: 'bg-raised shadow-xs ring-1 ring-tint',
      false: 'hover:bg-tint-subtle',
    },
  },
});

function isDeprecated(handler: ContractHandler) {
  return Object.values(handler.modes).some(
    (operation) => operation?.deprecated,
  );
}

export const TOOL_LABEL: Record<InvocationToolKind, string> = {
  attach: 'Wait for a result',
  output: 'Get a result',
  status: 'Check status',
};

const railGroupStyles = tv({
  base: 'px-2.5 pt-1 text-2xs font-medium text-muted uppercase',
  variants: { isFollowing: { true: 'mt-2', false: '' } },
});

export function HandlerRail({
  contract,
  selected,
  handlerKinds,
  onSelect,
}: {
  contract: ServiceContract;
  selected?: string;
  handlerKinds: Map<string, RestateHandlerKind | undefined>;
  onSelect: (name: string) => void;
}) {
  return (
    <nav
      aria-label="Handlers"
      className="hidden w-60 shrink-0 flex-col gap-2 overflow-auto border-r bg-subtle p-3 md:flex"
    >
      <span className={railGroupStyles()}>Handlers</span>
      <ul className="flex flex-col gap-0.5">
        {contract.handlers.map((candidate) => {
          const kind = handlerKinds.get(candidate.name);
          const isSelected = candidate.name === selected;
          return (
            <li key={candidate.name}>
              <button
                type="button"
                aria-current={isSelected ? 'page' : undefined}
                className={railItemStyles({ isSelected })}
                onClick={() => onSelect(candidate.name)}
              >
                <span className="flex items-baseline gap-1.5">
                  <span className="truncate font-mono text-0.5xs font-medium text-primary">
                    {candidate.name}
                  </span>
                  {kind === 'Shared' && (
                    <span className="text-2xs text-subtle">shared</span>
                  )}
                  {isDeprecated(candidate) && (
                    <span className="text-2xs text-warning">deprecated</span>
                  )}
                </span>
                {candidate.description && (
                  <span className="line-clamp-2 text-xs text-muted">
                    {candidate.description}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {contract.invocationTools.length > 0 && (
        <>
          <span className={railGroupStyles({ isFollowing: true })}>
            Invocations
          </span>
          <ul className="flex flex-col gap-0.5">
            {contract.invocationTools.map((tool) => {
              const id = toolId(tool.kind);
              const isSelected = id === selected;
              return (
                <li key={tool.kind}>
                  <button
                    type="button"
                    aria-current={isSelected ? 'page' : undefined}
                    className={railItemStyles({ isSelected })}
                    onClick={() => onSelect(id)}
                  >
                    <span className="truncate text-0.5xs font-medium text-primary">
                      {TOOL_LABEL[tool.kind]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </nav>
  );
}
