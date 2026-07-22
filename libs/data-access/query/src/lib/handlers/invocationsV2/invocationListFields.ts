import type { components } from '@restate/data-access/admin-api-spec';
import semverCoerce from 'semver/functions/coerce';
import semverGte from 'semver/functions/gte';
import type { QueryContext } from '../shared';

type InvocationFilterField =
  components['schemas']['InvocationV2FilterItem']['field'];
type InvocationSortField = components['schemas']['InvocationV2Sort']['field'];
export type InvocationListField = InvocationFilterField | InvocationSortField;

export type InvocationListTable =
  | 'sys_invocation'
  | 'sys_invocation_status'
  | 'sys_invocation_state'
  | 'sys_vqueues'
  | 'sys_vqueue_meta'
  | 'sys_vqueue_entry_status';

type RestateVersion = `${number}.${number}.${number}`;
type RestateFeature = 'vqueues';

const INVOCATION_LIST_TABLES = {
  sys_invocation: { since: '0.9.0', feature: null },
  sys_invocation_status: { since: '0.9.0', feature: null },
  sys_invocation_state: { since: '0.9.0', feature: null },
  sys_vqueues: { since: '1.7.0', feature: 'vqueues' },
  sys_vqueue_meta: { since: '1.7.0', feature: 'vqueues' },
  sys_vqueue_entry_status: { since: '1.7.1', feature: 'vqueues' },
} as const satisfies Record<
  InvocationListTable,
  { since: RestateVersion; feature: RestateFeature | null }
>;

export type InvocationListTableField = {
  column: string;
  supportingColumns?: Readonly<Record<string, string>>;
  since: RestateVersion;
  feature: RestateFeature | null;
};

type InvocationListFieldDefinition = {
  filter: false | 'column' | 'id' | 'status';
  sort: boolean;
  tables: Partial<Record<InvocationListTable, InvocationListTableField>>;
};

export const INVOCATION_LIST_FIELDS = {
  id: {
    filter: 'id',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'id',
        since: '0.9.0',
        feature: null,
      },
      sys_invocation_status: {
        column: 'id',
        since: '0.9.0',
        feature: null,
      },
      sys_vqueues: {
        column: 'entry_id',
        since: '1.7.0',
        feature: 'vqueues',
      },
      sys_vqueue_entry_status: {
        column: 'entry_id',
        since: '1.7.1',
        feature: 'vqueues',
      },
    },
  },
  status: {
    filter: 'status',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'status',
        supportingColumns: {
          completionResult: 'completion_result',
          completionFailure: 'completion_failure',
        },
        since: '0.9.0',
        feature: null,
      },
      sys_invocation_status: {
        column: 'status',
        supportingColumns: {
          completionResult: 'completion_result',
          completionFailure: 'completion_failure',
        },
        since: '0.9.0',
        feature: null,
      },
      sys_vqueues: {
        column: 'status',
        supportingColumns: { stage: 'stage' },
        since: '1.7.0',
        feature: 'vqueues',
      },
      sys_vqueue_entry_status: {
        column: 'status',
        supportingColumns: { stage: 'stage' },
        since: '1.7.1',
        feature: 'vqueues',
      },
    },
  },
  target_service_name: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'target_service_name',
        since: '0.9.0',
        feature: null,
      },
      sys_invocation_status: {
        column: 'target_service_name',
        since: '0.9.0',
        feature: null,
      },
      sys_vqueue_meta: {
        column: 'service_name',
        since: '1.7.0',
        feature: 'vqueues',
      },
    },
  },
  target_service_key: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'target_service_key',
        since: '0.9.0',
        feature: null,
      },
      sys_invocation_status: {
        column: 'target_service_key',
        since: '0.9.0',
        feature: null,
      },
    },
  },
  target_handler_name: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'target_handler_name',
        since: '0.9.0',
        feature: null,
      },
      sys_invocation_status: {
        column: 'target_handler_name',
        since: '0.9.0',
        feature: null,
      },
    },
  },
  target_service_ty: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'target_service_ty',
        since: '0.9.0',
        feature: null,
      },
      sys_invocation_status: {
        column: 'target_service_ty',
        since: '0.9.0',
        feature: null,
      },
    },
  },
  deployment: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'pinned_deployment_id',
        since: '0.9.0',
        feature: null,
      },
      sys_invocation_status: {
        column: 'pinned_deployment_id',
        since: '0.9.0',
        feature: null,
      },
      sys_vqueues: {
        column: 'deployment',
        since: '1.7.0',
        feature: 'vqueues',
      },
      sys_vqueue_entry_status: {
        column: 'deployment',
        since: '1.7.1',
        feature: 'vqueues',
      },
    },
  },
  invoked_by_subscription_id: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'invoked_by_subscription_id',
        since: '1.2.0',
        feature: null,
      },
      sys_invocation_status: {
        column: 'invoked_by_subscription_id',
        since: '1.2.0',
        feature: null,
      },
    },
  },
  invoked_by: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'invoked_by',
        since: '0.9.0',
        feature: null,
      },
      sys_invocation_status: {
        column: 'invoked_by',
        since: '0.9.0',
        feature: null,
      },
    },
  },
  invoked_by_service_name: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'invoked_by_service_name',
        since: '0.9.0',
        feature: null,
      },
      sys_invocation_status: {
        column: 'invoked_by_service_name',
        since: '0.9.0',
        feature: null,
      },
    },
  },
  invoked_by_id: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'invoked_by_id',
        since: '0.9.0',
        feature: null,
      },
      sys_invocation_status: {
        column: 'invoked_by_id',
        since: '0.9.0',
        feature: null,
      },
    },
  },
  idempotency_key: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'idempotency_key',
        since: '1.2.0',
        feature: null,
      },
      sys_invocation_status: {
        column: 'idempotency_key',
        since: '1.2.0',
        feature: null,
      },
    },
  },
  created_at: {
    filter: 'column',
    sort: true,
    tables: {
      sys_invocation: {
        column: 'created_at',
        since: '0.9.0',
        feature: null,
      },
      sys_invocation_status: {
        column: 'created_at',
        since: '0.9.0',
        feature: null,
      },
      sys_vqueues: {
        column: 'created_at',
        since: '1.7.0',
        feature: 'vqueues',
      },
      sys_vqueue_entry_status: {
        column: 'created_at',
        since: '1.7.1',
        feature: 'vqueues',
      },
    },
  },
  modified_at: {
    filter: 'column',
    sort: true,
    tables: {
      sys_invocation: {
        column: 'modified_at',
        since: '0.9.0',
        feature: null,
      },
      sys_invocation_status: {
        column: 'modified_at',
        since: '0.9.0',
        feature: null,
      },
    },
  },
  completed_at: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'completed_at',
        since: '1.1.0',
        feature: null,
      },
      sys_invocation_status: {
        column: 'completed_at',
        since: '1.1.0',
        feature: null,
      },
    },
  },
  scope: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'scope',
        since: '1.7.0',
        feature: 'vqueues',
      },
      sys_invocation_status: {
        column: 'scope',
        since: '1.7.0',
        feature: 'vqueues',
      },
      sys_vqueue_meta: {
        column: 'scope',
        since: '1.7.0',
        feature: 'vqueues',
      },
    },
  },
  limit_key: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'limit_key',
        since: '1.7.0',
        feature: 'vqueues',
      },
      sys_invocation_status: {
        column: 'limit_key',
        since: '1.7.0',
        feature: 'vqueues',
      },
      sys_vqueue_meta: {
        column: 'limit_key',
        since: '1.7.0',
        feature: 'vqueues',
      },
    },
  },
  transitioned_at: {
    filter: false,
    sort: true,
    tables: {
      sys_vqueues: {
        column: 'transitioned_at',
        since: '1.7.0',
        feature: 'vqueues',
      },
      sys_vqueue_entry_status: {
        column: 'transitioned_at',
        since: '1.7.1',
        feature: 'vqueues',
      },
    },
  },
} as const satisfies Record<InvocationListField, InvocationListFieldDefinition>;

export function getInvocationListFieldOnTable(
  field: string,
  table: InvocationListTable,
): InvocationListTableField | undefined {
  const definition = INVOCATION_LIST_FIELDS[field as InvocationListField];
  if (!definition) return undefined;
  return (definition.tables as InvocationListFieldDefinition['tables'])[table];
}

export function getInvocationListField(
  field: string,
): InvocationListFieldDefinition | undefined {
  return INVOCATION_LIST_FIELDS[field as InvocationListField];
}

export function isInvocationListFieldAvailableOnTable(
  context: QueryContext,
  field: string,
  table: InvocationListTable,
) {
  const tableField = getInvocationListFieldOnTable(field, table);
  if (!tableField) return false;
  if (tableField.feature && !context.features.has(tableField.feature)) {
    return false;
  }
  const version = semverCoerce(context.restateVersion);
  return version ? semverGte(version, tableField.since) : false;
}

export function isInvocationListTableAvailable(
  context: QueryContext,
  table: InvocationListTable,
) {
  const requirement = INVOCATION_LIST_TABLES[table];
  if (requirement.feature && !context.features.has(requirement.feature)) {
    return false;
  }
  const version = semverCoerce(context.restateVersion);
  return version ? semverGte(version, requirement.since) : false;
}
