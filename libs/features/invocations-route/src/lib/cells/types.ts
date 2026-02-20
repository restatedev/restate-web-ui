import type { Invocation } from '@restate/data-access/admin-api-spec';

export interface CellProps {
  invocation: Invocation;
  isVisible?: boolean;
}
