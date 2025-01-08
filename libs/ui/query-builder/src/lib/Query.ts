export type QueryClauseType = 'STRING' | 'STRING_LIST' | 'NUMBER' | 'DATE';
export type QueryClauseOperation =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'IN'
  | 'NOT_IN'
  | 'BEFORE'
  | 'LESS_THAN'
  | 'GREATER_THAN';
export interface QueryClauseSchema<T extends QueryClauseType> {
  id: string;
  label: string;
  operations: QueryClauseOperation[];
  type: T;
  loadOptions?: () => Promise<{ value: string; label: string }[]>;
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

  get textValue() {
    return this.schema.label;
  }

  get type() {
    return this.schema.type;
  }

  get operations() {
    return this.schema.operations;
  }

  get options() {
    return this.schema.loadOptions?.();
  }

  constructor(
    public readonly schema: QueryClauseSchema<T>,
    public readonly value?: {
      operation: QueryClauseOperation;
      value: QueryClauseValue<T>;
    }
  ) {}
}
