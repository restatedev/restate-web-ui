import { useMemo, useState } from 'react';
import type {
  ContractHandler,
  ContractParameter,
  HandlerMode,
  RestateServiceType,
  ServiceContract,
} from '@restate/util-openapi';
import { editorSchemas } from '../TryIt';
import { usePlaygroundFetcher } from '../usePlaygroundFetcher';
import { useRunner } from './useRunner';

export function isAdvancedParameter(parameter: ContractParameter) {
  return (
    !parameter.required &&
    parameter.role !== undefined &&
    parameter.role !== 'key'
  );
}

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
  const fetcher = usePlaygroundFetcher(service, handler.name);
  const runner = useRunner({
    service,
    contract,
    operation,
    ingressUrl,
    fetcher,
    handlerName: handler.name,
    mode: availableModes.length > 0 ? base : 'other',
  });
  const schemas = useMemo(
    () => editorSchemas(service, contract),
    [service, contract],
  );
  const body = operation.body;
  const hasInput = Boolean(
    body && (body.schema !== undefined || body.required),
  );
  const isScopeRole = (parameter: (typeof runner.parameters)[number]) =>
    parameter.role === 'scope' || parameter.role === 'limitKey';
  const mainParameters = runner.parameters.filter(
    (parameter) => !isAdvancedParameter(parameter) && !isScopeRole(parameter),
  );
  const advancedParameters = runner.parameters.filter(
    (parameter) => isAdvancedParameter(parameter) && !isScopeRole(parameter),
  );
  const scopeParameters = runner.parameters.filter(isScopeRole);
  const changedOptions =
    advancedParameters.filter(
      (parameter) => runner.parameterValue(parameter) !== '',
    ).length + (isScoped && canScope ? 1 : 0);

  return {
    service,
    contract,
    handler,
    serviceType,
    runner,
    operation,
    base,
    setBase,
    availableModes,
    isScoped: isScoped && canScope,
    setIsScoped,
    canScope,
    schemas,
    hasInput,
    mainParameters,
    advancedParameters,
    scopeParameters,
    changedOptions,
    submit: () => {
      if (!runner.isSending) {
        runner.submit();
      }
    },
  };
}

export type HandlerRun = ReturnType<typeof useHandlerRun>;
