import { useState } from 'react';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { Spinner } from '@restate/ui-loading';
import { HoverTooltip } from '@restate/ui-tooltip';
import type {
  ContractHandler,
  RestateServiceType,
  ServiceContract,
} from '@restate/util-openapi';
import { HandlerSwitcher, useServiceHandler } from './Frame';
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

export interface QuickRunProps {
  service: string;
  handler?: string;
  onOpenFull: (handler: string) => void;
}

export function QuickRun({ service, handler, onOpenFull }: QuickRunProps) {
  const [selected, setSelected] = useState(handler);
  const loaded = useServiceHandler(service, selected, (next) =>
    setSelected(next),
  );
  const { contract } = loaded;
  const current = loaded.handler;

  if (!contract || !current) {
    return (
      <div className="flex min-h-32 w-[30rem] max-w-[calc(100vw-2rem)] items-center justify-center gap-2 p-4 text-sm text-muted">
        {loaded.isPending && <Spinner className="h-4 w-4" />}
        {loaded.error
          ? 'Couldn’t load this service.'
          : loaded.isPending
            ? 'Loading…'
            : 'This service has no handlers to run.'}
      </div>
    );
  }
  return (
    <QuickRunBody
      key={current.name}
      contract={contract}
      handler={current}
      handlerKinds={loaded.handlerKinds}
      ingressUrl={loaded.ingressUrl}
      serviceType={loaded.serviceType}
      onSelect={loaded.select}
      onOpenFull={() => onOpenFull(current.name)}
    />
  );
}

function QuickRunBody({
  contract,
  handler,
  handlerKinds,
  ingressUrl,
  serviceType,
  onSelect,
  onOpenFull,
}: {
  contract: ServiceContract;
  handler: ContractHandler;
  handlerKinds: ReturnType<typeof useServiceHandler>['handlerKinds'];
  ingressUrl: string;
  serviceType?: RestateServiceType;
  onSelect: (name: string) => void;
  onOpenFull: () => void;
}) {
  const run = useHandlerRun({
    service: contract.name,
    contract,
    handler,
    ingressUrl,
    serviceType,
  });
  const [dismissedRun, setDismissedRun] = useState<number>();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const latest = run.runner.latestRun;
  const showResult = Boolean(latest) && latest?.id !== dismissedRun;
  const description = handler.description ?? contract.description;

  return (
    <div
      className="flex w-[32rem] max-w-[calc(100vw-2rem)] flex-col gap-3 p-3"
      data-ignore-shortcut="true"
    >
      <div className="flex min-w-0 items-center gap-2">
        <HandlerSwitcher
          contract={contract}
          handler={handler}
          handlerKinds={handlerKinds}
          serviceType={serviceType}
          serviceKey={run.runner.roleValue('key')}
          onSelect={onSelect}
        />
        <div className="ml-auto shrink-0">
          <HoverTooltip content="Open the full playground">
            <Button
              variant="icon"
              aria-label="Open the full playground"
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              onClick={onOpenFull}
            >
              <Icon
                name={IconName.Maximize}
                className="h-3.5 w-3.5 text-muted"
              />
            </Button>
          </HoverTooltip>
        </div>
      </div>
      {description && !showResult && (
        <p className="-mt-1 line-clamp-2 px-0.5 text-xs text-muted">
          {description}
        </p>
      )}
      {showResult && latest ? (
        <ResultPanel run={run} onEdit={() => setDismissedRun(latest.id)} />
      ) : (
        <form
          aria-label="Run"
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            run.submit();
          }}
        >
          <KeyFields run={run} />
          {run.hasInput ? (
            <JsonInput run={run} maxHeight={260} />
          ) : (
            <p className="rounded-lg border border-dashed border-strong px-3 py-2 text-xs text-muted">
              This handler takes no input. Just send it.
            </p>
          )}
          {isAdvancedOpen && <AdvancedFields run={run} />}
          <div className="flex items-center gap-2">
            <AdvancedToggle
              run={run}
              isOpen={isAdvancedOpen}
              onChange={setIsAdvancedOpen}
            />
            {latest && (
              <Button
                variant="icon"
                className="rounded-md px-1.5 py-1 text-xs text-muted hover:text-secondary"
                onClick={() => setDismissedRun(undefined)}
              >
                Last result
              </Button>
            )}
            <div className="ml-auto">
              <Hint
                stage="playground-run"
                service={contract.name}
                isShown={!latest}
                placement="bottom end"
                content={RUN_HINT}
              >
                <SendButton run={run} />
              </Hint>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

function ResultPanel({ run, onEdit }: { run: HandlerRun; onEdit: () => void }) {
  const view = useRunView(run.runner.latestRun, run.runner);
  if (!view) {
    return null;
  }
  const invocationId = viewInvocationId(view);
  const value = viewValue(view);
  const message = viewMessage(view);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5 rounded-xl border bg-surface p-3 shadow-xs">
        <div className="flex min-w-0 items-center gap-2">
          <StatusDot tone={viewTone(view)} />
          <span className="text-sm font-semibold text-primary">
            {viewTitle(view)}
          </span>
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
        {view.phase === 'invocation' && !view.isDone && !message && (
          <p className="text-xs text-muted">
            {view.note ??
              'Restate is running it. You can close this; it keeps going.'}
          </p>
        )}
        {value && <ValueBlock result={value} className="max-h-48" />}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm"
          onClick={onEdit}
        >
          <Icon name={IconName.Pencil} className="h-3.5 w-3.5 text-subtle" />
          Edit and run again
        </Button>
        {invocationId && (
          <div className="ml-auto">
            <Hint
              stage="playground-result"
              placement="bottom end"
              content={RESULT_HINT}
            >
              <OpenInvocation
                invocationId={invocationId}
                variant="button"
                isPulsing={view.phase === 'invocation'}
              />
            </Hint>
          </div>
        )}
      </div>
    </div>
  );
}
