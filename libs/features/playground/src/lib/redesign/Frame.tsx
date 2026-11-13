import { startTransition, useState, type ReactNode } from 'react';
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
import type {
  ContractHandler,
  HandlerMode,
  RestateHandlerKind,
  RestateServiceType,
  ServiceContract,
} from '@restate/util-openapi';
import { CodeSamples } from '../CodeSamples';
import { JsonSchemaTree } from '@restate/ui-json-schema';
import { useServiceContract } from '../useServiceContract';
import type { HandlerRun } from './useHandlerRun';

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
  const handler =
    handlers.find((candidate) => candidate.name === selected) ?? handlers[0];
  const select = (next: string) => {
    setSelected(next);
    startTransition(() => onSelect(next, true));
  };
  return { ...loaded, handler, select };
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
          {isPending && <Spinner className="h-4 w-4" />}
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
  handlerKinds,
  serviceType,
  serviceKey,
  onSelect,
}: {
  contract: ServiceContract;
  handler: ContractHandler;
  handlerKinds: Map<string, RestateHandlerKind | undefined>;
  serviceType?: RestateServiceType;
  serviceKey?: string;
  onSelect: (handler: string) => void;
}) {
  if (contract.handlers.length < 2) {
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
  return (
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
            variant="icon"
            aria-label={`Handler ${handler.name}, change handler`}
            className="-mx-1.5 flex h-full min-w-0 items-center gap-1 rounded-sm py-0 pr-1 pl-0.5 [font-size:inherit] [line-height:inherit] text-inherit shadow-none hover:bg-tint-subtle pressed:bg-tint-strong"
          >
            <Icon
              name={IconName.Function}
              className="-mr-1 h-5 w-5 shrink-0 text-subtle"
            />
            <span className="min-w-0 truncate font-medium text-muted italic">
              {handler.name}()
            </span>
            <Icon
              name={IconName.ChevronsUpDown}
              className="h-3.5 w-3.5 shrink-0 text-subtle"
            />
          </Button>
        </DropdownTrigger>
        <DropdownPopover placement="bottom start" className="w-72">
          <DropdownSection title="Handlers">
            <DropdownMenu
              selectable
              selectedItems={[handler.name]}
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
        </DropdownPopover>
      </Dropdown>
    </ServiceTarget>
  );
}

export function CodeView({
  run,
  ingressUrl,
  handlerKind,
}: {
  run: HandlerRun;
  ingressUrl: string;
  handlerKind?: RestateHandlerKind;
}) {
  const { runner, serviceType, contract, handler, operation, base } = run;
  return (
    <div className="[&_code]:text-xs [&_code]:leading-normal">
      <CodeSamples
        samples={{
          request: runner.request,
          client:
            serviceType && run.availableModes.length > 0
              ? {
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
                  idempotencyKey:
                    runner.roleValue('idempotencyKey') || undefined,
                  limitKey: runner.roleValue('limitKey') || undefined,
                  delayMs: runner.delayMs,
                  body: runner.bodyText || undefined,
                  bodyContentType: operation.body?.contentType,
                }
              : undefined,
        }}
      />
    </div>
  );
}

const schemaSectionStyles = tv({
  slots: {
    section:
      'flex min-w-0 flex-col gap-2 rounded-xl border bg-surface p-4 shadow-xs',
    title: 'text-0.5xs font-medium text-secondary',
    empty: 'text-sm text-muted',
  },
});

export function SchemaView({ run }: { run: HandlerRun }) {
  const { handler, contract } = run;
  const operation =
    handler.modes.call ??
    handler.modes.send ??
    Object.values(handler.modes).find(Boolean);
  const body = operation?.body;
  const output = handler.modes.call?.responses.find(({ status }) =>
    status.startsWith('2'),
  );
  const styles = schemaSectionStyles();
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Input" className={styles.section()}>
        <h3 className={styles.title()}>Input</h3>
        {body && (body.schema !== undefined || body.required) ? (
          <JsonSchemaTree
            schema={body.schema}
            root={contract.document}
            mode="write"
            emptyText={
              /json/i.test(body.contentType)
                ? 'Any JSON value'
                : `Raw ${body.contentType} content`
            }
          />
        ) : (
          <p className={styles.empty()}>This handler takes no input</p>
        )}
      </section>
      <section aria-label="Output" className={styles.section()}>
        <h3 className={styles.title()}>Output</h3>
        {output && (output.schema !== undefined || output.contentType) ? (
          <JsonSchemaTree
            schema={output.schema}
            root={contract.document}
            mode="read"
            emptyText={
              output.contentType && !/json/i.test(output.contentType)
                ? `Raw ${output.contentType} content`
                : 'Any JSON value'
            }
          />
        ) : (
          <p className={styles.empty()}>This handler returns nothing</p>
        )}
      </section>
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

export function HandlerRail({
  contract,
  handler,
  handlerKinds,
  onSelect,
}: {
  contract: ServiceContract;
  handler: ContractHandler;
  handlerKinds: Map<string, RestateHandlerKind | undefined>;
  onSelect: (name: string) => void;
}) {
  return (
    <nav
      aria-label="Handlers"
      className="hidden w-60 shrink-0 flex-col gap-2 overflow-auto border-r bg-subtle p-3 md:flex"
    >
      <span className="px-2.5 pt-1 text-2xs font-medium text-muted uppercase">
        Handlers
      </span>
      <ul className="flex flex-col gap-0.5">
        {contract.handlers.map((candidate) => {
          const kind = handlerKinds.get(candidate.name);
          const isSelected = candidate.name === handler.name;
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
    </nav>
  );
}
