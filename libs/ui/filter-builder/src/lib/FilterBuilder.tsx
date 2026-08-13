import { FocusShortcutKey } from '@restate/ui/keyboard';
import {
  AddQueryTrigger,
  QueryBuilder,
  useQueryBuilder,
} from '@restate/ui/query-builder';

export {
  QueryClause,
  type QueryClauseDateRangeValue,
  type QueryClauseOperation,
  type QueryClauseOperationId,
  type QueryClauseOption,
  type QueryClauseSchema,
  type QueryClauseType,
  type QueryClauseValue,
  queryClauseOperationRequiresValue,
} from '@restate/ui/query-builder';

export const FilterBuilder = QueryBuilder;
export const AddFilterTrigger = AddQueryTrigger;
export const useFilterBuilder = useQueryBuilder;

export function FilterShortcutTrigger() {
  return <FocusShortcutKey className="mr-1 ml-1" />;
}
