import {
  ComponentType,
  createContext,
  PropsWithChildren,
  ReactNode,
  use,
  useMemo,
} from 'react';
import { QueryClause, QueryClauseSchema, QueryClauseType } from './Query';
import { FormFieldMultiCombobox } from '@restate/ui/form-field';
import { ListData, useListData } from 'react-stately';

interface QueryBuilderProps {
  schema: QueryClauseSchema<QueryClauseType>[];
  query: ListData<QueryClause<QueryClauseType>>;
}

const QueryBuilderContext = createContext<{
  query?: ListData<QueryClause<QueryClauseType>>;
  schema: QueryClauseSchema<QueryClauseType>[];
}>({
  schema: [],
});

export function useQueryBuilder(
  initialClauses: QueryClause<QueryClauseType>[] = []
) {
  const selectedClauses = useListData<QueryClause<QueryClauseType>>({
    initialItems: initialClauses,
  });

  return selectedClauses;
}

export function QueryBuilder({
  schema,
  query,
  children,
}: PropsWithChildren<QueryBuilderProps>) {
  return (
    <QueryBuilderContext.Provider
      value={{
        schema,
        query,
      }}
    >
      {children}
    </QueryBuilderContext.Provider>
  );
}

export function AddQueryTrigger({
  placeholder,
  title,
  children,
  className,
  MenuTrigger,
}: {
  placeholder: string;
  title: string;
  children?: (props: {
    item: QueryClause<QueryClauseType>;
    onRemove?: VoidFunction;
    onUpdate?: (item: QueryClause<QueryClauseType>) => void;
  }) => ReactNode;
  className?: string;
  MenuTrigger?: ComponentType<unknown>;
}) {
  const { query, schema } = use(QueryBuilderContext);
  const items = useMemo(
    () => schema.map((clauseSchema) => new QueryClause(clauseSchema)),
    [schema]
  );

  if (!query) {
    return null;
  }

  return (
    <FormFieldMultiCombobox<QueryClause<QueryClauseType>>
      selectedList={query}
      label={title}
      items={items}
      children={children}
      placeholder={placeholder}
      className={className}
      MenuTrigger={MenuTrigger}
    />
  );
}
