import {
  ComponentType,
  createContext,
  PropsWithChildren,
  ReactNode,
  use,
  useEffect,
  useMemo,
  useRef,
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

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const input = inputRef.current;
    const keyHandler = (event: KeyboardEvent) => {
      if (
        event.key !== '/' ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.repeat
      ) {
        return;
      }
      if (
        event.target instanceof HTMLElement &&
        /^(?:input|textarea|select|button)$/i.test(event.target?.tagName)
      )
        return;
      event.preventDefault();
      input?.focus();
    };
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('keydown', keyHandler);
    };
  }, []);

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
      ref={inputRef}
    />
  );
}
