export type StateTableColumnId =
  | 'object_key'
  | 'scope'
  | 'state_key'
  | 'size'
  | 'value'
  | 'actions';

export type StateEntry = {
  name: string;
  value?: string;
  size: number;
};

export type StateObjectRecord = {
  id: string;
  key: string;
  scope?: string;
  state: StateEntry[];
};
