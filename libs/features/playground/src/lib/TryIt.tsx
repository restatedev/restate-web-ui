import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { MarkdownDescription } from '@restate/ui-json-schema';
import { formatBytes } from '@restate/util-intl';
import { tv } from '@restate/util-styles';
import {
  buildRequest,
  bundleSchema,
  generateExample,
  isJsonContentType,
  isObject,
  parameterField,
  stringifyExample,
  toFetchInit,
  validateRequest,
  type ContractOperation,
  type ContractParameter,
  type HandlerMode,
  type OpenApiDocument,
  type ParameterRole,
  type RequestBodyValue,
  type RequestIssue,
  type RestateHandlerKind,
  type RestateServiceType,
  type ServiceContract,
} from '@restate/util-openapi';
import { BodyEditor } from './BodyEditor';
import { durationToMs } from './duration';
import { CodeSamples } from './CodeSamples';
import { toolDraftName } from './names';
import { ParameterField } from './ParameterField';
import { RequestLine } from './RequestLine';
import {
  InvocationPanel,
  OpenInvocationLink,
  type InvocationTool,
} from './InvocationPanel';
import {
  ResponseView,
  toPlaygroundResult,
  type PlaygroundResult,
} from './ResponseView';
import { SegmentedControl } from './SegmentedControl';
import {
  rememberRoleValue,
  sharedRoleValue,
  useApiKey,
  useOperationDraft,
  type OperationDraft,
  type ParameterValues,
} from './sessionState';

const API_KEY_PLACEHOLDER = '<API_KEY>';
const PENDING_DELAY_MS = 300;

function afterPendingDelay(callback: () => void) {
  const timeout = setTimeout(callback, PENDING_DELAY_MS);
  return () => clearTimeout(timeout);
}

function isTextContentType(contentType: string) {
  return isJsonContentType(contentType) || /^text\//i.test(contentType);
}

function initialParameterValue(service: string, parameter: ContractParameter) {
  const shared = parameter.role
    ? sharedRoleValue(service, parameter.role)
    : undefined;
  if (shared) {
    return shared;
  }
  if (parameter.required && parameter.example !== undefined) {
    return String(parameter.example);
  }
  if (
    parameter.required &&
    isObject(parameter.schema) &&
    parameter.schema['default'] !== undefined
  ) {
    return String(parameter.schema['default']);
  }
  return '';
}

export function exampleBody(
  operation: ContractOperation,
  document: OpenApiDocument,
) {
  const body = operation.body;
  if (!body) {
    return '';
  }
  if (body.example !== undefined) {
    return typeof body.example === 'string' &&
      !isJsonContentType(body.contentType)
      ? body.example
      : stringifyExample(body.example);
  }
  if (!isJsonContentType(body.contentType)) {
    return '';
  }
  return stringifyExample(generateExample(body.schema, { root: document }));
}

function bodyModelUri(
  service: string,
  handlerName: string,
  contentType: string,
) {
  return `inmemory://playground/${encodeURIComponent(service)}/${encodeURIComponent(handlerName)}.${isJsonContentType(contentType) ? 'json' : 'txt'}`;
}

function editorSchemas(service: string, contract: ServiceContract) {
  const bodies = [
    ...contract.handlers.map((handler) => ({
      name: handler.name,
      body: Object.values(handler.modes).find((operation) => operation?.body)
        ?.body,
    })),
    ...contract.invocationTools.map((tool) => ({
      name: toolDraftName(tool.kind, 'byTarget'),
      body: tool.byTarget?.body,
    })),
  ];
  return bodies.flatMap(({ name, body }) => {
    if (!body || !isJsonContentType(body.contentType)) {
      return [];
    }
    const schema = bundleSchema(body.schema, contract.document);
    return schema
      ? [{ uri: bodyModelUri(service, name, body.contentType), schema }]
      : [];
  });
}

function parameterPlaceholder(
  parameter: ContractParameter,
  serviceType?: RestateServiceType,
) {
  if (parameter.example !== undefined) {
    return `e.g. ${String(parameter.example)}`;
  }
  switch (parameter.role) {
    case 'key':
      return serviceType === 'Workflow' ? 'Workflow ID' : 'Object key';
    case 'scope':
      return 'e.g. tenant-a';
    case 'delay':
      return 'e.g. 10s, 5m or 1h';
    case 'invocationId':
      return 'inv_…';
    default:
      return undefined;
  }
}

function delayError(value: string) {
  if (!value) {
    return undefined;
  }
  return Number.isNaN(durationToMs(value))
    ? 'Use a duration like 10s, 1.5h or PT5M'
    : undefined;
}

function parameterType(parameter: ContractParameter) {
  const schema = parameter.schema;
  if (isObject(schema) && typeof schema['type'] === 'string') {
    return typeof schema['format'] === 'string'
      ? `${schema['type']}<${schema['format']}>`
      : schema['type'];
  }
  return 'string';
}

function roleDescription(
  parameter: ContractParameter,
  serviceType?: RestateServiceType,
) {
  switch (parameter.role) {
    case 'key':
      return serviceType === 'Workflow'
        ? 'The workflow ID. The `run` handler executes once per ID, and the other handlers read or signal that run.'
        : 'Which object to call. Calls with the same key share that object’s state, and its exclusive handlers run one at a time.';
    case 'scope':
      return 'Groups invocations so the cluster’s flow control rules, such as concurrency limits, apply to them. Use one scope per tenant, for example. Letters, digits, `_`, `.` and `-`, up to 36 characters.';
    case 'limitKey':
      return 'Narrows the flow control rules inside the scope, one or two levels deep, such as `user-1` or `team-a/user-1`. Each level can have its own limit.';
    case 'idempotencyKey':
      return 'Makes the request safe to retry: requests with the same key run the handler once and get the same result.';
    case 'delay':
      return 'Starts the invocation later instead of right away. Use a duration like `10s`, `5m` or `1h`.';
    default:
      return undefined;
  }
}

function docsLink(markdown?: string) {
  return markdown?.match(/\[[^\]]+\]\((https?:[^)\s]+)\)/)?.[1];
}

function ParameterDetails({
  parameter,
  serviceType,
}: {
  parameter: ContractParameter;
  serviceType?: RestateServiceType;
}) {
  const explanation = roleDescription(parameter, serviceType);
  const link = docsLink(parameter.description);
  const description = explanation
    ? `${explanation}${link ? ` [Learn more](${link})` : ''}`
    : parameter.description;
  return (
    <>
      <div className="font-mono text-2xs text-muted">
        {parameter.in} · {parameterType(parameter)}
      </div>
      {description && <MarkdownDescription>{description}</MarkdownDescription>}
      {parameter.example !== undefined && (
        <div className="text-muted">
          Example{' '}
          <code className="font-mono text-secondary">
            {String(parameter.example)}
          </code>
        </div>
      )}
    </>
  );
}

async function execute(
  fetcher: typeof fetch,
  request: ReturnType<typeof buildRequest>,
  signal: AbortSignal,
): Promise<PlaygroundResult | undefined> {
  const outcome = await timedFetch(fetcher, request, signal);
  if (signal.aborted) {
    return undefined;
  }
  if ('response' in outcome) {
    try {
      return await toPlaygroundResult(outcome.response, outcome.durationMs);
    } catch (error) {
      if (signal.aborted) {
        return undefined;
      }
      return {
        kind: 'error',
        url: request.url,
        message: error instanceof Error ? error.message : String(error),
        durationMs: outcome.durationMs,
      };
    }
  }
  return {
    kind: 'error',
    url: request.url,
    message: outcome.error,
    durationMs: outcome.durationMs,
  };
}

function randomId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

async function timedFetch(
  fetcher: typeof fetch,
  request: ReturnType<typeof buildRequest>,
  signal: AbortSignal,
): Promise<
  | { response: Response; durationMs: number }
  | { error: string; durationMs: number }
> {
  const start = performance.now();
  try {
    const response = await fetcher(request.url, {
      ...toFetchInit(request),
      signal,
    });
    return { response, durationMs: performance.now() - start };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      durationMs: performance.now() - start,
    };
  }
}

export interface TryItProps {
  service: string;
  contract: ServiceContract;
  operation: ContractOperation;
  ingressUrl: string;
  fetcher: typeof fetch;
  handlerName: string;
  handlerKind?: RestateHandlerKind;
  serviceType?: RestateServiceType;
  mode?: HandlerMode;
  runLabel: string;
  toolbar?: ReactNode;
}

const requestLineStyles = tv({
  base: 'px-3 py-2',
  variants: { hasFields: { true: 'border-b border-muted' } },
});

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function TryIt({
  service,
  contract,
  operation,
  ingressUrl,
  fetcher,
  handlerName,
  handlerKind,
  serviceType,
  mode,
  runLabel,
  toolbar,
}: TryItProps) {
  const document = contract.document;
  const body = operation.body;
  const createInitial = useCallback(
    (): OperationDraft => ({
      parameters: {},
      body: exampleBody(operation, document),
    }),
    [document, operation],
  );
  const [draft, setDraft] = useOperationDraft(
    `${service}::${handlerName}`,
    createInitial,
  );
  const [apiKeyState, setApiKeyState] = useApiKey(ingressUrl);
  const apiKey = apiKeyState.isVisible ? apiKeyState.value : '';
  const [bodyMode, setBodyMode] = useState<'text' | 'file'>(
    body && !isTextContentType(body.contentType) && draft.file
      ? 'file'
      : 'text',
  );
  const [issues, setIssues] = useState<RequestIssue[]>([]);
  const [result, setResult] = useState<PlaygroundResult>();
  const [isSending, setIsSending] = useState(false);
  const [shownOperationId, setShownOperationId] = useState(operation.id);
  const abortRef = useRef<AbortController | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  if (shownOperationId !== operation.id) {
    setShownOperationId(operation.id);
    setResult(undefined);
    setIssues([]);
  }

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [operation.id],
  );

  useEffect(() => {
    const element = responseRef.current;
    if (!result || !element) {
      return;
    }
    if (element.getBoundingClientRect().top > window.innerHeight - 64) {
      element.scrollIntoView({
        block: 'nearest',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
  }, [result]);

  const parameters = operation.parameters.filter(({ in: location }) =>
    ['path', 'query', 'header'].includes(location),
  );

  const parameterValue = (parameter: ContractParameter) =>
    draft.parameters[parameter.in]?.[parameter.name] ??
    initialParameterValue(service, parameter);

  const roleValue = (role: ParameterRole) => {
    const parameter = parameters.find((candidate) => candidate.role === role);
    return parameter ? parameterValue(parameter) : undefined;
  };

  const bodyValue: RequestBodyValue | undefined = !body
    ? undefined
    : bodyMode === 'text'
      ? { kind: 'text', text: draft.body }
      : draft.file
        ? { kind: 'file', file: draft.file, name: draft.file.name }
        : undefined;
  const values = {
    parameters: operation.parameters.reduce<ParameterValues>(
      (current, parameter) => ({
        ...current,
        [parameter.in]: {
          ...current[parameter.in],
          [parameter.name]: parameterValue(parameter),
        },
      }),
      {},
    ),
    body: bodyValue,
  };
  const schemas = useMemo(
    () => editorSchemas(service, contract),
    [service, contract],
  );

  const sampleRequest = buildRequest(operation, values, {
    baseUrl: ingressUrl,
    apiKey:
      contract.security.bearer || apiKey ? API_KEY_PLACEHOLDER : undefined,
  });

  const setParameter = (parameter: ContractParameter, value: string) => {
    rememberRoleValue(service, parameter.role, value);
    setIssues((current) =>
      current.filter(({ field }) => field !== parameterField(parameter)),
    );
    setDraft((previous) => ({
      ...previous,
      parameters: {
        ...previous.parameters,
        [parameter.in]: {
          ...previous.parameters[parameter.in],
          [parameter.name]: value,
        },
      },
    }));
  };

  const run = async (request: ReturnType<typeof buildRequest>) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const cancelPending = afterPendingDelay(() => {
      if (abortRef.current === controller) {
        setIsSending(true);
      }
    });
    const next = await execute(fetcher, request, controller.signal);
    cancelPending();
    if (abortRef.current === controller) {
      abortRef.current = null;
      setIsSending(false);
    }
    if (next) {
      setResult(next);
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsSending(false);
  };

  const send = () => {
    if (abortRef.current) {
      return;
    }
    const nextIssues = validateRequest(operation, values);
    for (const parameter of parameters) {
      const error =
        parameter.role === 'delay'
          ? delayError(parameterValue(parameter))
          : undefined;
      if (error) {
        nextIssues.push({ field: parameterField(parameter), message: error });
      }
    }
    if (body?.required && bodyMode === 'file' && !draft.file) {
      nextIssues.push({ field: 'body', message: 'Choose a file to send' });
    }
    if (
      body &&
      bodyValue?.kind === 'text' &&
      isJsonContentType(body.contentType) &&
      bodyValue.text.trim()
    ) {
      try {
        JSON.parse(bodyValue.text);
      } catch {
        nextIssues.push({
          field: 'body',
          message: 'The body is not valid JSON',
        });
      }
    }
    setIssues(nextIssues);
    if (nextIssues.length > 0) {
      return;
    }
    void run(
      buildRequest(operation, values, {
        baseUrl: ingressUrl,
        apiKey: apiKey || undefined,
      }),
    );
  };

  const runTool = (
    kind: InvocationTool,
    invocationId: string,
    signal: AbortSignal,
  ) => {
    const tool = contract.invocationTools.find(
      (candidate) => candidate.kind === kind,
    )?.byId;
    return tool
      ? execute(
          fetcher,
          buildRequest(
            tool,
            { parameters: { path: { invocationId } } },
            { baseUrl: ingressUrl, apiKey: apiKey || undefined },
          ),
          signal,
        )
      : Promise.resolve(undefined);
  };
  const canTrack = (['status', 'output'] as const).every((kind) =>
    contract.invocationTools.some(
      (candidate) => candidate.kind === kind && candidate.byId,
    ),
  );

  const delay = roleValue('delay');
  const samples = {
    request: sampleRequest,
    client:
      serviceType && mode
        ? {
            ingressUrl: ingressUrl.replace(/\/+$/, ''),
            serviceName: contract.name,
            serviceType,
            handlerName,
            handlerKind,
            mode,
            key: roleValue('key'),
            scope: roleValue('scope'),
            idempotencyKey: roleValue('idempotencyKey') || undefined,
            limitKey: roleValue('limitKey') || undefined,
            delayMs: delay ? durationToMs(delay) || undefined : undefined,
            body: bodyValue?.kind === 'text' ? bodyValue.text : undefined,
            hasFileBody: bodyValue?.kind === 'file',
            bodyContentType: body?.contentType,
            authorization:
              contract.security.bearer || apiKey
                ? `Bearer ${API_KEY_PLACEHOLDER}`
                : undefined,
          }
        : undefined,
  };
  const deferredSamples = useDeferredValue(samples);

  const issueFor = (field: string) =>
    issues.find((issue) => issue.field === field)?.message;
  const bodyIssue = issueFor('body');

  const hasFields =
    contract.security.bearer || parameters.length > 0 || Boolean(body);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-3">
        <form
          aria-label="Request"
          className="flex min-w-0 flex-col rounded-xl border bg-surface shadow-xs"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isSending) {
              send();
            }
          }}
        >
          {toolbar && (
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-muted px-3 py-2">
              {toolbar}
            </div>
          )}
          <div className={requestLineStyles({ hasFields })}>
            <RequestLine
              method={operation.method}
              url={sampleRequest.url}
              baseUrl={ingressUrl}
              runLabel={runLabel}
              isSending={isSending}
              onCancel={cancel}
            />
          </div>
          {hasFields && (
            <div className="flex flex-col gap-3 p-3">
              {contract.security.bearer && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <Icon name={IconName.ApiKey} className="h-3.5 w-3.5" />
                    {!apiKeyState.isVisible
                      ? 'Requests use your current session.'
                      : apiKey
                        ? 'Requests use this API key. It is kept only in this tab’s memory.'
                        : 'Paste an API key. Until then, requests use your current session.'}
                    <Button
                      variant="secondary"
                      className="ml-auto px-2 py-0.5 text-xs"
                      onClick={() =>
                        setApiKeyState({
                          isVisible: !apiKeyState.isVisible,
                          value: '',
                        })
                      }
                    >
                      {apiKeyState.isVisible ? 'Use session' : 'Use an API key'}
                    </Button>
                  </div>
                  {apiKeyState.isVisible && (
                    <ParameterField
                      label="API key"
                      type="password"
                      value={apiKeyState.value}
                      onChange={(value) =>
                        setApiKeyState({ isVisible: true, value })
                      }
                      placeholder="Paste an API key"
                    />
                  )}
                </div>
              )}
              {parameters.map((parameter) => (
                <ParameterField
                  key={parameterField(parameter)}
                  label={parameter.name}
                  info={
                    <ParameterDetails
                      parameter={parameter}
                      serviceType={serviceType}
                    />
                  }
                  required={parameter.required}
                  value={parameterValue(parameter)}
                  onChange={(value) => setParameter(parameter, value)}
                  error={issueFor(parameterField(parameter))}
                  placeholder={parameterPlaceholder(parameter, serviceType)}
                  action={
                    parameter.role === 'idempotencyKey' && (
                      <Button
                        variant="secondary"
                        className="flex shrink-0 items-center gap-1.5 self-stretch rounded-lg px-2.5 py-1 text-xs"
                        onClick={() => setParameter(parameter, randomId())}
                      >
                        <Icon name={IconName.Wand} className="h-3.5 w-3.5" />
                        Generate
                      </Button>
                    )
                  }
                />
              ))}
              {body && (
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-0.5xs font-medium text-secondary">
                      Body
                      {body.required && (
                        <span className="ml-1 text-danger">*</span>
                      )}
                    </span>
                    <code className="rounded bg-muted px-1 py-px font-mono text-2xs text-tertiary">
                      {body.contentType}
                    </code>
                    <div className="ml-auto flex items-center gap-1.5">
                      {!isTextContentType(body.contentType) && (
                        <SegmentedControl
                          label="Body input"
                          value={bodyMode}
                          onChange={setBodyMode}
                          options={[
                            { value: 'text', label: 'Text' },
                            { value: 'file', label: 'File' },
                          ]}
                        />
                      )}
                      {bodyMode === 'text' &&
                        isJsonContentType(body.contentType) && (
                          <Button
                            variant="icon"
                            className="gap-1 rounded-md px-1.5 py-0.5 text-xs"
                            onClick={() =>
                              setDraft((previous) => ({
                                ...previous,
                                body: exampleBody(operation, document),
                              }))
                            }
                          >
                            <Icon
                              name={IconName.RetryNow}
                              className="h-3 w-3"
                            />
                            Reset to example
                          </Button>
                        )}
                    </div>
                  </div>
                  {bodyMode === 'file' ? (
                    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-inset bg-inset px-2 py-1.5">
                      <label className="shrink-0 cursor-default rounded-md border bg-raised px-2 py-0.5 text-xs text-primary shadow-xs hover:wash-tint has-focus-visible:outline-2 has-focus-visible:outline-focus">
                        Choose file
                        <input
                          type="file"
                          aria-label="Body file"
                          className="sr-only"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = '';
                            if (file) {
                              setIssues((current) =>
                                current.filter(({ field }) => field !== 'body'),
                              );
                              setDraft((previous) => ({ ...previous, file }));
                            }
                          }}
                        />
                      </label>
                      <span className="min-w-0 flex-auto truncate text-xs text-secondary">
                        {draft.file
                          ? `${draft.file.name} · ${formatBytes(draft.file.size)}`
                          : 'No file chosen'}
                      </span>
                      {draft.file && (
                        <Button
                          variant="icon"
                          aria-label="Remove file"
                          className="shrink-0 p-1"
                          onClick={() =>
                            setDraft((previous) => ({
                              ...previous,
                              file: undefined,
                            }))
                          }
                        >
                          <Icon name={IconName.X} className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <BodyEditor
                      modelUri={bodyModelUri(
                        service,
                        handlerName,
                        body.contentType,
                      )}
                      value={draft.body}
                      language={
                        isJsonContentType(body.contentType)
                          ? 'json'
                          : 'plaintext'
                      }
                      schemas={schemas}
                      ariaLabel="Request body"
                      onChange={(text) => {
                        setIssues((current) =>
                          current.filter(({ field }) => field !== 'body'),
                        );
                        setDraft((previous) => ({ ...previous, body: text }));
                      }}
                      onSubmit={() => {
                        if (!isSending) {
                          send();
                        }
                      }}
                    />
                  )}
                  {bodyIssue && (
                    <div className="text-xs text-danger">{bodyIssue}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </form>
        {result && (
          <div ref={responseRef} className="scroll-mt-4">
            <ResponseView result={result}>
              {result.kind === 'response' &&
                result.invocationId &&
                (result.status === 202 ? (
                  <InvocationPanel
                    key={result.invocationId}
                    invocationId={result.invocationId}
                    executionTime={result.executionTime}
                    canTrack={canTrack}
                    runTool={(kind, signal) =>
                      runTool(kind, result.invocationId as string, signal)
                    }
                  />
                ) : (
                  <div>
                    <OpenInvocationLink invocationId={result.invocationId} />
                  </div>
                ))}
            </ResponseView>
          </div>
        )}
      </div>
      <CodeSamples samples={deferredSamples} />
    </div>
  );
}
