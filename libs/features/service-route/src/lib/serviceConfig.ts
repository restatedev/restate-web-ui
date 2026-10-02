import type { Handler, Service } from '@restate/data-access/admin-api-spec';

export interface EffectiveValue<T> {
  value: T | undefined;
  isOverride: boolean;
}

function effective<T>(
  handlerValue: T | null | undefined,
  serviceValue: T | null | undefined,
  hasHandler: boolean,
): EffectiveValue<T> {
  if (hasHandler && handlerValue !== null && handlerValue !== undefined) {
    return {
      value: handlerValue,
      isOverride: handlerValue !== (serviceValue ?? undefined),
    };
  }
  return { value: serviceValue ?? undefined, isOverride: false };
}

export function resolveServiceConfig(service?: Service, handler?: Handler) {
  const hasHandler = Boolean(handler);
  const servicePolicy = service?.retry_policy;
  const handlerPolicy = handler?.retry_policy;

  return {
    public: effective(handler?.public, service?.public, hasHandler),
    idempotencyRetention: effective(
      handler?.idempotency_retention,
      service?.idempotency_retention,
      hasHandler,
    ),
    journalRetention: effective(
      handler?.journal_retention,
      service?.journal_retention,
      hasHandler,
    ),
    workflowCompletionRetention: hasHandler
      ? undefined
      : (service?.workflow_completion_retention ?? undefined),
    inactivityTimeout: effective(
      handler?.inactivity_timeout,
      service?.inactivity_timeout,
      hasHandler,
    ),
    abortTimeout: effective(
      handler?.abort_timeout,
      service?.abort_timeout,
      hasHandler,
    ),
    enableLazyState: effective(
      handler?.enable_lazy_state,
      service?.enable_lazy_state,
      hasHandler,
    ),
    retryPolicy: {
      maxAttempts: effective(
        handlerPolicy?.max_attempts,
        servicePolicy?.max_attempts,
        hasHandler,
      ),
      onMaxAttempts: effective(
        handlerPolicy?.on_max_attempts,
        servicePolicy?.on_max_attempts,
        hasHandler,
      ),
      initialInterval: effective(
        handlerPolicy?.initial_interval,
        servicePolicy?.initial_interval,
        hasHandler,
      ),
      maxInterval: effective(
        handlerPolicy?.max_interval,
        servicePolicy?.max_interval,
        hasHandler,
      ),
      exponentiationFactor: effective(
        handlerPolicy?.exponentiation_factor,
        servicePolicy?.exponentiation_factor,
        hasHandler,
      ),
    },
  };
}

export type ServiceConfig = ReturnType<typeof resolveServiceConfig>;

export function formatConfigDuration(
  value: string | null | undefined,
  fallback = 'Default',
) {
  if (value === undefined || value === null) {
    return fallback;
  }
  return value === '0s' ? 'Disabled' : value;
}
