import { useCallback, useMemo, useRef, useState } from 'react';
import {
  buildRequest,
  isJsonContentType,
  parameterField,
  type ContractOperation,
  type ContractParameter,
  type ParameterRole,
  type RequestIssue,
  type ServiceContract,
} from '@restate/util-openapi';
import { durationToMs } from '../duration';
import {
  delayError,
  exampleBody as exampleBodyText,
  execute,
  initialParameterValue,
} from '../TryIt';
import type { InvocationTool } from '../InvocationPanel';
import type { PlaygroundResult } from '../ResponseView';
import { rememberRoleValue } from '../sessionState';

export interface RunRecord {
  id: number;
  startedAt: number;
  mode: 'call' | 'send' | 'other';
  handlerName: string;
  request: ReturnType<typeof buildRequest>;
  input: unknown;
  result?: PlaygroundResult;
  isRunning: boolean;
}

export type Draft = {
  parameters: Record<string, string>;
  rawBody: string;
  bodyMode: 'text' | 'file';
  file?: File;
};

const drafts = new Map<string, Draft>();

function draftKey(ingressUrl: string, service: string, handler: string) {
  return `${ingressUrl}::${service}::${handler}`;
}

export function useRunner({
  service,
  contract,
  operation,
  ingressUrl,
  fetcher,
  handlerName,
  mode,
  apiKey,
}: {
  service: string;
  contract: ServiceContract;
  operation: ContractOperation;
  ingressUrl: string;
  fetcher: typeof fetch;
  handlerName: string;
  mode: 'call' | 'send' | 'other';
  apiKey?: string;
}) {
  const document = contract.document;
  const body = operation.body;
  const key = draftKey(ingressUrl, service, handlerName);

  const exampleBody = useMemo(
    () => (body ? exampleBodyText(operation, document) : ''),
    [body, document, operation],
  );

  const parameters = operation.parameters.filter(({ in: location }) =>
    ['path', 'query', 'header'].includes(location),
  );
  const scope = `${ingressUrl}::${service}`;

  const [draft, setDraftState] = useState<Draft>(
    () =>
      drafts.get(key) ?? {
        parameters: {},
        rawBody: exampleBody,
        bodyMode: 'text',
      },
  );

  const setDraft = useCallback(
    (update: (previous: Draft) => Draft) => {
      setDraftState((previous) => {
        const next = update(previous);
        drafts.set(key, next);
        return next;
      });
    },
    [key],
  );

  const [issues, setIssues] = useState<RequestIssue[]>([]);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [isSending, setIsSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  const parameterValue = (parameter: ContractParameter) =>
    draft.parameters[parameterField(parameter)] ??
    initialParameterValue(scope, parameter);

  const roleValue = (role: ParameterRole) => {
    const parameter = parameters.find((candidate) => candidate.role === role);
    return parameter ? parameterValue(parameter) : undefined;
  };

  const setParameter = (parameter: ContractParameter, value: string) => {
    rememberRoleValue(scope, parameter.role, value);
    setIssues((current) =>
      current.filter(({ field }) => field !== parameterField(parameter)),
    );
    setDraft((previous) => ({
      ...previous,
      parameters: {
        ...previous.parameters,
        [parameterField(parameter)]: value,
      },
    }));
  };

  const bodyText = draft.rawBody;
  const bodyValue =
    draft.bodyMode === 'file'
      ? draft.file
        ? ({ kind: 'file', file: draft.file, name: draft.file.name } as const)
        : undefined
      : ({ kind: 'text', text: bodyText } as const);

  const values = {
    parameters: operation.parameters.reduce<
      Record<string, Record<string, string>>
    >(
      (current, parameter) => ({
        ...current,
        [parameter.in]: {
          ...current[parameter.in],
          [parameter.name]: parameterValue(parameter),
        },
      }),
      {},
    ),
    body: body ? bodyValue : undefined,
  };

  const request = buildRequest(operation, values, {
    baseUrl: ingressUrl,
    apiKey: apiKey || undefined,
  });

  const run = async (record: Omit<RunRecord, 'result' | 'isRunning'>) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSending(true);
    setRuns((current) => [{ ...record, isRunning: true }, ...current]);
    const result = await execute(fetcher, record.request, controller.signal);
    if (abortRef.current === controller) {
      abortRef.current = null;
      setIsSending(false);
    }
    if (result) {
      setRuns((current) =>
        current.map((entry) =>
          entry.id === record.id
            ? { ...entry, result, isRunning: false }
            : entry,
        ),
      );
    } else {
      setRuns((current) => current.filter((entry) => entry.id !== record.id));
    }
  };

  const submit = () => {
    if (abortRef.current) {
      return;
    }
    const nextIssues: RequestIssue[] = [];
    for (const parameter of parameters) {
      if (parameter.required && parameterValue(parameter).length === 0) {
        nextIssues.push({
          field: parameterField(parameter),
          message: 'Required',
        });
      }
      const error =
        parameter.role === 'delay'
          ? delayError(parameterValue(parameter))
          : undefined;
      if (error) {
        nextIssues.push({ field: parameterField(parameter), message: error });
      }
    }
    if (draft.bodyMode === 'file') {
      if (body?.required && !draft.file) {
        nextIssues.push({ field: 'body', message: 'Choose a file to send' });
      }
    } else if (
      body &&
      isJsonContentType(body.contentType) &&
      draft.rawBody.trim()
    ) {
      try {
        JSON.parse(draft.rawBody);
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
    runIdRef.current += 1;
    void run({
      id: runIdRef.current,
      startedAt: Date.now(),
      mode,
      handlerName,
      request,
      input: draft.rawBody,
    });
  };

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsSending(false);
    setRuns((current) => current.filter((entry) => !entry.isRunning));
  };

  const runTool = useCallback(
    (kind: InvocationTool, invocationId: string, signal: AbortSignal) => {
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
    },
    [apiKey, contract.invocationTools, fetcher, ingressUrl],
  );

  const canTrack = (['status', 'output'] as const).every((kind) =>
    contract.invocationTools.some(
      (candidate) => candidate.kind === kind && candidate.byId,
    ),
  );

  const delay = roleValue('delay');

  return {
    exampleBody,
    draft,
    setDraft,
    parameters,
    parameterValue,
    setParameter,
    issues,
    issueFor: (name: string) =>
      issues.find((issue) => issue.field === name)?.message,
    request,
    bodyText,
    runs,
    latestRun: runs[0],
    clearRuns: () => setRuns([]),
    isSending,
    submit,
    cancel,
    runTool,
    canTrack,
    roleValue,
    delayMs: delay ? durationToMs(delay) || undefined : undefined,
  };
}
