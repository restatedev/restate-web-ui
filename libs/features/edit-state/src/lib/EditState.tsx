import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from '@restate/ui/dialog';
import { Form } from 'react-router';
import { Disclosure, DisclosurePanel } from 'react-aria-components';
import { Button, SubmitButton } from '@restate/ui/button';
import { ErrorBanner } from '@restate/ui/error';
import {
  FormFieldCode,
  FormFieldInput,
  FormFieldSelect,
} from '@restate/ui/form-field';
import { ListBoxItem } from '@restate/ui/listbox';
import {
  createContext,
  Dispatch,
  FormEvent,
  FormEventHandler,
  PropsWithChildren,
  ReactNode,
  use,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  convertStateToObject,
  useGetVirtualObjectQueue,
} from '@restate/data-access/admin-api-hooks';
import { showSuccessNotification } from '@restate/ui/notification';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@restate/ui/loading';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Badge } from '@restate/ui/badge';
import { useEditState, type EditStateValue } from './useEditState';

const styles = tv({
  base: '',
  slots: {
    banner: 'mt-2 flex gap-2 rounded-xl p-3 text-0.5xs',
    bannerIcon: 'h-5 w-5 shrink-0',
  },
  variants: {
    isWarning: {
      true: {
        banner: 'border border-orange-200 bg-orange-50 text-orange-600',
        bannerIcon: 'fill-orange-600 text-orange-100',
      },
      false: {
        banner: 'border border-blue-200 bg-blue-50 text-blue-600',
        bannerIcon: 'fill-blue-600 text-blue-100',
      },
    },
  },
});

const valueFormatStyles = tv({
  base: 'shrink-0 [&_button]:gap-1 [&_button]:border-none [&_button]:bg-transparent [&_button]:px-1.5 [&_button]:py-1 [&_button]:text-xs [&_button]:font-normal [&_button]:text-gray-500 [&_button]:shadow-none [&_button_[data-description]]:hidden [&_button:hover]:bg-black/3 [&_button:hover]:text-gray-700 [&>div]:rounded-lg [&>div]:border-none [&>div]:bg-transparent [&>div]:p-0 [&>div]:shadow-none',
});

const codeStyles = tv({
  base: 'mt-2 overflow-auto font-mono',
  variants: {
    isPending: {
      true: '[&_.view-line>span]:animate-scanlineSweep [&_.view-line>span]:[background-image:linear-gradient(90deg,--theme(--color-zinc-700)_0%,--theme(--color-zinc-700)_42%,--theme(--color-zinc-400)_50%,--theme(--color-zinc-700)_58%,--theme(--color-zinc-700)_100%)] [&_.view-line>span]:[background-size:250%_100%] [&_.view-line>span]:bg-clip-text [&_.view-line>span]:[background-position:100%_0] [&_.view-line>span]:bg-no-repeat [&_.view-line>span]:[-webkit-text-fill-color:transparent]',
    },
  },
});

const STATE_VALUE_EXPAND_THRESHOLD = 200;

type StateValueFormat = 'text' | 'binary';

type StateFormRowModel = {
  id: string;
  name?: string;
  value: string;
  defaultFormat: StateValueFormat;
};

type StateFormValues = Record<
  string,
  {
    text: string;
    defaultFormat: StateValueFormat;
  }
>;

function createStateFormRows(values: StateFormValues): StateFormRowModel[] {
  return Object.entries(values).map(([name, value]) => ({
    id: name,
    name,
    value: value.text,
    defaultFormat: value.defaultFormat,
  }));
}

function createStateFormRowId() {
  return Math.random().toString(36).slice(2);
}

const EditStateContext = createContext<{
  isEditing: boolean;
  key?: string;
  objectKey?: string;
  service?: string;
  resolveCodecMetadata?: boolean;
  scope?: string;
  setEditState: Dispatch<
    React.SetStateAction<{
      isEditing: boolean;
      isDeleting: boolean;
      key?: string;
      service?: string;
      objectKey?: string;
      resolveCodecMetadata?: boolean;
      scope?: string;
    }>
  >;
}>({
  isEditing: false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setEditState: () => {},
});

export function useEditStateContext() {
  return use(EditStateContext).setEditState;
}

export function EditState({ children }: PropsWithChildren) {
  const [editState, setEditState] = useState<{
    isEditing: boolean;
    isDeleting: boolean;
    key?: string;
    objectKey?: string;
    service?: string;
    resolveCodecMetadata?: boolean;
    scope?: string;
  }>({
    isEditing: false,
    isDeleting: false,
    key: undefined,
    objectKey: undefined,
  });
  return (
    <EditStateContext.Provider value={{ ...editState, setEditState }}>
      <EditStateInner
        isOpen={editState.isEditing}
        service={editState.service}
        objectKey={editState.objectKey}
        stateKey={editState.key}
        resolveCodecMetadata={editState.resolveCodecMetadata}
        scope={editState.scope}
        isDeleting={editState.isDeleting}
        onOpenChange={(isEditing) => setEditState((s) => ({ ...s, isEditing }))}
      />
      {children}
    </EditStateContext.Provider>
  );
}

function EditStateInner({
  service,
  objectKey,
  stateKey: key,
  resolveCodecMetadata,
  scope,
  isOpen,
  onOpenChange,
  isDeleting,
}: PropsWithChildren<{
  service?: string;
  stateKey?: string;
  objectKey?: string;
  scope?: string;
  resolveCodecMetadata?: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isDeleting?: boolean;
}>) {
  const { mutation, decodedQuery: query } = useEditState(
    service,
    objectKey,
    scope,
    {
      enabled: Boolean(service && objectKey),
      resolveCodecMetadata,
      onSuccess(data, variables) {
        onOpenChange(false);
        showSuccessNotification(
          'The state mutation has been successfully accepted for processing.',
        );
      },
    },
  );
  const isPartial = typeof key === 'string';

  const {
    data: queue,
    queryKey,
    isFetching,
  } = useGetVirtualObjectQueue(
    String(service),
    String(objectKey),
    undefined,
    scope,
    {
      enabled: Boolean(objectKey && service && isOpen),
      staleTime: 0,
      refetchOnMount: true,
    },
  );
  const queryClient = useQueryClient();
  const hasActiveInvocations = (queue?.size ?? 0) > 0;
  const stateVersion = query.data?.version ?? '';
  const decodedValues = query.data?.values;
  const editorValue = useMemo(
    () => (typeof key === 'undefined' ? undefined : decodedValues?.[key]?.text),
    [key, decodedValues],
  );

  const submitHandler = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (!isPartial && !isDeleting) {
      const state: Record<string, EditStateValue> = {};
      for (const row of formData.getAll('state-row')) {
        if (typeof row !== 'string') {
          continue;
        }

        const name = formData.get(`state-key-${row}`);
        const fieldValue = formData.get(`state-value-${row}`);
        if (
          typeof name === 'string' &&
          name &&
          typeof fieldValue === 'string'
        ) {
          state[name] =
            resolveValueFormat(
              fieldValue,
              formData.get(`state-format-${row}`),
            ) ?? '';
        }
      }
      mutation.mutate({ state, partial: false });
      return;
    }
    const value = isDeleting ? '{}' : formData.get('value');
    if (typeof value === 'string') {
      const obj: Record<string, EditStateValue> = isPartial
        ? { [key]: resolveValueFormat(value, formData.get('value-format')) }
        : stringifyValues(JSON.parse(value));
      mutation.mutate({ state: obj, partial: isPartial });
    }
  };
  const error = query.error || mutation.error;

  return (
    <Dialog
      open={Boolean(isOpen && service && objectKey)}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          mutation.reset();
        } else {
          queryClient.invalidateQueries({ queryKey });
        }
      }}
    >
      <Button className="hidden" />
      <StateDialogContent
        service={service}
        stateKey={key}
        hasActiveInvocations={hasActiveInvocations}
        isDeleting={isDeleting}
        isFetching={isFetching}
        error={error}
        onSubmit={submitHandler}
        isSubmitting={mutation.isPending}
        isFetchingState={query.isPending}
        title={
          isPartial ? (
            <>
              Update{' '}
              <Badge
                size="sm"
                className="align-middle font-mono text-base font-medium"
              >
                {key}
              </Badge>
            </>
          ) : isDeleting ? (
            'Delete state'
          ) : (
            'Replace state'
          )
        }
        subtitle={
          <>
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="text-gray-500">in</span>
              <Badge
                size="sm"
                className="max-w-[20ch] min-w-0 align-middle font-mono"
              >
                <TruncateWithTooltip copyText={service}>
                  {service}
                </TruncateWithTooltip>
              </Badge>
            </span>
            <span aria-hidden className="text-gray-400">
              ·
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="text-gray-500">key</span>
              <Badge
                size="sm"
                className="max-w-[20ch] min-w-0 align-middle font-mono"
              >
                <TruncateWithTooltip copyText={objectKey}>
                  {objectKey}
                </TruncateWithTooltip>
              </Badge>
            </span>
            {scope !== undefined && (
              <>
                <span aria-hidden className="text-gray-400">
                  ·
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="text-gray-500">scope</span>
                  <Badge
                    size="sm"
                    className="max-w-[20ch] min-w-0 align-middle font-mono"
                  >
                    <TruncateWithTooltip copyText={scope}>
                      {scope}
                    </TruncateWithTooltip>
                  </Badge>
                </span>
              </>
            )}
          </>
        }
      >
        {isDeleting && (
          <>
            <p className="mt-2 text-sm text-gray-500">
              Please confirm to proceed or close to keep the state.
            </p>
            <FormFieldInput
              autoFocus
              required
              pattern="delete"
              name="confirm"
              className="mt-2"
              placeholder='Type "delete" to confirm'
              errorMessage={(errors) => {
                const isMisMatch =
                  errors.validationDetails.patternMismatch &&
                  !errors.validationDetails.valueMissing;
                if (isMisMatch) {
                  return 'Type "delete" to confirm';
                }
                return errors.validationErrors;
              }}
            />
          </>
        )}
        {query.isPending && !isDeleting && !query.data && (
          <div className="min-h-20 w-full animate-pulse rounded-lg border border-gray-200 bg-slate-200 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]" />
        )}
        {query.data && !isDeleting && !isPartial && (
          <>
            <p className="mt-2 text-sm text-gray-500">
              Please update the current keys and values:
            </p>
            {decodedValues && (
              <StateFormRows
                key={JSON.stringify([service, objectKey, scope, stateVersion])}
                values={decodedValues}
                stateVersion={stateVersion}
                readonly={query.isPending}
                isPending={query.isPending}
                onInput={mutation.reset}
              />
            )}
          </>
        )}
        {query.data && !isDeleting && isPartial && (
          <>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-sm text-gray-500">
                Please update the current value:
              </p>
              {isPartial && (
                <ValueFormatSelect
                  key={`${service}/${objectKey}/${key}/${stateVersion}`}
                  name="value-format"
                  defaultFormat={
                    query.data?.values?.[key]?.defaultFormat ?? 'text'
                  }
                  disabled={query.isPending}
                />
              )}
            </div>
            <FormFieldCode
              autoFocus
              name="value"
              className={codeStyles({ isPending: query.isPending })}
              onInput={mutation.reset}
              readonly={query.isPending}
              value={editorValue}
            />
          </>
        )}
      </StateDialogContent>
    </Dialog>
  );
}

function StateFormRows({
  values,
  stateVersion,
  readonly,
  isPending,
  onInput,
}: {
  values: StateFormValues;
  stateVersion: string;
  readonly?: boolean;
  isPending?: boolean;
  onInput?: VoidFunction;
}) {
  const [stateRows, setStateRows] = useState(() => createStateFormRows(values));
  const rowsRef = useRef<HTMLDivElement | null>(null);

  const scrollRowsToBottom = () => {
    requestAnimationFrame(() => {
      const rows = rowsRef.current;
      rows?.scrollTo({ top: rows.scrollHeight, behavior: 'smooth' });
    });
  };

  return (
    <>
      <div
        ref={rowsRef}
        className="mt-2 flex max-h-[50vh] flex-col gap-1 overflow-y-auto rounded-xl border border-gray-200 bg-gray-100 p-1 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]"
      >
        {stateRows.map((row) => (
          <StateFormRow
            key={row.id}
            field={row.id}
            name={row.name}
            value={row.value}
            defaultFormat={row.defaultFormat}
            readonly={readonly}
            isPending={isPending}
            onInput={onInput}
            onRemove={() =>
              setStateRows((rows) => rows.filter(({ id }) => id !== row.id))
            }
          />
        ))}
      </div>
      <Button
        variant="secondary"
        type="button"
        disabled={readonly}
        onClick={() => {
          setStateRows((rows) => [
            ...rows,
            {
              id: createStateFormRowId(),
              value: '',
              defaultFormat: 'text',
            },
          ]);
          scrollRowsToBottom();
        }}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border-dashed bg-transparent px-3 py-1.5 text-sm text-gray-500 shadow-none hover:bg-gray-50"
      >
        <Icon name={IconName.Plus} className="h-3.5 w-3.5" /> Add key
      </Button>
    </>
  );
}

function StateFormRow({
  field,
  name,
  value,
  defaultFormat = 'text',
  readonly,
  isPending,
  onInput,
  onRemove,
}: {
  field: string;
  name?: string;
  value: string;
  defaultFormat?: StateValueFormat;
  readonly?: boolean;
  isPending?: boolean;
  onInput?: VoidFunction;
  onRemove: VoidFunction;
}) {
  const [isExpanded, setIsExpanded] = useState(
    value.length <= STATE_VALUE_EXPAND_THRESHOLD,
  );
  const [hasMountedEditor, setHasMountedEditor] = useState(isExpanded);
  const expandRow = () => {
    setIsExpanded(true);
    setHasMountedEditor(true);
  };

  return (
    <Disclosure
      isExpanded={isExpanded}
      onExpandedChange={(expanded) => {
        setIsExpanded(expanded);
        if (expanded) {
          setHasMountedEditor(true);
        }
      }}
      className="group shrink-0 overflow-hidden rounded-[0.625rem] border border-gray-200 bg-white shadow-xs"
    >
      <input type="hidden" name="state-row" value={field} />
      <div className="relative flex items-center gap-1.5 py-1.5 pr-2 pl-1.5">
        <Button
          slot="trigger"
          variant="icon"
          type="button"
          aria-label="Toggle value"
          className="absolute inset-0 z-0 h-full w-full rounded-none border-0 p-0 hover:bg-gray-50/80 pressed:bg-gray-100"
        />
        <div className="relative z-10 flex max-w-[48ch] shrink-0 cursor-text items-center rounded-lg border border-transparent transition-[background-color,border-color,box-shadow] focus-within:border-gray-200 focus-within:bg-gray-100 focus-within:shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] hover:border-gray-200 hover:bg-gray-100 hover:shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
          <span className="shrink-0 border-r border-gray-200/80 py-1 pr-2 pl-1.5 text-0.5xs font-medium text-gray-400 uppercase">
            key
          </span>
          <div className="min-w-0 shrink-0" onFocusCapture={expandRow}>
            <FormFieldInput
              required
              name={`state-key-${field}`}
              defaultValue={name}
              placeholder="key"
              className="[&_input]:[field-sizing:content] [&_input]:min-h-7 [&_input]:w-auto [&_input]:max-w-[40ch] [&_input]:min-w-[6ch] [&_input]:border-none [&_input]:bg-transparent [&_input]:px-1.5 [&_input]:py-1 [&_input]:font-mono [&_input]:text-xs [&_input]:shadow-none [&_input:focus]:outline-hidden [&>div]:min-h-7"
            />
          </div>
        </div>
        <div className="pointer-events-none min-h-7 flex-auto" />
        <ValueFormatSelect
          name={`state-format-${field}`}
          defaultFormat={defaultFormat}
          disabled={readonly}
          className="relative z-10"
        />
        <span
          aria-hidden
          className="pointer-events-none relative z-10 shrink-0 rounded-md p-1.5 text-gray-400 group-hover:text-gray-700"
        >
          <Icon
            name={IconName.ChevronDown}
            className="h-4 w-4 transition-transform group-expanded:rotate-180"
          />
        </span>
        <Button
          variant="icon"
          type="button"
          onClick={onRemove}
          aria-label={name ? `Remove ${name}` : 'Remove key'}
          className="relative z-10 shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
        >
          <Icon name={IconName.Trash} className="h-3.5 w-3.5" />
        </Button>
      </div>
      <DisclosurePanel className="border-t border-gray-200/75 bg-gray-50">
        <FormFieldCode
          name={`state-value-${field}`}
          value={value}
          mountEditor={hasMountedEditor}
          readonly={readonly}
          onInput={onInput}
          className={codeStyles({
            isPending,
            className:
              'mt-0 rounded-none border-none bg-transparent shadow-none',
          })}
        />
      </DisclosurePanel>
    </Disclosure>
  );
}

function ValueFormatSelect({
  name,
  defaultFormat,
  disabled,
  className,
}: {
  name: string;
  defaultFormat: StateValueFormat;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <FormFieldSelect
      name={name}
      defaultSelectedKey={defaultFormat}
      disabled={disabled}
      placeholder="Value format"
      className={valueFormatStyles({ className })}
    >
      <ListBoxItem value="text">
        <div>Text</div>
        <div data-description className="text-xs opacity-70">
          Edit as text
        </div>
      </ListBoxItem>
      <ListBoxItem value="binary">
        <div>Binary (Base64)</div>
        <div data-description className="text-xs opacity-70">
          Edit as Base64, store decoded bytes
        </div>
      </ListBoxItem>
    </FormFieldSelect>
  );
}

function resolveValueFormat(
  value: string,
  mode: FormDataEntryValue | null,
): EditStateValue {
  if (mode === 'binary') {
    return value ? { base64: value.trim() } : undefined;
  }
  return minifyJson(value) || undefined;
}

function minifyJson(value: string) {
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return value;
  }
}

function stringifyValues(state: Record<string, unknown>) {
  return convertStateToObject(
    Array.from(Object.entries(state)).map(([name, value]) => ({
      name,
      value: JSON.stringify(value),
    })),
  );
}

function StateDialogContent({
  children,
  service,
  stateKey: key,
  hasActiveInvocations,
  isDeleting,
  isFetching,
  title,
  subtitle,
  onSubmit,
  error,
  isSubmitting,
  isFetchingState,
}: PropsWithChildren<{
  service?: string;
  stateKey?: string;
  hasActiveInvocations?: boolean;
  isDeleting?: boolean;
  isFetching?: boolean;
  isSubmitting?: boolean;
  isFetchingState?: boolean;
  title?: ReactNode;
  subtitle?: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  error?: Error | null;
}>) {
  const isPartial = typeof key === 'string';
  const { banner, bannerIcon } = styles({
    isWarning: (hasActiveInvocations && isPartial) || !isPartial,
  });

  const formId = useId();

  return (
    <DialogContent className="max-w-2xl">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {title}
          </h3>
          {subtitle && (
            <div className="flex flex-wrap items-center gap-1.5 text-0.5xs text-gray-600">
              {subtitle}
            </div>
          )}
        </div>
        <div className={banner()}>
          {isFetching ? (
            <div className="h-5 w-5 shrink-0 px-0.5">
              <Spinner className="h-full w-full text-orange-500" />
            </div>
          ) : (
            <Icon
              className={bannerIcon()}
              name={
                (hasActiveInvocations && isPartial) || !isPartial
                  ? IconName.TriangleAlert
                  : IconName.Info
              }
            />
          )}
          <span className="block">
            {hasActiveInvocations
              ? 'Currently, there are active invocations associated with this key. This mutation will be queued for processing once those invocations are complete.'
              : 'This mutation will be enqueued to be processed after any active invocations on this key.'}
            {hasActiveInvocations && isPartial && (
              <>
                <br />
                If the state of this key changes before this mutation is
                processed, the mutation will be discarded.
              </>
            )}
            {!isPartial && (
              <>
                <br />
                The new state will <strong>replace</strong> the previous state.
              </>
            )}
          </span>
        </div>
        <Form
          id={formId}
          method="POST"
          action={`/services/${service}/state`}
          onSubmit={onSubmit}
        >
          {children}

          <DialogFooter>
            <div className="flex flex-col gap-2">
              {error && <ErrorBanner error={error} />}
              <div className="flex gap-2">
                <DialogClose>
                  <Button
                    variant="secondary"
                    className="flex-auto"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <SubmitButton
                  form={formId}
                  className="flex-auto"
                  {...(isFetchingState && { isPending: true })}
                  variant={isDeleting ? 'destructive' : 'primary'}
                >
                  {isDeleting ? 'Delete' : 'Save'}
                </SubmitButton>
              </div>
            </div>
          </DialogFooter>
        </Form>
      </div>
    </DialogContent>
  );
}
