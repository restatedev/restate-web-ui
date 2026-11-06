import { useMemo } from 'react';
import {
  useServiceDetails,
  useServiceOpenApi,
} from '@restate/data-access-admin-api-hooks';
import { useRestateContext } from '@restate/features-restate-context';
import {
  parseServiceContract,
  type OpenApiDocument,
  type RestateHandlerKind,
  type RestateServiceType,
} from '@restate/util-openapi';

export function useServiceContract(service?: string | null) {
  const enabled = typeof service === 'string' && service.length > 0;
  const { data, error, refetch, isFetching, isPending } = useServiceOpenApi(
    String(service),
    { enabled },
  );
  const { data: details } = useServiceDetails(String(service), {
    enabled,
    refetchOnMount: false,
  });
  const { ingressUrl } = useRestateContext();

  const contract = useMemo(
    () => (data ? parseServiceContract(data as OpenApiDocument) : undefined),
    [data],
  );
  const handlerKinds = useMemo(
    () =>
      new Map<string, RestateHandlerKind | undefined>(
        details?.handlers.map(({ name, ty }) => [name, ty ?? undefined]) ?? [],
      ),
    [details],
  );

  return {
    contract,
    serviceType: details?.ty as RestateServiceType | undefined,
    handlerKinds,
    ingressUrl: ingressUrl || contract?.serverUrl || '',
    error,
    refetch,
    isFetching,
    isPending: enabled && isPending,
  };
}
