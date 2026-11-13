import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { ServiceTarget } from '@restate/features-service-target';
import { formatMilliseconds } from '@restate/util-intl';
import { tv } from '@restate/util-styles';
import type {
  ContractHandler,
  RestateHandlerKind,
  RestateServiceType,
  ServiceContract,
} from '@restate/util-openapi';
import type { PlaygroundProps } from '../Playground';
import {
  CodeView,
  HandlerRail,
  HandlerSwitcher,
  LoadingState,
  SchemaView,
  targetStyles,
  useServiceHandler,
} from './Frame';
import { Steps } from './Steps';
import {
  AdvancedFields,
  AdvancedToggle,
  JsonInput,
  KeyFields,
  SendButton,
} from './fields';
import { Hint, RESULT_HINT, RUN_HINT } from './floating';
import {
  InvocationIdLink,
  OpenInvocation,
  type RunView,
  StatusDot,
  useRunView,
  ValueBlock,
  viewInvocationId,
  viewMessage,
  viewTitle,
  viewTone,
  viewValue,
} from './outcome';
import { type HandlerRun, useHandlerRun } from './useHandlerRun';

export function FullPlayground(props: PlaygroundProps) {
  const loaded = useServiceHandler(
    props.service,
    props.handler,
    props.onSelect,
  );
  const { contract, handler } = loaded;
  if (!contract || !handler) {
    return (
      <LoadingState
        error={loaded.error}
        isPending={loaded.isPending}
        actions={props.headerActions}
      />
    );
  }
  const showRail =
    props.showNavigation !== false && contract.handlers.length > 1;
  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0"
      data-ignore-shortcut="true"
    >
      {showRail && (
        <HandlerRail
          contract={contract}
          handler={handler}
          handlerKinds={loaded.handlerKinds}
          onSelect={loaded.select}
        />
      )}
      <Workspace
        key={handler.name}
        contract={contract}
        handler={handler}
        handlerKinds={loaded.handlerKinds}
        ingressUrl={loaded.ingressUrl}
        serviceType={loaded.serviceType}
        showSwitcher={!showRail}
        layout={
          props.scroll === 'page'
            ? 'embed'
            : props.showNavigation === false
              ? 'panel'
              : 'sheet'
        }
        showDescription={props.scroll !== 'page' || !showRail}
        onSelect={loaded.select}
        headerActions={props.headerActions}
      />
    </div>
  );
}

const cardStyles = tv({
  base: 'flex min-w-0 flex-col gap-4 rounded-xl border bg-surface p-4 shadow-xs',
});

type View = 'invoke' | 'code' | 'schema';

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

function ViewTabs({
  value,
  onChange,
}: {
  value: View;
  onChange: (value: View) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="View"
      className="mt-1 inline-flex gap-0.5 self-start rounded-xl bg-tint-subtle p-1"
    >
      {VIEWS.map((option) => {
        const styles = viewTabStyles({ isSelected: option.value === value });
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={option.value === value}
            className={styles.tab()}
            onClick={() => onChange(option.value)}
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
  showSwitcher,
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
  showSwitcher: boolean;
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
  const isEmbedded = layout === 'embed';
  const styles = layoutStyles({ layout });
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(
    () => run.changedOptions > 0,
  );
  const runView = useRunView(run.runner.latestRun, run.runner);
  const description = handler.description ?? contract.description;
  const serviceKey = run.runner.roleValue('key');

  return (
    <div className="@container/full min-h-0 min-w-0 flex-auto overflow-auto">
      <header className={styles.header()}>
        {!isEmbedded && (
          <div className="flex min-w-0 items-center gap-2">
            {showSwitcher ? (
              <HandlerSwitcher
                contract={contract}
                handler={handler}
                handlerKinds={handlerKinds}
                serviceType={serviceType}
                serviceKey={serviceKey}
                onSelect={onSelect}
              />
            ) : (
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
            )}
            {headerActions && (
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                {headerActions}
              </div>
            )}
          </div>
        )}
        {description && showDescription && (
          <p className="line-clamp-2 text-0.5xs text-muted" title={description}>
            {description}
          </p>
        )}
        <ViewTabs value={view} onChange={setView} />
      </header>
      {view === 'invoke' && (
        <div className={styles.body()}>
          <form
            aria-label="Invoke"
            className={cardStyles()}
            onSubmit={(event) => {
              event.preventDefault();
              run.submit();
            }}
          >
            <KeyFields run={run} />
            {run.hasInput ? (
              <JsonInput run={run} maxHeight={isEmbedded ? Infinity : 320} />
            ) : (
              <p className="text-sm text-muted">This handler takes no input.</p>
            )}
            {isAdvancedOpen && <AdvancedFields run={run} isWide />}
            <div className="flex items-center gap-3">
              <Hint
                stage="playground-run"
                service={contract.name}
                isShown={run.runner.runs.length === 0}
                placement="bottom start"
                content={RUN_HINT}
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
          {runView && (
            <ResultCard key={run.runner.latestRun?.id} view={runView} />
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
  );
}

function ResultCard({ view }: { view: RunView }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);
  const invocationId = viewInvocationId(view);
  const value = viewValue(view);
  const message = viewMessage(view);
  return (
    <section
      ref={ref}
      aria-label="Result"
      className={cardStyles({ className: 'scroll-mb-6 gap-3' })}
    >
      <div className="flex min-w-0 items-center gap-2">
        <StatusDot tone={viewTone(view)} />
        <span className="text-sm font-semibold text-primary">
          {viewTitle(view)}
        </span>
        {view.phase === 'answered' && view.result.kind === 'response' && (
          <span className="text-2xs text-subtle tabular-nums">
            {formatMilliseconds(Math.round(view.result.durationMs))}
          </span>
        )}
        {invocationId && (
          <div className="ml-auto flex min-w-0">
            <InvocationIdLink invocationId={invocationId} />
          </div>
        )}
      </div>
      {message && (
        <p className="line-clamp-4 font-mono text-xs break-words text-danger-strong">
          {message}
        </p>
      )}
      {view.phase === 'invocation' && (
        <Steps
          invocationId={view.invocationId}
          isDone={view.isDone}
          note={view.note}
        />
      )}
      {value && (
        <div className="flex flex-col gap-1.5">
          <span className="text-2xs font-medium text-muted uppercase">
            Result
          </span>
          <ValueBlock result={value} />
        </div>
      )}
      {(invocationId || (view.phase === 'invocation' && view.checkAgain)) && (
        <div className="flex flex-wrap items-center gap-2">
          {invocationId && (
            <Hint
              stage="playground-result"
              placement="bottom start"
              content={RESULT_HINT}
            >
              <OpenInvocation
                invocationId={invocationId}
                variant={
                  view.phase === 'invocation' ? 'button' : 'secondary-button'
                }
                isPulsing={view.phase === 'invocation' && view.isDone}
              />
            </Hint>
          )}
          {view.phase === 'invocation' && view.checkAgain && (
            <Button
              variant="secondary"
              className="rounded-lg px-3 py-1.5 text-sm"
              onClick={view.checkAgain}
            >
              Check again
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
