export const KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'FULL',
  'CROSS',
  'ON',
  'AND',
  'OR',
  'NOT',
  'GROUP BY',
  'HAVING',
  'ORDER BY',
  'LIMIT',
  'OFFSET',
  'UNION',
  'UNION ALL',
  'EXCEPT',
  'INTERSECT',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'AS',
  'IN',
  'EXISTS',
  'BETWEEN',
  'LIKE',
  'IS NULL',
  'IS NOT NULL',
  'ASC',
  'DESC',
  'DISTINCT',
  'ALL',
  'WITH',
  // "CREATE",
  // "DROP",
  'ALTER',
  // "INSERT",
  // "UPDATE",
  // "DELETE",
  'TABLE',
  'VIEW',
  //   'SCHEMA',
  // 'DATABASE',
  'EXPLAIN',
  'ANALYZE',
  'CAST',
  'TRY_CAST',
  'VALUES',
];

export const AGG_GENERAL_FUNCTIONS = [
  'ARRAY_AGG',
  'AVG',
  'BIT_AND',
  'BIT_OR',
  'BIT_XOR',
  'BOOL_AND',
  'BOOL_OR',
  'COUNT',
  'FIRST_VALUE',
  'GROUPING',
  'LAST_VALUE',
  'MAX',
  'MEAN',
  'MEDIAN',
  'MIN',
  'STRING_AGG',
  'SUM',
  'VAR',
  'VAR_POP',
  'VAR_POPULATION',
  'VAR_SAMP',
  'VAR_SAMPLE',
].map((s) => s.toLowerCase());

export const AGG_STATISTICAL_FUNCTIONS = [
  'CORR',
  'COVAR',
  'COVAR_POP',
  'COVAR_SAMP',
  'NTH_VALUE',
  'REGR_AVGX',
  'REGR_AVGY',
  'REGR_COUNT',
  'REGR_INTERCEPT',
  'REGR_R2',
  'REGR_SLOPE',
  'REGR_SXX',
  'REGR_SXY',
  'REGR_SYY',
  'STDDEV',
  'STDDEV_POP',
  'STDDEV_SAMP',
].map((s) => s.toLowerCase());

export const AGG_APPROXIMATE_FUNCTIONS = [
  'APPROX_DISTINCT',
  'APPROX_MEDIAN',
  'APPROX_PERCENTILE_CONT',
  'APPROX_PERCENTILE_CONT_WITH_WEIGHT',
].map((s) => s.toLowerCase());

export const WINDOWS_RANKING_FUNCTIONS = [
  'CUME_DIST',
  'DENSE_RANK',
  'NTILE',
  'PERCENT_RANK',
  'RANK',
  'ROW_NUMBER',
];
export const WINDOWS_ANALYTICAL_FUNCTIONS = [
  'FIRST_VALUE',
  'LAG',
  'LAST_VALUE',
  'LEAD',
  'NTH_VALUE',
].map((s) => s.toLowerCase());

export const STRING_FUNCTIONS = [
  'ASCII',
  'BIT_LENGTH',
  'BTRIM',
  'CHAR_LENGTH',
  'CHARACTER_LENGTH',
  'CONCAT',
  'CONCAT_WS',
  'INITCAP',
  'LEFT',
  'LENGTH',
  'LOWER',
  'LPAD',
  'LTRIM',
  'REGEXP_MATCH',
  'REGEXP_REPLACE',
  'REPLACE',
  'REVERSE',
  'RIGHT',
  'RPAD',
  'RTRIM',
  'SPLIT_PART',
  'STARTS_WITH',
  'SUBSTRING',
  'TRIM',
  'UPPER',
  'CHR',
  'CONTAINS',
  'ENDS_WITH',
  'FIND_IN_SET',
  'INSTR',
  'INITCAP',
  'LEVENSHTEIN',
  'OCTET_LENGTH',
  'POSITION',
  'REPEAT',
  'STRPOS',
  'SUBSTR',
  'SUBSTR_INDEX',
  'SUBSTRING_INDEX',
  'TO_HEX',
  'TRANSLATE',
  'UUID',
].map((s) => s.toLowerCase());

export const BINARY_STRING_FUNCTIONS = ['DECODE', 'ENCODE'].map((s) =>
  s.toLowerCase()
);

export const REG_EXPRESSION_FUNCTIONS = [
  'REGEXP_LIKE',
  'REGEXP_COUNT',
  'REGEXP_MATCH',
  'REGEXP_REPLACE',
].map((s) => s.toLowerCase());

export const MATH_FUNCTIONS = [
  'ABS',
  'ACOS',
  'ASIN',
  'ATAN',
  'ATAN2',
  'CEIL',
  'CEILING',
  'COS',
  'EXP',
  'FLOOR',
  'LN',
  'LOG',
  'LOG10',
  'PI',
  'POW',
  'POWER',
  'ROUND',
  'SIGN',
  'SIN',
  'SQRT',
  'TAN',
  'TRUNC',
  'ACOSH',
  'ASINH',
  'ATANH',
  'CBRT',
  'COSH',
  'COT',
  'DEGREES',
  'FACTORIAL',
  'GCD',
  'ISNAN',
  'ISZERO',
  'LCM',
  'LOG2',
  'NANVL',
  'RADIANS',
  'RANDOM',
  'SIGNUM',
  'SINH',
  'TANH',
].map((s) => s.toLowerCase());

export const TIME_FUNCTIONS = [
  'CURRENT_DATE',
  'CURRENT_TIME',
  'CURRENT_TIMESTAMP',
  'NOW',
  'DATE_PART',
  'DATE_TRUNC',
  'EXTRACT',
  'TO_TIMESTAMP',
  'DATE_BIN',
  'DATE_FORMAT',
  'DATEPART',
  'DATETRUNC',
  'FORM_UNIXTIME',
  'MAKE_TIME',
  'TO_CHAR',
  'TO_DATE',
  'TO_LOCAL_TIME',
  'TO_TIMESTAMP_MICROS',
  'TO_TIMESTAMP_MILLIS',
  'TO_TIMESTAMP_NANOS',
  'TO_TIMESTAMP_SECONDS',
  'TO_UNIXTIME',
  'TODAY',
].map((s) => s.toLowerCase());

export const CONDITIONAL_FUNCTIONS = [
  'COALESCE',
  'GREATEST',
  'IFNULL',
  'LEAST',
  'NULLIF',
  'NVL',
  'NVL2',
].map((s) => s.toLowerCase());

export const ARRAY_FUNCTIONS = [
  'ARRAY_ANY_VALUE',
  'ARRAY_APPEND',
  'ARRAY_CAT',
  'ARRAY_CONCAT',
  'ARRAY_CONTAINS',
  'ARRAY_DIMS',
  'ARRAY_DISTANCE',
  'ARRAY_DISTINCT',
  'ARRAY_ELEMENT',
  'ARRAY_EMPTY',
  'ARRAY_EXCEPT',
  'ARRAY_EXTRACT',
  'ARRAY_HAS',
  'ARRAY_HAS_ALL',
  'ARRAY_HAS_ANY',
  'ARRAY_INDEXOF',
  'ARRAY_INTERSECT',
  'ARRAY_JOIN',
  'ARRAY_LENGTH',
  'ARRAY_MAX',
  'ARRAY_NDIMS',
  'ARRAY_POP_BACK',
  'ARRAY_POP_FRONT',
  'ARRAY_POSITION',
  'ARRAY_POSITIONS',
  'ARRAY_PREPEND',
  'ARRAY_PUSH_BACK',
  'ARRAY_PUSH_FRONT',
  'ARRAY_REMOVE',
  'ARRAY_REMOVE_ALL',
  'ARRAY_REMOVE_N',
  'ARRAY_REPEAT',
  'ARRAY_REPLACE',
  'ARRAY_REPLACE_ALL',
  'ARRAY_REPLACE_N',
  'ARRAY_RESIZE',
  'ARRAY_REVERSE',
  'ARRAY_SLICE',
  'ARRAY_SORT',
  'ARRAY_TO_STRING',
  'ARRAY_UNION',
  'ARRAYS_OVERLAP',
  'CARDINALITY',
  'EMPTY',
  'FLATTEN',
  'GENERATE_SERIES',
  'LIST_ANY_VALUE',
  'LIST_APPEND',
  'LIST_CAT',
  'LIST_CONCAT',
  'LIST_CONTAINS',
  'LIST_DIMS',
  'LIST_DISTANCE',
  'LIST_DISTINCT',
  'LIST_ELEMENT',
  'LIST_EMPTY',
  'LIST_EXCEPT',
  'LIST_EXTRACT',
  'LIST_HAS',
  'LIST_HAS_ALL',
  'LIST_HAS_ANY',
  'LIST_INDEXOF',
  'LIST_INTERSECT',
  'LIST_JOIN',
  'LIST_LENGTH',
  'LIST_MAX',
  'LIST_NDIMS',
  'LIST_POP_BACK',
  'LIST_POP_FRONT',
  'LIST_POSITION',
  'LIST_POSITIONS',
  'LIST_PREPEND',
  'LIST_PUSH_BACK',
  'LIST_PUSH_FRONT',
  'LIST_REMOVE',
  'LIST_REMOVE_ALL',
  'LIST_REMOVE_N',
  'LIST_REPEAT',
  'LIST_REPLACE',
  'LIST_REPLACE_ALL',
  'LIST_REPLACE_N',
  'LIST_RESIZE',
  'LIST_REVERSE',
  'LIST_SLICE',
  'LIST_SORT',
  'LIST_TO_STRING',
  'LIST_UNION',
  'MAKE_ARRAY',
  'MAKE_LIST',
  'RANGE',
  'STRING_TO_ARRAY',
  'STRING_TO_LIST',
].map((s) => s.toLowerCase());

export const STRUCT_FUNCTIONS = ['NAMED_STRUCT', 'ROW', 'STRUCT'].map((s) =>
  s.toLowerCase()
);

export const MAP_FUNCTIONS = [
  'ELEMENT_AT',
  'MAP',
  'MAP_EXTRACT',
  'MAP_KEYS',
  'MAP_VALUES',
].map((s) => s.toLowerCase());

export const HASHING_FUNCTIONS = [
  'DIGEST',
  'MD5',
  'SHA224',
  'SHA256',
  'SHA384',
  'SHA512',
].map((s) => s.toLowerCase());

export const UNION_FUNCTIONS = ['UNION_EXTRACT'].map((s) => s.toLowerCase());

export const OTHER_FUNCTIONS = [
  'ARROW_CAST',
  'ARROW_TYPEOF',
  'GET_FIELD',
  'VERSION',
].map((s) => s.toLowerCase());

export const EXPANSION_FUNCTIONS = ['unnest'];

export const TABLES = [
  {
    name: 'state',
    description: 'Table to inspect application state',
    columns: [
      {
        name: 'partition_key',
        description:
          'Internal column that is used for partitioning the services invocations. Can be ignored.',
      },
      {
        name: 'service_name',
        description: 'The name of the invoked service.',
      },
      {
        name: 'service_key',
        description: 'The key of the Virtual Object.',
      },
      {
        name: 'key',
        description: 'The utf8 state key.',
      },
      {
        name: 'value_utf8',
        description:
          'Only contains meaningful values when a service stores state as utf8. This is the case for services that serialize state using JSON (default for Typescript SDK, Java/Kotlin SDK if using JsonSerdes).',
      },
      {
        name: 'value',
        description:
          'A binary, uninterpreted representation of the value. You can use the more specific column value_utf8 if the value is a string.',
      },
    ],
  },
  {
    name: 'sys_journal',
    description: "Table to inspect the invocations' journal",
    columns: [
      {
        name: 'partition_key',
        description:
          'Internal column that is used for partitioning the services invocations. Can be ignored.',
      },
      {
        name: 'id',
        description: 'Invocation ID',
      },
      {
        name: 'index',
        description: 'The index of this journal entry.',
      },
      {
        name: 'entry_type',
        description: 'The entry type.',
      },
      {
        name: 'name',
        description: 'The name of the entry supplied by the user, if any.',
      },
      {
        name: 'completed',
        description:
          'Indicates whether this journal entry has been completed; this is only valid for some entry types.',
      },
      {
        name: 'invoked_id',
        description:
          'If this entry represents an outbound invocation, indicates the ID of that invocation.',
      },
      {
        name: 'invoked_target',
        description:
          'If this entry represents an outbound invocation, indicates the invocation Target. Format for plain services: ServiceName/HandlerName, e.g. Greeter/greet. Format for virtual objects/workflows: VirtualObjectName/Key/HandlerName, e.g. Greeter/Francesco/greet.',
      },
      {
        name: 'sleep_wakeup_at',
        description: 'If this entry represents a sleep, indicates wakeup time.',
      },
      {
        name: 'promise_name',
        description:
          'If this entry is a promise related entry (GetPromise, PeekPromise, CompletePromise), indicates the promise name.',
      },
      {
        name: 'raw',
        description: 'Raw binary representation of the entry.',
      },
      {
        name: 'version',
        description: 'The journal version.',
      },
      {
        name: 'entry_json',
        description:
          'The entry serialized as a JSON string (only relevant for journal version 2)',
      },
      {
        name: 'entry_lite_json',
        description:
          'The entry serialized as a JSON string, excluding any values (only relevant for journal version 2)',
      },
      {
        name: 'appended_at',
        description: 'When the entry was appended to the journal',
      },
    ],
  },
  {
    name: 'sys_keyed_service_status',
    description: 'Table to inspect the status of a Virtual Object',
    columns: [
      {
        name: 'partition_key',
        description:
          'Internal column that is used for partitioning the services invocations. Can be ignored.',
      },
      {
        name: 'service_name',
        description: 'The name of the invoked virtual object/workflow.',
      },
      {
        name: 'service_key',
        description: 'The key of the virtual object/workflow.',
      },
      {
        name: 'invocation_id',
        description: 'Invocation ID',
      },
    ],
  },
  {
    name: 'sys_inbox',
    description: 'Table to inspect queue of pending invocations',
    columns: [
      {
        name: 'partition_key',
        description:
          'Internal column that is used for partitioning the services invocations. Can be ignored.',
      },
      {
        name: 'service_name',
        description: 'The name of the invoked virtual object/workflow.',
      },
      {
        name: 'service_key',
        description: 'The key of the virtual object/workflow.',
      },
      {
        name: 'id',
        description: 'Invocation ID',
      },
      {
        name: 'sequence_number',
        description: 'Sequence number in the inbox.',
      },
      {
        name: 'created_at',
        description:
          'Timestamp indicating the start of this invocation. DEPRECATED: you should not use this field anymore, but join with the sys_invocation table',
      },
    ],
  },
  {
    name: 'sys_idempotency',
    description: 'Table to inspect idempotency keys',
    columns: [
      {
        name: 'partition_key',
        description:
          'Internal column that is used for partitioning the services invocations. Can be ignored.',
      },
      {
        name: 'service_name',
        description: 'The name of the invoked service.',
      },
      {
        name: 'service_key',
        description:
          'The key of the virtual object or the workflow ID. Null for regular services.',
      },
      {
        name: 'service_handler',
        description: 'The invoked handler.',
      },
      {
        name: 'idempotency_key',
        description: 'The user provided idempotency key.',
      },
      {
        name: 'invocation_id',
        description: 'Invocation ID',
      },
    ],
  },
  {
    name: 'sys_promise',
    description: 'Table to inspect the status of a promises',
    columns: [
      {
        name: 'partition_key',
        description:
          'Internal column that is used for partitioning the services invocations. Can be ignored.',
      },
      {
        name: 'service_name',
        description: 'The name of the workflow service.',
      },
      {
        name: 'service_key',
        description: 'The workflow ID.',
      },
      {
        name: 'key',
        description: 'The promise key.',
      },
      {
        name: 'completed',
        description: 'True if the promise was completed.',
      },
      {
        name: 'completion_success_value',
        description: 'The completion success, if any.',
      },
      {
        name: 'completion_success_value_utf8',
        description: 'The completion success as UTF-8 string, if any.',
      },
      {
        name: 'completion_failure',
        description: 'The completion failure, if any.',
      },
    ],
  },
  {
    name: 'sys_service',
    description: 'Table to inspect the registered services',
    columns: [
      {
        name: 'name',
        description: 'The name of the registered user service.',
      },
      {
        name: 'revision',
        description: 'The latest deployed revision.',
      },
      {
        name: 'public',
        description:
          'Whether the service is accessible through the ingress endpoint or not.',
      },
      {
        name: 'ty',
        description:
          'The service type. Either service or virtual_object or workflow.',
      },
      {
        name: 'deployment_id',
        description: 'The ID of the latest deployment',
      },
    ],
  },
  {
    name: 'sys_deployment',
    description: 'Table to inspect service deployments',
    columns: [
      {
        name: 'id',
        description: 'The ID of the service deployment.',
      },
      {
        name: 'ty',
        description: 'The type of the endpoint. Either http or lambda.',
      },
      {
        name: 'endpoint',
        description:
          'The address of the endpoint. Either HTTP URL or Lambda ARN.',
      },
      {
        name: 'created_at',
        description: 'Timestamp indicating the deployment registration time.',
      },
      {
        name: 'min_service_protocol_version',
        description: 'Minimum supported protocol version.',
      },
      {
        name: 'max_service_protocol_version	',
        description: 'Maximum supported protocol version.',
      },
    ],
  },
  {
    name: 'sys_invocation',
    description: 'Table to inspect invocations',
    columns: [
      {
        name: 'id',
        description: 'Invocation ID.',
      },
      {
        name: 'target',
        description:
          'Invocation Target. Format for plain services: ServiceName/HandlerName, e.g. Greeter/greet. Format for virtual objects/workflows: VirtualObjectName/Key/HandlerName, e.g. Greeter/Francesco/greet.',
      },
      {
        name: 'target_service_name',
        description: 'The name of the invoked service.',
      },
      {
        name: 'target_service_key',
        description:
          'The key of the virtual object or the workflow ID. Null for regular services.',
      },
      {
        name: 'target_handler_name',
        description: 'The invoked handler.',
      },
      {
        name: 'target_service_ty',
        description:
          'The service type. Either service or virtual_object or workflow.',
      },
      {
        name: 'idempotency_key',
        description: 'Idempotency key, if any.',
      },
      {
        name: 'invoked_by',
        description: `Either: \ningress if the invocation was created externally. \nservice if the invocation was created by another Restate service. \nsubscription if the invocation was created by a subscription (e.g. Kafka).`,
      },
      {
        name: 'invoked_by_service_name',
        description: "The name of caller service if invoked_by = 'service'.",
      },
      {
        name: 'invoked_by_id',
        description: "The caller Invocation ID if invoked_by = 'service'.",
      },
      {
        name: 'invoked_by_subscription_id',
        description: "The subscription id if invoked_by = 'subscription'.",
      },
      {
        name: 'invoked_by_target',
        description: "The caller invocation target if invoked_by = 'service'.",
      },
      {
        name: 'pinned_deployment_id',
        description:
          'The ID of the service deployment that started processing this invocation, and will continue to do so (e.g. for retries). This gets set after the first journal entry has been stored for this invocation.',
      },
      {
        name: 'pinned_service_protocol_version',
        description:
          'The negotiated protocol version used for this invocation. This gets set after the first journal entry has been stored for this invocation.',
      },
      {
        name: 'trace_id',
        description:
          'The ID of the trace that is assigned to this invocation. Only relevant when tracing is enabled.',
      },
      {
        name: 'journal_size',
        description:
          'The number of journal entries durably logged for this invocation.',
      },
      {
        name: 'created_at',
        description: 'Timestamp indicating the start of this invocation.',
      },
      {
        name: 'modified_at',
        description:
          'Timestamp indicating the last invocation status transition. For example, last time the status changed from invoked to suspended.',
      },
      {
        name: 'inboxed_at',
        description:
          'Timestamp indicating when the invocation was inboxed, if ever.',
      },
      {
        name: 'scheduled_at',
        description:
          'Timestamp indicating when the invocation was scheduled, if ever.',
      },
      {
        name: 'running_at',
        description:
          'Timestamp indicating when the invocation first transitioned to running, if ever.',
      },
      {
        name: 'completed_at',
        description:
          'Timestamp indicating when the invocation was completed, if ever.',
      },
      {
        name: 'retry_count',
        description:
          'The number of invocation attempts since the current leader started executing it. Increments on start, so a value greater than 1 means a failure occurred. Note: the value is not a global attempt counter across invocation suspensions and leadership changes.',
      },
      {
        name: 'last_start_at',
        description:
          'Timestamp indicating the start of the most recent attempt of this invocation.',
      },
      {
        name: 'next_retry_at',
        description:
          'Timestamp indicating the start of the next attempt of this invocation.',
      },
      {
        name: 'last_attempt_deployment_id',
        description:
          'The ID of the service deployment that executed the most recent attempt of this invocation; this is set before a journal entry is stored, but can change later.',
      },
      {
        name: 'last_attempt_server',
        description: 'Server/SDK version, e.g. restate-sdk-java/1.0.1',
      },
      {
        name: 'last_failure',
        description:
          'An error message describing the most recent failed attempt of this invocation, if any.',
      },
      {
        name: 'last_failure_error_code',
        description:
          'The error code of the most recent failed attempt of this invocation, if any.',
      },
      {
        name: 'last_failure_related_entry_index',
        description:
          'The index of the journal entry that caused the failure, if any. It may be out-of-bound of the currently stored entries in sys_journal.',
      },
      {
        name: 'last_failure_related_entry_name',
        description:
          'The name of the journal entry that caused the failure, if any.',
      },
      {
        name: 'last_failure_related_entry_type',
        description:
          'The type of the journal entry that caused the failure, if any. You can check all the available entry types in entries.rs.',
      },
      {
        name: 'status',
        description:
          'Either pending or scheduled or ready or running or backing-off or suspended or completed.',
      },
      {
        name: 'completion_result',
        description:
          "If status = 'completed', this contains either success or failure",
      },
      {
        name: 'completion_failure',
        description:
          "If status = 'completed' AND completion_result = 'failure', this contains the error cause",
      },
    ],
  },
  {
    name: 'sys_invocation_status',
    description: "Table to inspect invocations' status",
    columns: [
      {
        name: 'partition_key',
        description:
          'Internal column that is used for partitioning the services invocations. Can be ignored.',
      },
      {
        name: 'id',
        description: 'Invocation ID.',
      },
      {
        name: 'status',
        description:
          'Either pending or scheduled or ready or running or backing-off or suspended or completed.',
      },
      {
        name: 'completion_result',
        description:
          "If status = 'completed', this contains either success or failure",
      },
      {
        name: 'completion_failure',
        description:
          "If status = 'completed' AND completion_result = 'failure', this contains the error cause",
      },
      {
        name: 'target',
        description:
          'Invocation Target. Format for plain services: ServiceName/HandlerName, e.g. Greeter/greet. Format for virtual objects/workflows: VirtualObjectName/Key/HandlerName, e.g. Greeter/Francesco/greet.',
      },
      {
        name: 'target_service_name',
        description: 'The name of the invoked service.',
      },
      {
        name: 'target_service_key',
        description:
          'The key of the virtual object or the workflow ID. Null for regular services.',
      },
      {
        name: 'target_handler_name',
        description: 'The invoked handler.',
      },
      {
        name: 'target_service_ty',
        description:
          'The service type. Either service or virtual_object or workflow.',
      },
      {
        name: 'idempotency_key',
        description: 'Idempotency key, if any.',
      },
      {
        name: 'invoked_by',
        description: `Either: \ningress if the invocation was created externally. \nservice if the invocation was created by another Restate service. \nsubscription if the invocation was created by a subscription (e.g. Kafka).`,
      },
      {
        name: 'invoked_by_service_name',
        description: "The name of caller service if invoked_by = 'service'.",
      },
      {
        name: 'invoked_by_id',
        description: "The caller Invocation ID if invoked_by = 'service'.",
      },
      {
        name: 'invoked_by_subscription_id',
        description: "The subscription id if invoked_by = 'subscription'.",
      },
      {
        name: 'invoked_by_target',
        description: "The caller invocation target if invoked_by = 'service'.",
      },
      {
        name: 'pinned_deployment_id',
        description:
          'The ID of the service deployment that started processing this invocation, and will continue to do so (e.g. for retries). This gets set after the first journal entry has been stored for this invocation.',
      },
      {
        name: 'pinned_service_protocol_version',
        description:
          'The negotiated protocol version used for this invocation. This gets set after the first journal entry has been stored for this invocation.',
      },
      {
        name: 'trace_id',
        description:
          'The ID of the trace that is assigned to this invocation. Only relevant when tracing is enabled.',
      },
      {
        name: 'journal_size',
        description:
          'The number of journal entries durably logged for this invocation.',
      },
      {
        name: 'created_at',
        description: 'Timestamp indicating the start of this invocation.',
      },
      {
        name: 'modified_at',
        description:
          'Timestamp indicating the last invocation status transition. For example, last time the status changed from invoked to suspended.',
      },
      {
        name: 'inboxed_at',
        description:
          'Timestamp indicating when the invocation was inboxed, if ever.',
      },
      {
        name: 'scheduled_at',
        description:
          'Timestamp indicating when the invocation was scheduled, if ever.',
      },
      {
        name: 'running_at',
        description:
          'Timestamp indicating when the invocation first transitioned to running, if ever.',
      },
      {
        name: 'completed_at',
        description:
          'Timestamp indicating when the invocation was completed, if ever.',
      },
    ],
  },
  {
    name: 'sys_invocation_state',
    description: "Table to inspect invocations' state",
    columns: [
      {
        name: 'id',
        description: 'Invocation ID.',
      },
      {
        name: 'partition_key',
        description:
          'Internal column that is used for partitioning the services invocations. Can be ignored.',
      },
      {
        name: 'in_flight',
        description: 'If true, the invocation is currently in-flight',
      },
      {
        name: 'retry_count',
        description:
          'The number of invocation attempts since the current leader started executing it. Increments on start, so a value greater than 1 means a failure occurred. Note: the value is not a global attempt counter across invocation suspensions and leadership changes.',
      },
      {
        name: 'last_start_at',
        description:
          'Timestamp indicating the start of the most recent attempt of this invocation.',
      },
      {
        name: 'last_attempt_deployment_id',
        description:
          'The ID of the service deployment that executed the most recent attempt of this invocation; this is set before a journal entry is stored, but can change later.',
      },
      {
        name: 'last_attempt_server',
        description: 'Server/SDK version, e.g. restate-sdk-java/1.0.1',
      },
      {
        name: 'next_retry_at',
        description:
          'Timestamp indicating the start of the next attempt of this invocation.',
      },
      {
        name: 'last_failure',
        description:
          'An error message describing the most recent failed attempt of this invocation, if any.',
      },
      {
        name: 'last_failure_error_code',
        description:
          'The error code of the most recent failed attempt of this invocation, if any.',
      },
      {
        name: 'last_failure_related_entry_index',
        description:
          'The index of the journal entry that caused the failure, if any. It may be out-of-bound of the currently stored entries in sys_journal.',
      },
      {
        name: 'last_failure_related_entry_name',
        description:
          'The name of the journal entry that caused the failure, if any.',
      },
      {
        name: 'last_failure_related_entry_type',
        description:
          'The type of the journal entry that caused the failure, if any. You can check all the available entry types in entries.rs.',
      },
    ],
  },
];
