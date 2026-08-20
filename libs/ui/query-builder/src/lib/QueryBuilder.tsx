import {
  ComponentType,
  createContext,
  PropsWithChildren,
  ReactNode,
  RefObject,
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
import { useFocusShortcut } from '@restate/ui/keyboard';
import { Icon, IconName } from '@restate/ui/icons';

interface QueryBuilderProps {
  schema: QueryClauseSchema<QueryClauseType>[];
  query: ListData<QueryClause<QueryClauseType>>;
  multiple: boolean;
  canRemoveItem?: (key: Key) => boolean;
  isLoadingSchema?: boolean;
}

const QueryBuilderContext = createContext<{
  query?: ListData<QueryClause<QueryClauseType>>;
  schema: QueryClauseSchema<QueryClauseType>[];
  newId?: string;
  setNewId?: (id?: string) => void;
  canRemoveItem?: (key: Key) => boolean;
  multiple: boolean;
}>({
  schema: [],
  multiple: false,
});

export function useQueryBuilder(
  initialClauses: QueryClause<QueryClauseType>[] = [],
  isLoading?: boolean,
) {
  const selectedClauses = useListData<QueryClause<QueryClauseType>>({
    initialItems: initialClauses,
  });

  const ref = useRef({
    initialClauses,
    selectedClauses,
  });

  useEffect(() => {
    ref.current = {
      initialClauses,
      selectedClauses,
    };
  });

  const initialClausesSignature = initialClauses
    .map((c) => `${c.id}:${c.schema.label}:${String(c)}`)
    .join('|');

  useEffect(() => {
    if (!isLoading) {
      ref.current.selectedClauses.remove(
        ...ref.current.selectedClauses.items.map((item) => item.id),
      );
      ref.current.initialClauses.forEach((item, index) => {
        ref.current.selectedClauses.insert(index, item);
      });
    }
  }, [isLoading, initialClausesSignature]);

  return selectedClauses;
}

export function QueryBuilder({
  schema,
  query,
  children,
  multiple,
  canRemoveItem,
}: PropsWithChildren<QueryBuilderProps>) {
  const [newId, setNewId] = useState<string>();

  return (
    <QueryBuilderContext.Provider
      value={{
        schema,
        query,
        newId,
        setNewId,
        multiple,
        canRemoveItem,
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
  prefix,
  onInputSubmit,
  onItemRemove,
  renderOption,
  disabled,
  inputClassName,
  tagGroupClassName,
  inputPrefix,
  optionClassName,
  popoverClassName,
  popoverPlacement,
  showSectionTitle,
  tagsPlacement,
  maxVisibleChips,
  chipOverflowStrategy,
}: {
  placeholder: string;
  title: string;
  children?: (props: {
    item: QueryClause<QueryClauseType>;
    onRemove?: VoidFunction;
    onUpdate?: (item: QueryClause<QueryClauseType>) => void;
    formRef?: RefObject<HTMLFormElement | null>;
  }) => ReactNode;
  className?: string;
  prefix?: ReactNode;
  MenuTrigger?: ComponentType<unknown>;
  onInputSubmit?: (value: string) => boolean;
  onItemRemove?: (key: Key) => void;
  renderOption?: (item: QueryClause<QueryClauseType>) => ReactNode;
  disabled?: boolean;
  inputClassName?: string;
  tagGroupClassName?: string;
  inputPrefix?: ReactNode;
  optionClassName?: string;
  popoverClassName?: string;
  popoverPlacement?: 'bottom' | 'bottom start' | 'bottom end';
  showSectionTitle?: boolean;
  tagsPlacement?: 'inside' | 'outside';
  maxVisibleChips?: number | 'auto';
  chipOverflowStrategy?: 'partial' | 'all';
}) {
  const { query, schema, newId, setNewId, multiple, canRemoveItem } =
    use(QueryBuilderContext);
  const items = useMemo(() => {
    return schema.map((clauseSchema) => new QueryClause(clauseSchema));
  }, [schema]);
  const onAddValuesRef = useRef({ items, query });
  useEffect(() => {
    onAddValuesRef.current = { items, query };
  }, [items, query]);

  const inputRef = useFocusShortcut<HTMLInputElement>();

  const onAdd = useCallback(
    (key: Key, value?: string) => {
      const { items: currentItems, query: currentQuery } =
        onAddValuesRef.current;
      const customClause = currentItems.find(
        (item) => item.id === key && item.type === 'CUSTOM_STRING',
      );
      if (customClause) {
        const newCustomClause = new QueryClause(customClause.schema, {
          ...customClause.value,
          fieldValue: value,
        });
        currentQuery?.update(key, newCustomClause);
      }
      setNewId?.(String(key));
    },
    [setNewId],
  );
  const onRemove = useCallback(
    (key: Key) => {
      setNewId?.(undefined);
      onItemRemove?.(key);
    },
    [onItemRemove, setNewId],
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
      prefix={prefix}
      canRemoveItem={canRemoveItem}
      multiple={multiple}
      onInputSubmit={onInputSubmit}
      renderOption={renderOption}
      disabled={disabled}
      inputClassName={inputClassName}
      tagGroupClassName={tagGroupClassName}
      inputPrefix={inputPrefix}
      optionClassName={optionClassName}
      popoverClassName={popoverClassName}
      popoverPlacement={popoverPlacement}
      showSectionTitle={showSectionTitle}
      tagsPlacement={tagsPlacement}
      maxVisibleTags={maxVisibleChips}
      tagOverflowStrategy={newId ? 'partial' : chipOverflowStrategy}
      overflowItemLabel="filter"
      overflowPrefix={
        <Icon
          name={IconName.ListFilter}
          className="h-3.5 w-3.5 shrink-0 text-blue-600"
        />
      }
      overflowClassName="border-gray-200 bg-gray-50 font-medium text-zinc-700 shadow-xs hover:bg-gray-100 pressed:bg-gray-200"
    />
  );
}

export function useNewQueryId() {
  const { newId } = use(QueryBuilderContext);
  return newId;
}

export function useFinishNewQuery() {
  const { setNewId } = use(QueryBuilderContext);
  return useCallback(() => setNewId?.(undefined), [setNewId]);
}
