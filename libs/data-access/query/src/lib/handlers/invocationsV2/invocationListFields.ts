import type { components } from '@restate/data-access-admin-api-spec';

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

export type InvocationListTableField = {
  column: string;
  supportingColumns?: Readonly<Record<string, string>>;
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
      },
      sys_invocation_status: {
        column: 'id',
      },
      sys_vqueues: {
        column: 'entry_id',
      },
      sys_vqueue_entry_status: {
        column: 'entry_id',
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
      },
      sys_invocation_status: {
        column: 'status',
        supportingColumns: {
          completionResult: 'completion_result',
          completionFailure: 'completion_failure',
        },
      },
      sys_vqueues: {
        column: 'status',
        supportingColumns: { stage: 'stage' },
      },
      sys_vqueue_entry_status: {
        column: 'status',
        supportingColumns: { stage: 'stage' },
      },
    },
  },
  target_service_name: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'target_service_name',
      },
      sys_invocation_status: {
        column: 'target_service_name',
      },
      sys_vqueue_meta: {
        column: 'service_name',
      },
    },
  },
  target_service_key: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'target_service_key',
      },
      sys_invocation_status: {
        column: 'target_service_key',
      },
    },
  },
  target_handler_name: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'target_handler_name',
      },
      sys_invocation_status: {
        column: 'target_handler_name',
      },
    },
  },
  target_service_ty: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'target_service_ty',
      },
      sys_invocation_status: {
        column: 'target_service_ty',
      },
    },
  },
  deployment: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'pinned_deployment_id',
      },
      sys_invocation_status: {
        column: 'pinned_deployment_id',
      },
      sys_vqueues: {
        column: 'deployment',
      },
      sys_vqueue_entry_status: {
        column: 'deployment',
      },
    },
  },
  invoked_by_subscription_id: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'invoked_by_subscription_id',
      },
      sys_invocation_status: {
        column: 'invoked_by_subscription_id',
      },
    },
  },
  invoked_by: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'invoked_by',
      },
      sys_invocation_status: {
        column: 'invoked_by',
      },
    },
  },
  invoked_by_service_name: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'invoked_by_service_name',
      },
      sys_invocation_status: {
        column: 'invoked_by_service_name',
      },
    },
  },
  invoked_by_id: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'invoked_by_id',
      },
      sys_invocation_status: {
        column: 'invoked_by_id',
      },
    },
  },
  idempotency_key: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'idempotency_key',
      },
      sys_invocation_status: {
        column: 'idempotency_key',
      },
    },
  },
  created_at: {
    filter: 'column',
    sort: true,
    tables: {
      sys_invocation: {
        column: 'created_at',
      },
      sys_invocation_status: {
        column: 'created_at',
      },
      sys_vqueues: {
        column: 'created_at',
      },
      sys_vqueue_entry_status: {
        column: 'created_at',
      },
    },
  },
  modified_at: {
    filter: 'column',
    sort: true,
    tables: {
      sys_invocation: {
        column: 'modified_at',
      },
      sys_invocation_status: {
        column: 'modified_at',
      },
    },
  },
  completed_at: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'completed_at',
      },
      sys_invocation_status: {
        column: 'completed_at',
      },
    },
  },
  scope: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'scope',
      },
      sys_invocation_status: {
        column: 'scope',
      },
      sys_vqueue_meta: {
        column: 'scope',
      },
    },
  },
  vqueue_id: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'vqueue_id',
      },
      sys_invocation_status: {
        column: 'vqueue_id',
      },
      sys_vqueues: {
        column: 'id',
      },
      sys_vqueue_meta: {
        column: 'id',
      },
      sys_vqueue_entry_status: {
        column: 'vqueue_id',
      },
    },
  },
  stage: {
    filter: 'column',
    sort: false,
    tables: {
      sys_vqueues: {
        column: 'stage',
      },
      sys_vqueue_entry_status: {
        column: 'stage',
      },
    },
  },
  limit_key: {
    filter: 'column',
    sort: false,
    tables: {
      sys_invocation: {
        column: 'limit_key',
      },
      sys_invocation_status: {
        column: 'limit_key',
      },
      sys_vqueue_meta: {
        column: 'limit_key',
      },
    },
  },
  transitioned_at: {
    filter: false,
    sort: true,
    tables: {
      sys_vqueues: {
        column: 'transitioned_at',
      },
      sys_vqueue_entry_status: {
        column: 'transitioned_at',
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
  field: string,
  table: InvocationListTable,
) {
  return Boolean(getInvocationListFieldOnTable(field, table));
}
