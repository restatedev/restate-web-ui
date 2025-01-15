import {
  ComponentType,
  createContext,
  PropsWithChildren,
  ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { QueryClause, QueryClauseSchema, QueryClauseType } from './Query';
import { FormFieldMultiCombobox } from '@restate/ui/form-field';
import { Key, ListData, useListData } from 'react-stately';

interface QueryBuilderProps {
  schema: QueryClauseSchema<QueryClauseType>[];
  query: ListData<QueryClause<QueryClauseType>>;
}

const QueryBuilderContext = createContext<{
  query?: ListData<QueryClause<QueryClauseType>>;
  schema: QueryClauseSchema<QueryClauseType>[];
  newId?: string;
  setNewId?: (id?: string) => void;
}>({
  schema: [],
});

// TODO: update state if schema changes
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
  const [newId, setNewId] = useState<string>();

  return (
    <QueryBuilderContext.Provider
      value={{
        schema,
        query,
        newId,
        setNewId,
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
  const { query, schema, setNewId } = use(QueryBuilderContext);
  const items = useMemo(() => {
    return schema.map((clauseSchema) => new QueryClause(clauseSchema));
  }, [schema]);

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
        (/^(?:input|textarea|select|button)$/i.test(event.target?.tagName) ||
          event.target.closest('[role=listbox]') ||
          event.target.closest('[role=dialog]'))
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

  const onAdd = useCallback(
    (key: Key) => {
      setNewId?.(String(key));
    },
    [setNewId]
  );
  const onRemove = useCallback(
    (key: Key) => {
      setNewId?.(undefined);
    },
    [setNewId]
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
      ref={inputRef}
      onItemAdd={onAdd}
      onItemRemove={onRemove}
      onItemUpdated={onRemove}
    />
  );
}

export function useNewQueryId() {
  const { newId } = use(QueryBuilderContext);
  return newId;
}
