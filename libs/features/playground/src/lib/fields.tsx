import { useId, useRef, useState, type ReactNode } from 'react';
import { Button } from '@restate/ui-button';
import { DropdownItem } from '@restate/ui-dropdown';
import { Switch } from '@restate/ui-form-field';
import { Icon, IconName } from '@restate/ui-icons';
import { JsonSchemaTree } from '@restate/ui-json-schema';
import { Spinner } from '@restate/ui-loading';
import { SplitButton } from '@restate/ui-split-button';
import { isJsonContentType, parameterField } from '@restate/util-openapi';
import { formatBytes } from '@restate/util-intl';
import type {
  ContractParameter,
  RestateServiceType,
} from '@restate/util-openapi';
import { tv } from '@restate/util-styles';
import { BodyEditor } from './BodyEditor';
import { SegmentedControl } from './SegmentedControl';
import { bodyModelUri, isTextContentType, randomId } from './request';
import { InfoPeek, Peek } from './floating';
import type { BaseMode, HandlerRun, OperationRun } from './useHandlerRun';

const FIELD_LABEL: Partial<Record<string, string>> = {
  invocationId: 'Invocation ID',
  scope: 'Scope',
  limitKey: 'Limit key',
  idempotencyKey: 'Idempotency key',
  delay: 'Start after',
};

const FIELD_PLACEHOLDER: Partial<Record<string, string>> = {
  invocationId: 'inv_…',
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

function ParamField({
  runner,
  serviceType,
  parameter,
}: {
  runner: HandlerRun['runner'];
  serviceType?: RestateServiceType;
  parameter: ContractParameter;
}) {
  const name = parameterField(parameter);
  const id = useId();
  const errorId = `${id}-error`;
  const error = runner.issueFor(name);
  const label = fieldLabel(parameter, serviceType);
  const info = fieldInfo(parameter, serviceType);
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-h-5 min-w-0 items-center gap-1">
        <label
          htmlFor={id}
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
          id={id}
          value={runner.parameterValue(parameter)}
          placeholder={fieldPlaceholder(parameter, serviceType)}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
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
        <p id={errorId} className="text-xs text-danger">
          {error === 'Required' ? `${label} is required` : error}
        </p>
      )}
    </div>
  );
}

export function KeyFields({ run }: { run: HandlerRun }) {
  return (
    <ParameterFields
      runner={run.runner}
      serviceType={run.serviceType}
      parameters={run.mainParameters}
    />
  );
}

export function ParameterFields({
  runner,
  serviceType,
  parameters,
}: {
  runner: HandlerRun['runner'];
  serviceType?: RestateServiceType;
  parameters: ContractParameter[];
}) {
  if (parameters.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-3">
      {parameters.map((parameter) => (
        <ParamField
          key={parameter.name}
          runner={runner}
          serviceType={serviceType}
          parameter={parameter}
        />
      ))}
    </div>
  );
}

function hasInputSchema(run: OperationRun) {
  const body = run.operation.body;
  return Boolean(
    body && body.schema !== undefined && isJsonContentType(body.contentType),
  );
}

function docsHref(description?: string) {
  return description?.match(/\[[^\]]+\]\((https?:[^)\s]+)\)/)?.[1];
}

const FLOW_CONTROL_DOCS = 'https://docs.restate.dev/services/flow-control';

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
    case 'invocationId':
      return (
        <>
          The ID Restate returned when the invocation started, shown on the
          invocation’s page
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

function SchemaPeek({ run }: { run: OperationRun }) {
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

function ResetInput({ run }: { run: OperationRun }) {
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

export function InputField({
  run,
  maxHeight,
  label,
}: {
  run: OperationRun;
  maxHeight?: number;
  label?: string;
}) {
  const { draft } = run.runner;
  const [isOpen, setIsOpen] = useState(
    () =>
      !run.isInputOptional || draft.rawBody !== '' || draft.bodyMode === 'file',
  );
  if (!run.hasInput) {
    return null;
  }
  if (!isOpen) {
    return (
      <div className="flex min-h-7 items-center gap-2">
        <span className="text-0.5xs font-medium text-secondary">
          {label ?? 'Input'}
        </span>
        <InfoPeek label="Input">
          This handler has no input schema, so it may take no input at all
        </InfoPeek>
        <Button
          variant="secondary"
          className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs"
          onClick={() => setIsOpen(true)}
        >
          <Icon name={IconName.Plus} className="h-3.5 w-3.5 text-subtle" />
          Add input
        </Button>
      </div>
    );
  }
  return <JsonInput run={run} maxHeight={maxHeight} label={label} />;
}

function JsonInput({
  run,
  className,
  label = 'Input',
  maxHeight,
}: {
  run: OperationRun;
  className?: string;
  label?: string | false;
  maxHeight?: number;
}) {
  const { runner, operation, service, draftName } = run;
  const body = operation.body;
  const containerRef = useRef<HTMLDivElement>(null);
  if (!run.hasInput || !body) {
    return null;
  }
  const isJson = isJsonContentType(body.contentType);
  const isText = isTextContentType(body.contentType);
  const isFileMode = runner.draft.bodyMode === 'file';
  const issue = runner.issueFor('body');
  return (
    <div ref={containerRef} className="flex min-w-0 flex-col gap-1.5">
      {label && (
        <div className="flex min-h-5 items-center gap-2">
          <span className="text-0.5xs font-medium text-secondary">{label}</span>
          <SchemaPeek run={run} />
          <div className="ml-auto flex items-center gap-1.5">
            {!isFileMode && <ResetInput run={run} />}
            {!isText && (
              <SegmentedControl
                label="Input source"
                value={runner.draft.bodyMode}
                onChange={(bodyMode) =>
                  runner.setDraft((previous) => ({ ...previous, bodyMode }))
                }
                options={[
                  { value: 'text', label: 'Text' },
                  { value: 'file', label: 'File' },
                ]}
              />
            )}
          </div>
        </div>
      )}
      {isFileMode ? (
        <FileInput run={run} />
      ) : (
        <BodyEditor
          className={editorStyles({ className })}
          modelUri={bodyModelUri(service, draftName, body.contentType)}
          value={runner.draft.rawBody}
          language={isJson ? 'json' : 'plaintext'}
          schemas={run.schemas}
          ariaLabel="Input"
          maxHeight={maxHeight}
          onChange={(rawBody) =>
            runner.setDraft((previous) => ({ ...previous, rawBody }))
          }
          onSubmit={() =>
            containerRef.current?.closest('form')?.requestSubmit()
          }
        />
      )}
      {issue && <p className="text-xs text-danger">{issue}</p>}
    </div>
  );
}

function FileInput({ run }: { run: OperationRun }) {
  const { runner } = run;
  const file = runner.draft.file;
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-inset bg-inset px-2 py-1.5">
      <label className="shrink-0 cursor-default rounded-md border bg-raised px-2 py-0.5 text-xs text-primary shadow-xs hover:wash-tint has-focus-visible:outline-2 has-focus-visible:outline-focus">
        Choose file
        <input
          type="file"
          aria-label="Input file"
          className="sr-only"
          onChange={(event) => {
            const next = event.target.files?.[0];
            event.target.value = '';
            if (next) {
              runner.setDraft((previous) => ({ ...previous, file: next }));
            }
          }}
        />
      </label>
      <span className="min-w-0 flex-auto truncate text-xs text-secondary">
        {file ? `${file.name} · ${formatBytes(file.size)}` : 'No file chosen'}
      </span>
      {file && (
        <Button
          variant="icon"
          aria-label="Remove file"
          className="shrink-0 p-1"
          onClick={() =>
            runner.setDraft((previous) => ({ ...previous, file: undefined }))
          }
        >
          <Icon name={IconName.X} className="h-3.5 w-3.5" />
        </Button>
      )}
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

export function RunButton({
  runner,
  label,
  className,
}: {
  runner: OperationRun['runner'];
  label: string;
  className?: string;
}) {
  return (
    <Button
      type="submit"
      variant="primary"
      aria-keyshortcuts="Meta+Enter Control+Enter"
      className={sendStyles({ className })}
    >
      {runner.isSending ? (
        <Spinner className="h-3.5 w-3.5" />
      ) : (
        <Icon name={IconName.Play} className="h-3.5 w-3.5 fill-current" />
      )}
      {label}
    </Button>
  );
}

export function submitRun(
  run: OperationRun,
  form: HTMLFormElement,
  onHiddenIssue?: () => void,
) {
  const issues = run.submit();
  if (issues.length === 0) {
    return;
  }
  const hidden = new Set(
    [...run.advancedParameters, ...run.scopeParameters].map(parameterField),
  );
  if (onHiddenIssue && issues.some(({ field }) => hidden.has(field))) {
    onHiddenIssue();
  }
  setTimeout(() =>
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
  );
}

export function runLabel(run: HandlerRun) {
  return run.availableModes.length > 0 ? MODE_COPY[run.base].label : 'Run';
}

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
    <RunButton
      runner={runner}
      label={runLabel(run)}
      className={sendStyles({ isSplit, className })}
    />
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
  variants: {
    isWide: { true: 'grid-cols-1 @xl/full:grid-cols-2', false: 'grid-cols-1' },
  },
});

const flowControlStyles = tv({
  base: 'flex items-center',
  variants: { isWide: { true: '@xl/full:col-span-2', false: '' } },
});

function hasAdvancedOptions(run: HandlerRun) {
  return (
    run.advancedParameters.length > 0 || run.canScope || run.requiresApiKey
  );
}

export function ApiKeyField({
  run,
  isWide,
}: {
  run: OperationRun;
  isWide: boolean;
}) {
  const { apiKeyState, setApiKeyState } = run;
  return (
    <div
      className={flowControlStyles({
        isWide,
        className: 'flex-col items-stretch gap-2',
      })}
    >
      <div className="flex items-center">
        <Switch
          isSelected={apiKeyState.isVisible}
          onChange={(isVisible) => setApiKeyState({ isVisible, value: '' })}
          className="text-0.5xs"
        >
          Use an API key
        </Switch>
        <span className="ml-1 inline-flex">
          <InfoPeek label="API key">
            Requests use your current session unless you paste an API key, which
            stays only in this tab’s memory
          </InfoPeek>
        </span>
      </div>
      {apiKeyState.isVisible && (
        <input
          type="password"
          aria-label="API key"
          value={apiKeyState.value}
          placeholder="Paste an API key"
          autoComplete="off"
          className={fieldInputStyles()}
          onChange={(event) =>
            setApiKeyState({ isVisible: true, value: event.target.value })
          }
        />
      )}
    </div>
  );
}

export function AdvancedToggle({
  run,
  isOpen,
  onChange,
}: {
  run: HandlerRun;
  isOpen: boolean;
  onChange: (isOpen: boolean) => void;
}) {
  if (!hasAdvancedOptions(run)) {
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
  if (!hasAdvancedOptions(run)) {
    return null;
  }
  return (
    <section aria-label="Advanced" className={advancedStyles({ isWide })}>
      {run.requiresApiKey && <ApiKeyField run={run} isWide={isWide} />}
      {run.advancedParameters.map((parameter) => (
        <ParamField
          key={parameter.name}
          runner={run.runner}
          serviceType={run.serviceType}
          parameter={parameter}
        />
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
          <ParamField
            key={parameter.name}
            runner={run.runner}
            serviceType={run.serviceType}
            parameter={parameter}
          />
        ))}
    </section>
  );
}
