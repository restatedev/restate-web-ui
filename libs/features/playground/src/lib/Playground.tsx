import { useId, useRef, useState, type ReactNode } from 'react';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { ServiceTarget } from '@restate/features-service-target';
import { tv } from '@restate/util-styles';
import type {
  ContractHandler,
  ContractInvocationTool,
  ContractOperation,
  RestateHandlerKind,
  RestateServiceType,
  ServiceContract,
} from '@restate/util-openapi';
import { toolDraftName, toolId, type InvocationLookup } from './names';
import { SegmentedControl } from './SegmentedControl';
import {
  CodeView,
  HandlerRail,
  HandlerSwitcher,
  LoadingState,
  SchemaView,
  targetStyles,
  TOOL_LABEL,
  useServiceHandler,
} from './Frame';
import {
  AdvancedFields,
  AdvancedToggle,
  ApiKeyField,
  InputField,
  KeyFields,
  ParameterFields,
  RunButton,
  runLabel,
  SendButton,
  submitRun,
} from './fields';
import { Hint, runHint } from './floating';
import { RunResult } from './outcome';
import { useHandlerRun, useOperationRun } from './useHandlerRun';

export interface PlaygroundProps {
  service: string;
  handler?: string | null;
  onSelect: (handler: string, isHandler: boolean) => void;
  showNavigation?: boolean;
  headerActions?: ReactNode;
  scroll?: 'contained' | 'page';
}

export function Playground(props: PlaygroundProps) {
  const loaded = useServiceHandler(
    props.service,
    props.handler,
    props.onSelect,
  );
  const { contract, handler, tool } = loaded;
  if (!contract || (!handler && !tool)) {
    return (
      <LoadingState
        error={loaded.error}
        isPending={loaded.isPending}
        actions={props.headerActions}
      />
    );
  }
  const showRail =
    props.showNavigation !== false &&
    contract.handlers.length + contract.invocationTools.length > 1;
  const layout: Layout =
    props.scroll === 'page'
      ? 'embed'
      : props.showNavigation === false
        ? 'panel'
        : 'sheet';
  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0"
      data-ignore-shortcut="true"
    >
      {showRail && (
        <HandlerRail
          contract={contract}
          selected={tool ? toolId(tool.kind) : handler?.name}
          handlerKinds={loaded.handlerKinds}
          onSelect={loaded.select}
        />
      )}
      {tool ? (
        <ToolWorkspace
          key={tool.kind}
          contract={contract}
          tool={tool}
          hasRail={showRail}
          handlerKinds={loaded.handlerKinds}
          onSelect={loaded.select}
          ingressUrl={loaded.ingressUrl}
          serviceType={loaded.serviceType}
          layout={layout}
          headerActions={props.headerActions}
        />
      ) : handler ? (
        <Workspace
          key={handler.name}
          contract={contract}
          handler={handler}
          handlerKinds={loaded.handlerKinds}
          ingressUrl={loaded.ingressUrl}
          serviceType={loaded.serviceType}
          hasRail={showRail}
          layout={layout}
          showDescription={props.scroll !== 'page' || !showRail}
          onSelect={loaded.select}
          headerActions={props.headerActions}
        />
      ) : null}
    </div>
  );
}

const cardStyles = tv({
  base: 'flex min-w-0 flex-col gap-4 rounded-xl border bg-surface p-4 shadow-xs',
});

type View = 'invoke' | 'code' | 'schema';

const headerRowStyles = tv({
  base: 'flex min-h-7 min-w-0 items-center gap-2',
  variants: {
    visibility: { always: '', narrow: 'md:hidden', never: 'hidden' },
  },
});

type Layout = 'sheet' | 'panel' | 'embed';

const layoutStyles = tv({
  slots: {
    header: 'flex flex-col gap-2 pb-4',
    body: 'flex flex-col gap-4',
  },
  variants: {
    layout: {
      sheet: { header: 'px-6 pt-5', body: 'px-6 pb-8' },
      panel: { header: 'px-4 pt-0', body: 'px-4 pb-6' },
      embed: { header: 'px-6 pt-3', body: 'px-6 pb-8' },
    },
  },
});

const VIEWS: { value: View; label: string; icon: IconName }[] = [
  { value: 'invoke', label: 'Invoke', icon: IconName.CirclePlay },
  { value: 'code', label: 'Code', icon: IconName.Code },
  { value: 'schema', label: 'Schema', icon: IconName.Braces },
];

const viewTabStyles = tv({
  slots: {
    tab: 'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-0.5xs font-medium outline-offset-2 outline-focus focus-visible:outline-2',
    icon: 'h-3.5 w-3.5 shrink-0',
  },
  variants: {
    isSelected: {
      true: {
        tab: 'bg-raised text-primary shadow-xs ring-1 ring-tint',
        icon: 'text-secondary',
      },
      false: {
        tab: 'text-tertiary hover:bg-tint-subtle hover:text-secondary',
        icon: 'text-subtle',
      },
    },
  },
});

function viewIds(baseId: string, value: View) {
  return { tab: `${baseId}-tab-${value}`, panel: `${baseId}-panel` };
}

function ViewTabs({
  baseId,
  value,
  onChange,
}: {
  baseId: string;
  value: View;
  onChange: (value: View) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const select = (index: number) => {
    const next = VIEWS[(index + VIEWS.length) % VIEWS.length];
    if (next) {
      onChange(next.value);
      listRef.current
        ?.querySelector<HTMLElement>(
          `#${CSS.escape(viewIds(baseId, next.value).tab)}`,
        )
        ?.focus();
    }
  };
  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="View"
      className="mt-1 inline-flex gap-0.5 self-start rounded-xl bg-tint-subtle p-1"
    >
      {VIEWS.map((option) => {
        const isSelected = option.value === value;
        const styles = viewTabStyles({ isSelected });
        const ids = viewIds(baseId, option.value);
        return (
          <button
            key={option.value}
            id={ids.tab}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={ids.panel}
            tabIndex={isSelected ? 0 : -1}
            className={styles.tab()}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              const index = VIEWS.findIndex((option) => option.value === value);
              const target =
                event.key === 'ArrowRight'
                  ? index + 1
                  : event.key === 'ArrowLeft'
                    ? index - 1
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? VIEWS.length - 1
                        : undefined;
              if (target !== undefined) {
                event.preventDefault();
                select(target);
              }
            }}
          >
            <Icon name={option.icon} className={styles.icon()} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Workspace({
  contract,
  handler,
  handlerKinds,
  ingressUrl,
  serviceType,
  hasRail,
  layout,
  showDescription,
  onSelect,
  headerActions,
}: {
  contract: ServiceContract;
  handler: ContractHandler;
  handlerKinds: Map<string, RestateHandlerKind | undefined>;
  ingressUrl: string;
  serviceType?: RestateServiceType;
  hasRail: boolean;
  layout: Layout;
  showDescription: boolean;
  onSelect: (name: string) => void;
  headerActions?: ReactNode;
}) {
  const run = useHandlerRun({
    service: contract.name,
    contract,
    handler,
    ingressUrl,
    serviceType,
  });
  const [view, setView] = useState<View>('invoke');
  const tabsId = useId();
  const isEmbedded = layout === 'embed';
  const styles = layoutStyles({ layout });
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(
    () => run.changedOptions > 0,
  );
  const description = handler.description ?? contract.description;
  const serviceKey = run.runner.roleValue('key');

  return (
    <div className="@container/full min-h-0 min-w-0 flex-auto overflow-auto">
      <header className={styles.header()}>
        <div
          className={headerRowStyles({
            visibility: !isEmbedded ? 'always' : hasRail ? 'narrow' : 'never',
          })}
        >
          {hasRail ? (
            <>
              <div className="flex min-w-0 md:hidden">
                <HandlerSwitcher
                  contract={contract}
                  handler={handler}
                  handlerKinds={handlerKinds}
                  serviceType={serviceType}
                  serviceKey={serviceKey}
                  withTools
                  onSelect={onSelect}
                />
              </div>
              {!isEmbedded && (
                <div className="hidden min-w-0 md:flex">
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
                </div>
              )}
            </>
          ) : (
            !isEmbedded && (
              <HandlerSwitcher
                contract={contract}
                handler={handler}
                handlerKinds={handlerKinds}
                serviceType={serviceType}
                serviceKey={serviceKey}
                withTools
                onSelect={onSelect}
              />
            )
          )}
          {headerActions && (
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {headerActions}
            </div>
          )}
        </div>
        {description && showDescription && (
          <p className="line-clamp-2 text-0.5xs text-muted" title={description}>
            {description}
          </p>
        )}
        {!contract.isSupportedVersion && (
          <p className="text-xs text-warning">
            This server returned OpenAPI {contract.openapi || 'unknown'}; the
            playground is built for 3.1 and may miss details
          </p>
        )}
        <ViewTabs baseId={tabsId} value={view} onChange={setView} />
      </header>
      <div
        role="tabpanel"
        id={viewIds(tabsId, view).panel}
        aria-labelledby={viewIds(tabsId, view).tab}
      >
        {view === 'invoke' && (
          <div className={styles.body()}>
            <form
              aria-label="Invoke"
              className={cardStyles()}
              onSubmit={(event) => {
                event.preventDefault();
                submitRun(run, event.currentTarget, () =>
                  setIsAdvancedOpen(true),
                );
              }}
            >
              <KeyFields run={run} />
              {run.hasInput ? (
                <InputField run={run} maxHeight={isEmbedded ? Infinity : 320} />
              ) : (
                <p className="text-sm text-muted">
                  This handler takes no input
                </p>
              )}
              {isAdvancedOpen && <AdvancedFields run={run} isWide />}
              <div className="flex items-center gap-3">
                <Hint
                  stage="playground-run"
                  service={contract.name}
                  isShown={!run.runner.latestRun}
                  placement="bottom start"
                  content={runHint(runLabel(run))}
                >
                  <SendButton run={run} />
                </Hint>
                <span className="hidden text-2xs text-subtle @md/full:inline">
                  ⌘ or Ctrl + Enter
                </span>
                {run.runner.isSending && (
                  <Button
                    variant="secondary"
                    className="rounded-lg px-3 py-1.5 text-sm"
                    onClick={run.runner.cancel}
                  >
                    Cancel
                  </Button>
                )}
                <div className="ml-auto">
                  <AdvancedToggle
                    run={run}
                    isOpen={isAdvancedOpen}
                    onChange={setIsAdvancedOpen}
                  />
                </div>
              </div>
            </form>
            {run.runner.latestRun && (
              <RunResult
                key={run.runner.latestRun.id}
                record={run.runner.latestRun}
                runner={run.runner}
              />
            )}
          </div>
        )}
        {view === 'code' && (
          <div className={styles.body()}>
            <CodeView
              run={run}
              ingressUrl={ingressUrl}
              handlerKind={handlerKinds.get(handler.name)}
            />
          </div>
        )}
        {view === 'schema' && (
          <div className={styles.body()}>
            <SchemaView run={run} />
          </div>
        )}
      </div>
    </div>
  );
}

const toolSwitcherStyles = tv({
  base: 'flex min-w-0',
  variants: { hasRail: { true: 'md:hidden', false: '' } },
});

function ToolWorkspace({
  contract,
  tool,
  hasRail,
  handlerKinds,
  onSelect,
  ingressUrl,
  serviceType,
  layout,
  headerActions,
}: {
  contract: ServiceContract;
  tool: ContractInvocationTool;
  hasRail: boolean;
  handlerKinds: Map<string, RestateHandlerKind | undefined>;
  onSelect: (name: string) => void;
  ingressUrl: string;
  serviceType?: RestateServiceType;
  layout: Layout;
  headerActions?: ReactNode;
}) {
  const lookups = (['byId', 'byTarget'] as const).filter(
    (lookup) => tool[lookup],
  );
  const [lookup, setLookup] = useState<InvocationLookup>(lookups[0] ?? 'byId');
  const operation = tool[lookup];
  const styles = layoutStyles({ layout });
  return (
    <div className="@container/full min-h-0 min-w-0 flex-auto overflow-auto">
      <header className={styles.header()}>
        <div className="flex min-h-7 min-w-0 items-center gap-2">
          <div className={toolSwitcherStyles({ hasRail })}>
            <HandlerSwitcher
              contract={contract}
              tool={tool.kind}
              handlerKinds={handlerKinds}
              serviceType={serviceType}
              withTools
              onSelect={onSelect}
            />
          </div>
          {hasRail && (
            <h2 className="hidden text-sm font-semibold text-primary md:block">
              {TOOL_LABEL[tool.kind]}
            </h2>
          )}
          {headerActions && (
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {headerActions}
            </div>
          )}
        </div>
        {operation?.description && (
          <p className="line-clamp-2 text-0.5xs text-muted">
            {operation.description}
          </p>
        )}
        {lookups.length > 1 && (
          <SegmentedControl
            label="Find the invocation"
            className="mt-1 self-start"
            value={lookup}
            onChange={setLookup}
            options={[
              { value: 'byId', label: 'By invocation ID' },
              { value: 'byTarget', label: 'By target' },
            ]}
          />
        )}
      </header>
      {operation && (
        <ToolRunner
          key={lookup}
          contract={contract}
          tool={tool}
          lookup={lookup}
          operation={operation}
          ingressUrl={ingressUrl}
          serviceType={serviceType}
          className={styles.body()}
        />
      )}
    </div>
  );
}

function ToolRunner({
  contract,
  tool,
  lookup,
  operation,
  ingressUrl,
  serviceType,
  className,
}: {
  contract: ServiceContract;
  tool: ContractInvocationTool;
  lookup: InvocationLookup;
  operation: ContractOperation;
  ingressUrl: string;
  serviceType?: RestateServiceType;
  className?: string;
}) {
  const run = useOperationRun({
    service: contract.name,
    contract,
    operation,
    ingressUrl,
    serviceType,
    draftName: toolDraftName(tool.kind, lookup),
  });
  return (
    <div className={className}>
      <form
        aria-label={TOOL_LABEL[tool.kind]}
        className={cardStyles()}
        onSubmit={(event) => {
          event.preventDefault();
          submitRun(run, event.currentTarget);
        }}
      >
        <ParameterFields
          runner={run.runner}
          serviceType={serviceType}
          parameters={[...run.mainParameters, ...run.advancedParameters]}
        />
        <InputField run={run} label="Target" maxHeight={240} />
        {run.requiresApiKey && <ApiKeyField run={run} isWide={false} />}
        <div className="flex items-center gap-3">
          <RunButton runner={run.runner} label="Run" />
          <span className="hidden text-2xs text-subtle @md/full:inline">
            ⌘ or Ctrl + Enter
          </span>
          {run.runner.isSending && (
            <Button
              variant="secondary"
              className="rounded-lg px-3 py-1.5 text-sm"
              onClick={run.runner.cancel}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
      {run.runner.latestRun && (
        <RunResult
          key={run.runner.latestRun.id}
          record={run.runner.latestRun}
          runner={run.runner}
          isLookup
        />
      )}
    </div>
  );
}
