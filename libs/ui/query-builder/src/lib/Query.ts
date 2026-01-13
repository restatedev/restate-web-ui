import { formatDateTime } from '@restate/util/intl';

export type QueryClauseType =
  | 'CUSTOM_STRING'
  | 'STRING'
  | 'STRING_LIST'
  | 'NUMBER'
  | 'DATE';
export type QueryClauseOperationId =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'IN'
  | 'NOT_IN'
  | 'BEFORE'
  | 'AFTER'
  | 'LESS_THAN'
  | 'GREATER_THAN'
  | 'IS NULL'
  | 'IS NOT NULL';

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
  options?: QueryClauseOption[];
}
export type QueryClauseValue<T extends QueryClauseType> = T extends 'STRING'
  ? string
  : T extends 'CUSTOM_STRING'
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
    if (this.type === 'CUSTOM_STRING') {
      return this.fieldValue;
    }
    return this.schema.label;
  }

  get textValue() {
    if (this.type === 'CUSTOM_STRING') {
      return this.fieldValue;
    }
    return this.schema.label;
  }

  get type() {
    return this.schema.type;
  }

  get allowCustomValue() {
    return this.type === 'CUSTOM_STRING';
  }

  get operations() {
    return this.schema.operations;
  }

  get operationLabel() {
    return this.schema.operations.find(
      (op) => op.value === this.value.operation,
    )?.label;
  }

  get valueLabel() {
    const value = this.value.value;
    if (typeof value === 'number' || typeof value === 'string') {
      const valueOption = this.options?.find((opt) => opt.value === value);
      return valueOption?.label ?? String(value);
    }
    if (value instanceof Date) {
      return formatDateTime(value, 'system');
    }
    if (Array.isArray(value)) {
      return value
        .map((v) => this.options?.find((opt) => opt.value === v)?.label ?? v)
        .join(', ');
    }
    return '';
  }

  private _options?: QueryClauseOption[];
  private _disabled = false;
  get options() {
    return this._options;
  }

  get isValid() {
    if (Array.isArray(this.value.value)) {
      return this.value.value.length > 0;
    } else {
      return (
        !!this.value.value ||
        ['IS NULL', 'IS NOT NULL'].includes(this.value.operation as string)
      );
    }
  }

  get isAllSelected() {
    if (this.type === 'STRING_LIST') {
      return Boolean(
        this.options &&
          this.options.length > 1 &&
          this.options?.every(
            ({ value }) =>
              Array.isArray(this.value.value) &&
              this.value.value.includes(value),
          ),
      );
    }
    return false;
  }

  get isNothingSelected() {
    if (this.type === 'STRING_LIST') {
      return Boolean(
        this.options &&
          Array.isArray(this.value.value) &&
          this.value.value.length === 0,
      );
    }
    return false;
  }

  get disabled() {
    return this._disabled;
  }

  get fieldValue() {
    return this.value.fieldValue ?? this.id;
  }

  constructor(
    public readonly schema: QueryClauseSchema<T>,
    public readonly value: {
      operation?: QueryClauseOperationId;
      value?: QueryClauseValue<T>;
      fieldValue?: string;
    } = { operation: schema.operations[0]?.value, value: undefined },
  ) {
    this._options = schema.options;
    this._disabled = Boolean(
      schema.type === 'STRING_LIST' &&
        schema.options &&
        schema.options.length === 0,
    );
    this.schema
      .loadOptions?.()
      ?.then((opts) => {
        this._options = opts;
        this._disabled = schema.type === 'STRING_LIST' && opts.length === 0;
      })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .catch(() => {});
  }

  toString() {
    if (
      !this.value.value &&
      !['IS NULL', 'IS NOT NULL'].includes(this.value.operation as string)
    ) {
      return undefined;
    }
    return JSON.stringify({
      operation: this.value.operation,
      ...(typeof this.value.value !== 'undefined' && {
        value: this.value.value,
      }),
    });
  }

  static fromJSON(schema: QueryClauseSchema<QueryClauseType>, value: string) {
    try {
      const parsedValue = JSON.parse(value) as {
        operation?: QueryClauseOperationId;
        value?: number | string | string[];
        fieldValue?: string;
      };
      return new QueryClause(schema, {
        operation: parsedValue.operation,
        value: getValue(schema.type, parsedValue.value),
        fieldValue: parsedValue.fieldValue,
      });
    } catch (error) {
      return new QueryClause(schema);
    }
  }
}

function getValue(type: QueryClauseType, value?: number | string | string[]) {
  if (type === 'CUSTOM_STRING' && typeof value === 'string') {
    return value;
  }
  if (type === 'STRING' && typeof value === 'string') {
    return value;
  }
  if (type === 'NUMBER' && !isNaN(Number(value))) {
    return Number(value);
  }
  if (type === 'DATE' && typeof value === 'string') {
    return new Date(value);
  }
  if (
    type === 'STRING_LIST' &&
    Array.isArray(value) &&
    value.every((v) => typeof v === 'string')
  ) {
    return value;
  }
  return undefined;
}
