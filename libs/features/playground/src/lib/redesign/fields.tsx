import { type ReactNode } from 'react';
import { Button } from '@restate/ui-button';
import { DropdownItem } from '@restate/ui-dropdown';
import { Switch } from '@restate/ui-form-field';
import { Icon, IconName } from '@restate/ui-icons';
import { JsonSchemaTree } from '@restate/ui-json-schema';
import { Spinner } from '@restate/ui-loading';
import { SplitButton } from '@restate/ui-split-button';
import { parameterField } from '@restate/util-openapi';
import type {
  ContractParameter,
  RestateServiceType,
} from '@restate/util-openapi';
import { tv } from '@restate/util-styles';
import { BodyEditor } from '../BodyEditor';
import { randomId } from '../TryIt';
import { InfoPeek, Peek } from './floating';
import type { BaseMode, HandlerRun } from './useHandlerRun';

const FIELD_LABEL: Partial<Record<string, string>> = {
  scope: 'Scope',
  limitKey: 'Limit key',
  idempotencyKey: 'Idempotency key',
  delay: 'Start after',
};

const FIELD_PLACEHOLDER: Partial<Record<string, string>> = {
  scope: 'e.g. tenant-a',
  limitKey: 'e.g. user-42',
  idempotencyKey: 'Any unique string',
  delay: 'e.g. 10s, 5m or 1h',
};

function fieldLabel(
  parameter: ContractParameter,
  serviceType?: RestateServiceType,
) {
  if (parameter.role === 'key') {
    return serviceType === 'Workflow' ? 'Workflow ID' : 'Object key';
  }
  return (parameter.role && FIELD_LABEL[parameter.role]) ?? parameter.name;
}

function fieldPlaceholder(
  parameter: ContractParameter,
  serviceType?: RestateServiceType,
) {
  if (parameter.example !== undefined) {
    return `e.g. ${String(parameter.example)}`;
  }
  if (parameter.role === 'key') {
    return serviceType === 'Workflow' ? 'e.g. signup-ada' : 'e.g. user-123';
  }
  return parameter.role ? FIELD_PLACEHOLDER[parameter.role] : undefined;
}

const fieldInputStyles = tv({
  base: 'w-full min-w-0 rounded-lg border border-inset bg-inset px-2.5 py-1.5 text-sm text-primary shadow-[inset_0_1px_2px_0px_var(--box-shadow-color-inset)] placeholder:text-placeholder focus:outline-2 focus:outline-focus',
  variants: {
    isInvalid: { true: 'border-danger-strong bg-danger-muted/70' },
  },
});

export function ParamField({
  run,
  parameter,
}: {
  run: HandlerRun;
  parameter: ContractParameter;
}) {
  const { runner, serviceType } = run;
  const name = parameterField(parameter);
  const error = runner.issueFor(name);
  const label = fieldLabel(parameter, serviceType);
  const info = fieldInfo(parameter, serviceType);
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-h-5 min-w-0 items-center gap-1">
        <label
          htmlFor={name}
          className="min-w-0 truncate text-0.5xs font-medium text-secondary"
        >
          {label}
        </label>
        {info && (
          <InfoPeek label={label} href={docsHref(parameter.description)}>
            {info}
          </InfoPeek>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <input
          id={name}
          value={runner.parameterValue(parameter)}
          placeholder={fieldPlaceholder(parameter, serviceType)}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(error)}
          className={fieldInputStyles({ isInvalid: Boolean(error) })}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          onChange={(event) =>
            runner.setParameter(parameter, event.target.value)
          }
        />
        {parameter.role === 'idempotencyKey' && (
          <Button
            variant="secondary"
            className="flex shrink-0 items-center gap-1.5 self-stretch rounded-lg px-2.5 py-1 text-xs"
            onClick={() => runner.setParameter(parameter, randomId())}
          >
            <Icon name={IconName.Wand} className="h-3.5 w-3.5" />
            Generate
          </Button>
        )}
      </div>
      {error && (
        <p className="text-xs text-danger">
          {error === 'Required' ? `${label} is required` : error}
        </p>
      )}
    </div>
  );
}

export function KeyFields({ run }: { run: HandlerRun }) {
  if (run.mainParameters.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-3">
      {run.mainParameters.map((parameter) => (
        <ParamField key={parameter.name} run={run} parameter={parameter} />
      ))}
    </div>
  );
}

export function hasInputSchema(run: HandlerRun) {
  const body = run.operation.body;
  return (
    run.hasInput && body?.schema !== undefined && /json/i.test(body.contentType)
  );
}

function docsHref(description?: string) {
  return description?.match(/\[[^\]]+\]\((https?:[^)\s]+)\)/)?.[1];
}

export const FLOW_CONTROL_DOCS =
  'https://docs.restate.dev/services/flow-control';

function fieldInfo(
  parameter: ContractParameter,
  serviceType?: RestateServiceType,
): ReactNode {
  switch (parameter.role) {
    case 'key':
      return serviceType === 'Workflow' ? (
        <>
          Picks the workflow: <Mono>run</Mono> executes once per ID, and the
          other handlers read or signal that run
        </>
      ) : (
        <>
          Picks the object: calls with the same key share its state, and its
          exclusive handlers run one at a time
        </>
      );
    case 'idempotencyKey':
      return (
        <>
          Makes the request safe to repeat: requests with the same key run the
          handler once and get the same result
        </>
      );
    case 'delay':
      return (
        <>
          Starts the invocation later instead of right away, for example{' '}
          <Mono>10s</Mono>, <Mono>5m</Mono> or <Mono>1h</Mono>
        </>
      );
    case 'scope':
      return (
        <>
          The group the flow control rules apply to, such as one scope per
          tenant
        </>
      );
    case 'limitKey':
      return (
        <>
          Narrows the rules inside the scope, for example <Mono>user-1</Mono> or{' '}
          <Mono>team-a/user-1</Mono>
        </>
      );
    default:
      return undefined;
  }
}

function Mono({ children }: { children: ReactNode }) {
  return <code className="font-mono text-[0.95em]">{children}</code>;
}

export function SchemaPeek({ run }: { run: HandlerRun }) {
  if (!hasInputSchema(run)) {
    return null;
  }
  return (
    <Peek
      label="Show the input schema"
      panelClassName="max-h-80 w-80 overflow-auto"
    >
      <JsonSchemaTree
        schema={run.operation.body?.schema}
        root={run.contract.document}
        mode="write"
        emptyText="Any JSON value"
      />
    </Peek>
  );
}

const editorStyles = tv({
  base: 'min-h-24',
});

export function ResetInput({ run }: { run: HandlerRun }) {
  const { runner } = run;
  if (
    runner.exampleBody === '' ||
    runner.draft.rawBody === runner.exampleBody
  ) {
    return null;
  }
  return (
    <Button
      variant="icon"
      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs text-muted hover:text-secondary"
      onClick={() =>
        runner.setDraft((previous) => ({
          ...previous,
          rawBody: runner.exampleBody,
        }))
      }
    >
      <Icon name={IconName.RetryNow} className="h-3 w-3" />
      Reset
    </Button>
  );
}

export function JsonInput({
  run,
  className,
  label = true,
  maxHeight,
}: {
  run: HandlerRun;
  className?: string;
  label?: boolean;
  maxHeight?: number;
}) {
  const { runner, operation, service, handler } = run;
  if (!run.hasInput) {
    return null;
  }
  const isJson = /json/i.test(operation.body?.contentType ?? '');
  const issue = runner.issueFor('body');
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label && (
        <div className="flex min-h-5 items-center gap-2">
          <span className="text-0.5xs font-medium text-secondary">Input</span>
          <SchemaPeek run={run} />
          <div className="ml-auto">
            <ResetInput run={run} />
          </div>
        </div>
      )}
      <BodyEditor
        className={editorStyles({ className })}
        modelUri={`inmemory://redesign/${service}/${handler.name}.${isJson ? 'json' : 'txt'}`}
        value={runner.draft.rawBody}
        language={isJson ? 'json' : 'plaintext'}
        schemas={run.schemas}
        ariaLabel="Input"
        maxHeight={maxHeight}
        onChange={(rawBody) =>
          runner.setDraft((previous) => ({ ...previous, rawBody }))
        }
        onSubmit={run.submit}
      />
      {issue && <p className="text-xs text-danger">{issue}</p>}
    </div>
  );
}

const MODE_COPY: Record<BaseMode, { label: string; description: string }> = {
  send: {
    label: 'Send',
    description: 'Start it and follow the invocation',
  },
  call: {
    label: 'Call',
    description: 'Wait here for the result',
  },
};

const sendStyles = tv({
  base: 'flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium',
  variants: {
    isSplit: { true: '-mr-px rounded-r-none', false: '' },
  },
});

export function SendButton({
  run,
  className,
}: {
  run: HandlerRun;
  className?: string;
}) {
  const { runner, base, availableModes } = run;
  const isSplit = availableModes.length > 1;
  const button = (
    <Button
      type="submit"
      variant="primary"
      disabled={runner.isSending}
      aria-keyshortcuts="Meta+Enter Control+Enter"
      className={sendStyles({ isSplit, className })}
    >
      {runner.isSending ? (
        <Spinner className="h-3.5 w-3.5" />
      ) : (
        <Icon name={IconName.Play} className="h-3.5 w-3.5 fill-current" />
      )}
      {availableModes.length > 0 ? MODE_COPY[base].label : 'Run'}
    </Button>
  );
  if (!isSplit) {
    return button;
  }
  return (
    <SplitButton
      mini={false}
      variant="primary"
      className="shrink-0 text-sm"
      splitClassName="rounded-r-lg px-1.5"
      onSelect={(key) => run.setBase(key as BaseMode)}
      menus={availableModes.map((mode) => (
        <DropdownItem key={mode} value={mode}>
          <span className="flex w-4 shrink-0 justify-center">
            {mode === base && (
              <Icon name={IconName.Check} className="h-3.5 w-3.5" />
            )}
          </span>
          <span className="flex flex-col">
            <span className="font-medium">{MODE_COPY[mode].label}</span>
            <span className="text-xs opacity-80">
              {MODE_COPY[mode].description}
            </span>
          </span>
        </DropdownItem>
      ))}
    >
      {button}
    </SplitButton>
  );
}

const advancedStyles = tv({
  base: 'grid gap-x-4 gap-y-3 border-t border-muted pt-4',
  variants: { isWide: { true: 'grid-cols-2', false: 'grid-cols-1' } },
});

const flowControlStyles = tv({
  base: 'flex items-center',
  variants: { isWide: { true: 'col-span-2', false: '' } },
});

export function AdvancedToggle({
  run,
  isOpen,
  onChange,
}: {
  run: HandlerRun;
  isOpen: boolean;
  onChange: (isOpen: boolean) => void;
}) {
  if (run.advancedParameters.length === 0 && !run.canScope) {
    return null;
  }
  return (
    <Button
      variant="secondary"
      aria-expanded={isOpen}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-0.5xs"
      onClick={() => onChange(!isOpen)}
    >
      Advanced
      {!isOpen && run.changedOptions > 0 && (
        <span className="rounded-full bg-muted px-1.5 text-2xs text-secondary tabular-nums">
          {run.changedOptions}
        </span>
      )}
      <Icon
        name={isOpen ? IconName.ChevronUp : IconName.ChevronDown}
        className="h-3.5 w-3.5 text-subtle"
      />
    </Button>
  );
}

export function AdvancedFields({
  run,
  isWide = false,
}: {
  run: HandlerRun;
  isWide?: boolean;
}) {
  if (run.advancedParameters.length === 0 && !run.canScope) {
    return null;
  }
  return (
    <section aria-label="Advanced" className={advancedStyles({ isWide })}>
      {run.advancedParameters.map((parameter) => (
        <ParamField key={parameter.name} run={run} parameter={parameter} />
      ))}
      {run.canScope && (
        <div className={flowControlStyles({ isWide })}>
          <Switch
            isSelected={run.isScoped}
            onChange={run.setIsScoped}
            className="text-0.5xs"
          >
            Flow control
          </Switch>
          <span className="ml-1 inline-flex">
            <InfoPeek label="Flow control" href={FLOW_CONTROL_DOCS}>
              Runs the invocation in a scope, so the cluster’s flow control
              rules, like concurrency limits, apply to it
            </InfoPeek>
          </span>
        </div>
      )}
      {run.isScoped &&
        run.scopeParameters.map((parameter) => (
          <ParamField key={parameter.name} run={run} parameter={parameter} />
        ))}
    </section>
  );
}
