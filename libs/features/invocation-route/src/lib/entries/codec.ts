import { useServiceDetails } from '@restate/data-access/admin-api-hooks';

export function useCodecHandler(service?: string, handlerName?: string) {
  const isEnabled = Boolean(service && handlerName);
  const query = useServiceDetails(service ?? '', {
    enabled: isEnabled,
    refetchOnMount: false,
  });

  const serviceHandler = handlerName
    ? query.data?.handlers.find(({ name }) => name === handlerName)
    : undefined;
  const handler = serviceHandler
    ? {
        name: serviceHandler.name,
        metadata: serviceHandler.metadata,
        input_description: serviceHandler.input_description,
        input_json_schema: serviceHandler.input_json_schema,
        output_description: serviceHandler.output_description,
        output_json_schema: serviceHandler.output_json_schema,
      }
    : handlerName
      ? { name: handlerName }
      : undefined;
  const isPending = isEnabled && query.isPending;
  const error = isEnabled ? query.error : null;

  if (typeof handler === 'undefined' && !isPending && !error) {
    return {
      handler: { value: undefined, isPending: undefined, error: undefined },
    };
  }

  return {
    handler: {
      value: handler,
      isPending,
      error,
    },
  };
}
