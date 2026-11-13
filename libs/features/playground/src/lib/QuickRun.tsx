import { useRef, useState } from 'react';
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
  InputField,
  KeyFields,
  runLabel,
  SendButton,
  submitRun,
} from './fields';
import { Hint, runHint } from './floating';
import { RunResult } from './outcome';
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
  const rootRef = useRef<HTMLDivElement>(null);
  const focusSoon = (selector: string) =>
    setTimeout(() =>
      rootRef.current?.querySelector<HTMLElement>(selector)?.focus(),
    );
  const latest = run.runner.latestRun;
  const showResult = Boolean(latest) && latest?.id !== dismissedRun;
  const description = handler.description ?? contract.description;

  return (
    <div
      ref={rootRef}
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
        <ResultPanel
          run={run}
          onEdit={() => {
            setDismissedRun(latest.id);
            focusSoon(FORM_FOCUS);
          }}
        />
      ) : (
        <form
          aria-label="Run"
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              submitRun(run, event.currentTarget, () => setIsAdvancedOpen(true))
            ) {
              focusSoon(RESULT_FOCUS);
            }
          }}
        >
          <KeyFields run={run} />
          {run.hasInput ? (
            <InputField run={run} maxHeight={260} />
          ) : (
            <p className="rounded-lg border border-dashed border-strong px-3 py-2 text-xs text-muted">
              This handler takes no input
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
                onClick={() => {
                  setDismissedRun(undefined);
                  focusSoon(RESULT_FOCUS);
                }}
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
                content={runHint(runLabel(run))}
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

const FORM_FOCUS = 'form input, form textarea, form button[type="submit"]';
const RESULT_FOCUS = 'section[aria-label="Result"] button';

function ResultPanel({ run, onEdit }: { run: HandlerRun; onEdit: () => void }) {
  const record = run.runner.latestRun;
  if (!record) {
    return null;
  }
  return (
    <RunResult
      key={record.id}
      record={record}
      runner={run.runner}
      variant="compact"
      actions={
        <Button
          variant="secondary"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm"
          onClick={record.isRunning ? run.runner.cancel : onEdit}
        >
          {record.isRunning ? (
            'Cancel'
          ) : (
            <>
              <Icon
                name={IconName.Pencil}
                className="h-3.5 w-3.5 text-subtle"
              />
              Edit and run again
            </>
          )}
        </Button>
      }
    />
  );
}
