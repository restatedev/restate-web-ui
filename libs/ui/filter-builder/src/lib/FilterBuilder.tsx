import type { ComponentProps } from 'react';
import { Icon, IconName } from '@restate/ui-icons';
import { FocusShortcutKey } from '@restate/ui-keyboard';
import {
  AddQueryTrigger,
  QueryBuilder,
  useQueryBuilder,
} from '@restate/ui-query-builder';
import { tv } from '@restate/util-styles';

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
} from '@restate/ui-query-builder';

export const FilterBuilder = QueryBuilder;
export const useFilterBuilder = useQueryBuilder;

export type AddFilterTriggerVariant = 'default' | 'toolbar';

export type AddFilterTriggerProps = ComponentProps<typeof AddQueryTrigger> & {
  variant?: AddFilterTriggerVariant;
};

const toolbarStyles = tv({
  slots: {
    root: 'min-h-6.5 w-full justify-end text-primary',
    input:
      'min-h-6.5 max-w-[38ch] flex-[0_1_38ch] bg-surface/70 shadow-xs hover:bg-surface [&_input]:h-6 [&_input]:min-h-6 [&_input]:py-0.5 [&_input]:placeholder:text-subtle',
    tagGroup: 'min-w-0 flex-nowrap',
    popover: 'w-80 max-w-[calc(100vw-2rem)] min-w-80 bg-surface/95 p-1',
    option:
      'gap-2 px-2.5 py-1.5 highlighted:bg-accent-subtle highlighted:text-accent-strong',
  },
});

export function AddFilterTrigger({
  variant = 'default',
  ...props
}: AddFilterTriggerProps) {
  if (variant === 'default') {
    return <AddQueryTrigger {...props} />;
  }
  const { root, input, tagGroup, popover, option } = toolbarStyles();
  return (
    <AddQueryTrigger
      inputPrefix={<Icon name={IconName.Search} size="md" tone="subtle" />}
      tagsPlacement="outside"
      maxVisibleChips="auto"
      chipOverflowStrategy="all"
      showSectionTitle={false}
      popoverPlacement="bottom start"
      {...props}
      className={root({ className: props.className })}
      inputClassName={input({ className: props.inputClassName })}
      tagGroupClassName={tagGroup({ className: props.tagGroupClassName })}
      popoverClassName={popover({ className: props.popoverClassName })}
      optionClassName={option({ className: props.optionClassName })}
    />
  );
}

export function FilterShortcutTrigger() {
  return <FocusShortcutKey className="mr-1 ml-1" />;
}
