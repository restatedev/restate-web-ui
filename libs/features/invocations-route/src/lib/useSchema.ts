import { getEndpoint } from '@restate/data-access/admin-api';
import {
  useListDeployments,
  useListSubscriptions,
  useListServices,
} from '@restate/data-access/admin-api-hooks';
import { QueryClauseSchema, QueryClauseType } from '@restate/ui/query-builder';
import { useMemo } from 'react';

export function useSchema() {
  const { promise: listDeploymentPromise, data: listDeploymentsData } =
    useListDeployments();
  const { promise: listSubscriptionsPromise, data: listSubscriptions } =
    useListSubscriptions();
  const { promise: listServicesPromise } = useListServices(
    listDeploymentsData?.sortedServiceNames,
  );

  const schema = useMemo(() => {
    const serviceNamesPromise = listDeploymentPromise.then((results) =>
      [...(results?.sortedServiceNames ?? [])].sort(),
    );
    return [
      {
        id: 'id',
        label: 'Invocation Id',
        operations: [{ value: 'EQUALS', label: 'is' }],
        type: 'STRING',
      },
      {
        id: 'status',
        label: 'Status',
        operations: [
          { value: 'IN', label: 'is' },
          { value: 'NOT_IN', label: 'is not' },
        ],
        type: 'STRING_LIST',
        options: [
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'pending', label: 'Pending' },
          { value: 'running', label: 'Running' },
          { value: 'backing-off', label: 'Backing-off' },
          { value: 'suspended', label: 'Suspended' },
          { value: 'paused', label: 'Paused' },
          { value: 'killed', label: 'Killed' },
          { value: 'cancelled', label: 'Cancelled' },
          { value: 'succeeded', label: 'Succeeded' },
          { value: 'failed', label: 'Failed' },
          { value: 'ready', label: 'Ready' },
        ],
      },
      {
        id: 'target_service_name',
        label: 'Service',
        operations: [
          { value: 'IN', label: 'is' },
          { value: 'NOT_IN', label: 'is not' },
        ],
        type: 'STRING_LIST',
        loadOptions: async () =>
          serviceNamesPromise.then((results) => {
            return (
              results.map((name) => ({
                label: name,
                value: name,
              })) ?? []
            );
          }),
      },
      {
        id: 'target_service_key',
        label: 'Service key',
        operations: [{ value: 'EQUALS', label: 'is' }],
        type: 'STRING',
      },
      {
        id: 'target_handler_name',
        label: 'Handler',
        operations: [
          { value: 'IN', label: 'is' },
          { value: 'NOT_IN', label: 'is not' },
        ],
        type: 'STRING_LIST',
        loadOptions: async () => {
          return listServicesPromise.then(
            (services) =>
              Array.from(
                new Set(
                  services
                    .filter(Boolean)
                    .map((service) =>
                      (service!.handlers ?? []).map((handler) => handler.name),
                    )
                    .flat(),
                ).values(),
              )
                .sort()
                .map((name) => ({
                  label: name,
                  value: name,
                })) ?? [],
          );
        },
      },
      {
        id: 'target_service_ty',
        label: 'Service type',
        operations: [
          { value: 'IN', label: 'is' },
          { value: 'NOT_IN', label: 'is not' },
        ],
        type: 'STRING_LIST',
        options: [
          { value: 'service', label: 'Service' },
          { value: 'virtual_object', label: 'Virtual Object' },
          { value: 'workflow', label: 'Workflow' },
        ],
      },
      {
        id: 'deployment',
        label: 'Deployment',
        operations: [
          { value: 'IN', label: 'is' },
          { value: 'NOT_IN', label: 'is not' },
        ],
        type: 'STRING_LIST',
        loadOptions: async () =>
          listDeploymentPromise.then((results) =>
            Array.from(results?.deployments.values() ?? []).map(
              (deployment) => ({
                label: String(getEndpoint(deployment)),
                value: deployment.id,
                description: deployment.id,
              }),
            ),
          ),
      },
      {
        id: 'invoked_by_subscription_id',
        label: 'Invoked by subscription',
        operations: [
          { value: 'IN', label: 'is' },
          { value: 'NOT_IN', label: 'is not' },
        ],
        type: 'STRING_LIST',
        loadOptions: async () =>
          listSubscriptionsPromise.then((results) =>
            Array.from(results?.subscriptions.values() ?? []).map(
              (subscription) => ({
                label: subscription.source,
                value: subscription.id,
                description: subscription.id,
              }),
            ),
          ),
      },
      {
        id: 'invoked_by',
        label: 'Invoked by',
        operations: [{ value: 'EQUALS', label: 'is' }],
        type: 'STRING',
        options: [
          { value: 'service', label: 'Service' },
          { value: 'ingress', label: 'Ingress' },
          { value: 'restart_as_new', label: 'Restart as New' },
          { value: 'subscription', label: 'Subscription' },
        ],
      },
      {
        id: 'invoked_by_service_name',
        label: 'Invoked by service',
        operations: [
          { value: 'IN', label: 'is' },
          { value: 'NOT_IN', label: 'is not' },
        ],
        type: 'STRING_LIST',
        loadOptions: async () =>
          serviceNamesPromise.then((results) =>
            results.map((name) => ({
              label: name,
              value: name,
            })),
          ),
      },
      {
        id: 'invoked_by_id',
        label: 'Invoked by id',
        operations: [{ value: 'EQUALS', label: 'is' }],
        type: 'STRING',
      },
      {
        id: 'idempotency_key',
        label: 'Idempotency key',
        operations: [{ value: 'EQUALS', label: 'is' }],
        type: 'STRING',
      },

      {
        id: 'retry_count',
        label: 'Attempt count',
        operations: [{ value: 'GREATER_THAN', label: '>' }],
        type: 'NUMBER',
      },
      {
        id: 'created_at',
        label: 'Created',
        operations: [
          { value: 'BEFORE', label: 'before' },
          { value: 'AFTER', label: 'after' },
        ],
        type: 'DATE',
      },
      {
        id: 'scheduled_at',
        label: 'Scheduled',
        operations: [
          { value: 'BEFORE', label: 'before' },
          { value: 'AFTER', label: 'after' },
        ],
        type: 'DATE',
      },
      {
        id: 'modified_at',
        label: 'Modified',
        operations: [
          { value: 'BEFORE', label: 'before' },
          { value: 'AFTER', label: 'after' },
        ],
        type: 'DATE',
      },
      {
        id: 'restarted_from',
        label: 'Restarted from',
        operations: [{ value: 'EQUALS', label: 'is' }],
        type: 'STRING',
      },
    ] satisfies QueryClauseSchema<QueryClauseType>[];
  }, [listDeploymentPromise, listServicesPromise, listSubscriptionsPromise]);

  return schema;
}
