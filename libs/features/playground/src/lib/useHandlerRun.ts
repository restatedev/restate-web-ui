import { useMemo, useState } from 'react';
import type {
  ContractHandler,
  ContractOperation,
  ContractParameter,
  HandlerMode,
  RestateServiceType,
  ServiceContract,
} from '@restate/util-openapi';
import { useApiKey } from './sessionState';
import { editorSchemas } from './request';
import { usePlaygroundFetcher } from './usePlaygroundFetcher';
import { useRunner, type RunRecord } from './useRunner';

export function isAdvancedParameter(parameter: ContractParameter) {
  return (
    !parameter.required &&
    parameter.role !== undefined &&
    parameter.role !== 'key'
  );
}

function isScopeParameter(parameter: ContractParameter) {
  return parameter.role === 'scope' || parameter.role === 'limitKey';
}

export function useOperationRun({
  service,
  contract,
  operation,
  ingressUrl,
  serviceType,
  draftName,
  handlerName,
  mode,
}: {
  service: string;
  contract: ServiceContract;
  operation: ContractOperation;
  ingressUrl: string;
  serviceType?: RestateServiceType;
  draftName: string;
  handlerName?: string;
  mode: RunRecord['mode'];
}) {
  const fetcher = usePlaygroundFetcher(service, handlerName);
  const [apiKeyState, setApiKeyState] = useApiKey(ingressUrl);
  const apiKey = apiKeyState.isVisible ? apiKeyState.value : '';
  const runner = useRunner({
    service,
    contract,
    operation,
    ingressUrl,
    fetcher,
    handlerName: draftName,
    mode,
    apiKey,
  });
  const schemas = useMemo(
    () => editorSchemas(service, contract),
    [service, contract],
  );
  const body = operation.body;
  const advancedParameters = runner.parameters.filter(
    (parameter) =>
      isAdvancedParameter(parameter) && !isScopeParameter(parameter),
  );

  return {
    service,
    contract,
    serviceType,
    runner,
    operation,
    draftName,
    schemas,
    hasInput: Boolean(body && (body.schema !== undefined || body.required)),
    mainParameters: runner.parameters.filter(
      (parameter) =>
        !isAdvancedParameter(parameter) && !isScopeParameter(parameter),
    ),
    advancedParameters,
    scopeParameters: runner.parameters.filter(isScopeParameter),
    filledOptions:
      advancedParameters.filter(
        (parameter) => runner.parameterValue(parameter) !== '',
      ).length + (apiKey ? 1 : 0),
    requiresApiKey: contract.security.bearer,
    apiKeyState,
    setApiKeyState,
    submit: () => {
      if (!runner.isSending) {
        runner.submit();
      }
    },
  };
}

export type OperationRun = ReturnType<typeof useOperationRun>;

export type BaseMode = 'send' | 'call';

export function useHandlerRun({
  service,
  contract,
  handler,
  ingressUrl,
  serviceType,
}: {
  service: string;
  contract: ServiceContract;
  handler: ContractHandler;
  ingressUrl: string;
  serviceType?: RestateServiceType;
}) {
  const availableModes = (['send', 'call'] as const).filter(
    (mode) => handler.modes[mode],
  );
  const [base, setBase] = useState<BaseMode>(availableModes[0] ?? 'call');
  const [isScoped, setIsScoped] = useState(false);
  const scopedMode: HandlerMode = base === 'send' ? 'scopedSend' : 'scopedCall';
  const canScope = Boolean(handler.modes[scopedMode]);
  const mode: HandlerMode = isScoped && canScope ? scopedMode : base;
  const operation =
    handler.modes[mode] ??
    handler.modes[base] ??
    Object.values(handler.modes).find(Boolean);
  if (!operation) {
    throw new Error(`Handler ${handler.name} has no operations`);
  }
  const run = useOperationRun({
    service,
    contract,
    operation,
    ingressUrl,
    serviceType,
    draftName: handler.name,
    handlerName: handler.name,
    mode: availableModes.length > 0 ? base : 'other',
  });

  return {
    ...run,
    handler,
    base,
    setBase,
    availableModes,
    isScoped: isScoped && canScope,
    setIsScoped,
    canScope,
    changedOptions: run.filledOptions + (isScoped && canScope ? 1 : 0),
  };
}

export type HandlerRun = ReturnType<typeof useHandlerRun>;
