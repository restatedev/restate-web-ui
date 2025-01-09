import { formatDateTime } from '@restate/util/intl';

export type QueryClauseType = 'STRING' | 'STRING_LIST' | 'NUMBER' | 'DATE';
export type QueryClauseOperationId =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'IN'
  | 'NOT_IN'
  | 'BEFORE'
  | 'AFTER'
  | 'LESS_THAN'
  | 'GREATER_THAN';

interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export type QueryClauseOperation = Option<QueryClauseOperationId>;
export type QueryClauseOption = Option<string>;
export interface QueryClauseSchema<T extends QueryClauseType> {
  id: string;
  label: string;
  operations: QueryClauseOperation[];
  type: T;
  loadOptions?: () => Promise<QueryClauseOption[]>;
}
type QueryClauseValue<T extends QueryClauseType> = T extends 'STRING'
  ? string
  : T extends 'NUMBER'
  ? number
  : T extends 'STRING_LIST'
  ? string[]
  : T extends 'DATE'
  ? Date
  : never;

export class QueryClause<T extends QueryClauseType> {
  get id() {
    return this.schema.id;
  }

  get name() {
    return this.schema.id;
  }

  get label() {
    return this.schema.label;
  }

  get textValue() {
    return this.schema.label;
  }

  get type() {
    return this.schema.type;
  }

  get operations() {
    return this.schema.operations;
  }

  get operationLabel() {
    return this.schema.operations.find(
      (op) => op.value === this.value.operation
    )?.label;
  }

  get valueLabel() {
    const value = this.value.value;
    if (typeof value === 'number' || typeof value === 'string') {
      return String(value);
    }
    if (value instanceof Date) {
      return formatDateTime(value, 'system');
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return '';
  }

  private _options?: QueryClauseOption[];
  get options() {
    if (this._options) {
      return this._options;
    }
    return this.schema.loadOptions?.().then((options) => {
      this._options = options;
      return options;
    });
  }

  constructor(
    public readonly schema: QueryClauseSchema<T>,
    public readonly value: {
      operation?: QueryClauseOperationId;
      value?: QueryClauseValue<T>;
    } = { operation: schema.operations[0]?.value, value: undefined }
  ) {}
}
