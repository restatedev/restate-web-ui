import { useFeatures } from '@restate/data-access/admin-api';
import {
  type CreateLimitRuleRequest,
  type LimitRule,
  type LimitRuleWithStats,
  type UpdateLimitRuleRequest,
  useCreateLimitRule,
  useDeleteLimitRule,
  useListLimitRules,
  useUpdateLimitRule,
} from '@restate/data-access/admin-api-hooks';
import { LimitRuleTarget } from '@restate/features/vqueue-ui';
import { useRestateContext } from '@restate/features/restate-context';
import { Badge } from '@restate/ui/badge';
import { Button, SubmitButton } from '@restate/ui/button';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui/content-panel';
import {
  ConfirmationDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from '@restate/ui/dialog';
import { DropdownItem } from '@restate/ui/dropdown';
import { EmptyState } from '@restate/ui/empty-state';
import { ErrorBanner } from '@restate/ui/error';
import { FormFieldCheckbox } from '@restate/ui/form-field';
import { Icon, IconName } from '@restate/ui/icons';
import { SplitButton } from '@restate/ui/split-button';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui/table';
import {
  InlineTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TruncateWithTooltip,
} from '@restate/ui/tooltip';
import { formatNumber } from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import { type QueryKey, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useId, useMemo, useState } from 'react';
import { Form, useNavigate } from 'react-router';
import {
  FieldError,
  Input,
  Label,
  TextField,
  type SortDescriptor,
} from 'react-aria-components';
import {
  buildPattern,
  concurrencyError,
  getRuleLevel,
  patternPartError,
  splitPattern,
  type PatternFields,
  type RuleLevel,
} from './pattern';
import { RuleMatchPreview, RulePatternBuilder } from './RulePatternBuilder';
import { LimitValue } from './LimitValue';
import {
  RULE_LEVEL_COLUMN_WIDTH,
  RuleLevelBadge,
  RuleLevelExplainer,
  RuleLevelValue,
} from './RuleLevel';
import { limitCountersForRuleHref } from './navigation';
import { LIMIT_LIST_QUERY_SIZE } from './limits.constants';
import {
  LimitListPagination,
  useLimitListPagination,
} from './LimitListPagination';
import { FlowControlHero, flowControlTabs } from './FlowControlPage';

type RuleColumn =
  | 'pattern'
  | 'level'
  | 'limit'
  | 'counters'
  | 'description'
  | 'enabled'
  | 'actions';

interface RuleRow extends LimitRuleWithStats {
  id: string;
  href: string;
  level: RuleLevel;
}

export type EditableLimitRule = Pick<
  LimitRule,
  'pattern' | 'description' | 'disabled' | 'limits' | 'version'
>;

const RULE_COLUMNS: PanelTableColumn<RuleColumn>[] = [
  {
    id: 'pattern',
    name: 'Pattern',
    isRowHeader: true,
    allowsSorting: true,
    defaultWidth: '4fr',
  },
  {
    id: 'level',
    name: <RuleLevelExplainer />,
    width: RULE_LEVEL_COLUMN_WIDTH,
  },
  {
    id: 'limit',
    name: 'Limit',
    defaultWidth: '2fr',
    maxWidth: 160,
  },
  {
    id: 'counters',
    name: <CounterSummaryExplainer />,
    defaultWidth: '3fr',
    maxWidth: 250,
  },
  {
    id: 'description',
    name: 'Description',
    defaultWidth: '4fr',
  },
  {
    id: 'enabled',
    name: 'Status',
    width: 100,
  },
  { id: 'actions', name: 'Actions', hideLabel: true, width: 40 },
];

function CounterSummaryExplainer() {
  return (
    <InlineTooltip
      variant="indicator-button"
      title="Limit counters"
      ariaLabel="Explain backlogged limit counters"
      description={
        <p className="max-w-72 text-xs leading-4 text-zinc-300">
          A backlogged limit counter currently has at least one VQueue waiting
          for capacity. The ratio compares backlogged limit counters with all
          concrete limit counters governed by this rule.
        </p>
      }
    >
      Backlogged / total
    </InlineTooltip>
  );
}

const counterValueStyles = tv({
  variants: {
    hasWaiters: {
      true: 'text-amber-700',
      false: 'text-zinc-300',
    },
  },
});

const refreshIconStyles = tv({
  base: 'h-3.5 w-3.5',
  variants: {
    isFetching: {
      true: 'animate-spin',
    },
  },
});

const ruleActionButtonStyles = tv({
  base: 'flex translate-x-px items-center gap-1 rounded-r-none whitespace-nowrap text-gray-600',
  variants: {
    alwaysVisible: {
      true: 'rounded-l-lg px-2 py-0.5 [font-size:inherit] [line-height:inherit] max-md:hidden',
      false:
        'invisible absolute right-full z-2 rounded-l-md px-2.5 py-0.5 text-0.5xs drop-shadow-[-20px_2px_4px_--theme(--color-gray-100/0.5)] group-hover:visible',
    },
  },
  defaultVariants: { alwaysVisible: false },
});

const ruleActionGroupStyles = tv({
  variants: {
    inline: {
      true: 'rounded-l-lg text-[0.9375rem]',
      false: '',
    },
  },
});

const ruleActionSplitStyles = tv({
  variants: {
    inline: {
      true: 'rounded-lg md:rounded-l-none',
      false: '',
    },
  },
});

function CounterSummaryCell({
  total,
  withWaiters,
}: {
  total: number;
  withWaiters: number;
}) {
  const affected = Math.min(withWaiters, total);
  const percentage = total > 0 ? (affected / total) * 100 : 0;
  const label = `${formatNumber(affected)} of ${formatNumber(total)} limit counters have waiting VQueues`;

  return (
    <div aria-label={label} className="flex w-full max-w-48 items-center gap-2">
      <div className="flex h-3 min-w-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 p-0.5">
        {affected > 0 && (
          <div
            className="h-full rounded-full bg-amber-200 outline-1 outline-amber-300 transition-all"
            style={{ width: `${percentage}%`, minWidth: 2 }}
          />
        )}
      </div>
      <span
        aria-hidden="true"
        className="mr-2 flex min-w-12 shrink-0 items-baseline justify-end gap-1 text-xs font-medium tabular-nums"
      >
        <span className={counterValueStyles({ hasWaiters: affected > 0 })}>
          {formatNumber(affected)}
        </span>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-500">{formatNumber(total)}</span>
      </span>
    </div>
  );
}

function RuleStatusBadge({ disabled }: { disabled: boolean }) {
  return (
    <Badge size="sm" variant={disabled ? 'default' : 'info'}>
      {disabled ? 'Disabled' : 'Enabled'}
    </Badge>
  );
}

export function RuleActions({
  rule,
  onToggle,
  onEdit,
  onDelete,
  alwaysShowPrimary,
}: {
  rule: EditableLimitRule;
  onToggle: (rule: EditableLimitRule) => void;
  onEdit: (rule: EditableLimitRule) => void;
  onDelete: (rule: EditableLimitRule) => void;
  alwaysShowPrimary?: boolean;
}) {
  const enabled = !rule.disabled;
  return (
    <div className="flex justify-end">
      <SplitButton
        mini={alwaysShowPrimary ? 'md' : true}
        className={ruleActionGroupStyles({ inline: alwaysShowPrimary })}
        splitClassName={ruleActionSplitStyles({ inline: alwaysShowPrimary })}
        onSelect={(action) => {
          if (action === 'toggle') {
            onToggle(rule);
          }
          if (action === 'edit') onEdit(rule);
          if (action === 'delete') onDelete(rule);
        }}
        menus={[
          <DropdownItem key="toggle" value="toggle">
            <Icon
              name={enabled ? IconName.Pause : IconName.Play}
              className="h-3.5 w-3.5 shrink-0 opacity-80"
            />
            {enabled ? 'Disable rule' : 'Enable rule'}
          </DropdownItem>,
          <DropdownItem key="edit" value="edit">
            <Icon
              name={IconName.Pencil}
              className="h-3.5 w-3.5 shrink-0 opacity-80"
            />
            Edit…
          </DropdownItem>,
          <DropdownItem key="delete" value="delete" destructive>
            <Icon
              name={IconName.Trash}
              className="h-3.5 w-3.5 shrink-0 opacity-80"
            />
            Delete…
          </DropdownItem>,
        ]}
      >
        <Button
          variant="secondary"
          onClick={() => onEdit(rule)}
          className={ruleActionButtonStyles({
            alwaysVisible: alwaysShowPrimary,
          })}
        >
          Edit
        </Button>
      </SplitButton>
    </div>
  );
}

function renderRuleCell(
  row: RuleRow,
  column: PanelTableColumn<RuleColumn>,
  onToggle: (rule: EditableLimitRule) => void,
  onEdit: (rule: EditableLimitRule) => void,
  onDelete: (rule: EditableLimitRule) => void,
) {
  switch (column.id) {
    case 'pattern':
      return (
        <Cell className="overflow-visible">
          <LimitRuleTarget
            pattern={row.pattern}
            href={row.href}
            variant="table"
          />
        </Cell>
      );
    case 'level':
      return (
        <Cell>
          <RuleLevelValue level={row.level} />
        </Cell>
      );
    case 'limit':
      return (
        <Cell>
          <LimitValue value={row.limits.concurrency} disabled={row.disabled} />
        </Cell>
      );
    case 'counters':
      return (
        <Cell>
          <CounterSummaryCell
            total={row.num_counters}
            withWaiters={row.num_counters_with_waiters}
          />
        </Cell>
      );
    case 'description':
      return (
        <Cell>
          {row.description ? (
            <TruncateWithTooltip hideCopy tooltipContent={row.description}>
              {row.description}
            </TruncateWithTooltip>
          ) : (
            <span className="text-zinc-400">No description</span>
          )}
        </Cell>
      );
    case 'enabled':
      return (
        <Cell>
          <RuleStatusBadge disabled={row.disabled} />
        </Cell>
      );
    case 'actions':
      return (
        <Cell className="align-top [&&&]:overflow-visible">
          <RuleActions
            rule={row}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </Cell>
      );
  }
}

interface RuleTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
  type?: 'text' | 'number';
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  validate?: (value: string) => string | null;
}

function RuleTextField({
  label,
  value,
  onChange,
  placeholder,
  description,
  type = 'text',
  required,
  readOnly,
  disabled,
  hideLabel,
  validate,
}: RuleTextFieldProps) {
  return (
    <TextField
      type={type}
      value={value}
      onChange={onChange}
      isRequired={required}
      isReadOnly={readOnly}
      isDisabled={disabled}
      validate={validate}
      className="flex min-w-0 flex-col gap-1.5"
    >
      <Label
        className={
          hideLabel
            ? 'sr-only'
            : 'text-sm font-medium text-gray-700 data-[disabled]:text-gray-400'
        }
      >
        {label}
      </Label>
      <Input
        placeholder={placeholder}
        min={type === 'number' ? 1 : undefined}
        spellCheck={false}
        className="mt-0 h-9 w-full min-w-0 rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-sm text-gray-900 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] outline-offset-2 placeholder:text-gray-500/70 invalid:border-red-500 invalid:bg-red-50 read-only:text-gray-600 focus:border-gray-200 focus:bg-white focus:ring-0 focus:outline-2 focus:outline-blue-600 disabled:border-gray-100 disabled:text-gray-400 disabled:shadow-none disabled:placeholder:text-gray-300 [&[readonly]]:bg-gray-100"
      />
      {description && (
        <span className="text-2xs leading-4 text-gray-500">{description}</span>
      )}
      <FieldError className="text-2xs leading-4 text-red-600" />
    </TextField>
  );
}

export function RuleFormDialog({
  rule,
  onOpenChange,
}: {
  rule?: EditableLimitRule;
  onOpenChange: (open: boolean) => void;
}) {
  const formId = useId();
  const create = useCreateLimitRule();
  const update = useUpdateLimitRule();
  const initialFields = splitPattern(rule?.pattern ?? '');
  const [fields, setFields] = useState<PatternFields>(initialFields);
  const [concurrency, setConcurrency] = useState(
    rule?.limits.concurrency == null ? '' : String(rule.limits.concurrency),
  );
  const [description, setDescription] = useState(rule?.description ?? '');
  const [enabled, setEnabled] = useState(!(rule?.disabled ?? false));
  const isEditing = Boolean(rule);
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;
  const pattern = buildPattern(fields);
  const ruleLevel = fields.scope.trim() ? getRuleLevel(pattern) : undefined;
  const hasValidMatch =
    !patternPartError(fields.scope, true) &&
    !patternPartError(fields.level1) &&
    !patternPartError(fields.level2) &&
    (!fields.level2.trim() || Boolean(fields.level1.trim()));
  const isValid = hasValidMatch && !concurrencyError(concurrency);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) return;
    const limits = { concurrency: Number(concurrency) };
    if (rule) {
      const request: UpdateLimitRuleRequest = {
        pattern: rule.pattern,
        description: description.trim() || null,
        disabled: !enabled,
        limits,
        version: rule.version,
      };
      update.mutate(request, {
        onSuccess: () => onOpenChange(false),
      });
      return;
    }
    const request: CreateLimitRuleRequest = {
      pattern,
      description: description.trim() || null,
      disabled: !enabled,
      limits,
    };
    create.mutate(request, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" isDismissable={!pending}>
        <Form
          id={formId}
          method="PUT"
          action="/limits/rules"
          className="flex flex-col gap-5"
          onSubmit={submit}
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-xs">
              <Icon name={IconName.Filters} className="h-5 w-5 text-blue-500" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Edit rule' : 'Create rule'}
              </h2>
              <p className="text-sm leading-5 text-gray-500">
                {isEditing
                  ? 'Update this rule’s capacity and settings. Its limit counter level cannot be changed.'
                  : 'Choose the limit counter level, then define which values it matches.'}
              </p>
            </div>
          </div>

          <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-3.5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h3 className="text-sm font-semibold text-zinc-800">
                    Rule pattern
                  </h3>
                  <RuleLevelExplainer
                    label=""
                    activeLevel={ruleLevel}
                    className="text-[0.6875rem] text-zinc-500"
                  />
                </div>
                <p className="text-2xs leading-4 text-zinc-500">
                  Start with a scope, then optionally add Level 1 and Level 2 to
                  narrow the limit.
                </p>
              </div>
              {ruleLevel && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-2xs text-zinc-400">Rule level</span>
                  <RuleLevelBadge level={ruleLevel} />
                </div>
              )}
            </div>
            <RulePatternBuilder
              fields={fields}
              onChange={setFields}
              disabled={isEditing}
            />
            {isEditing && (
              <p className="text-2xs text-zinc-400">
                The hierarchy and rule level cannot be changed after creation.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3 border-t border-gray-100 pt-5">
            <div className="grid gap-4 md:grid-cols-[11rem_minmax(0,1fr)]">
              <RuleTextField
                label="Concurrency"
                value={concurrency}
                onChange={setConcurrency}
                placeholder="e.g. 3"
                description="Maximum running invocations."
                type="number"
                required
                validate={concurrencyError}
              />
              <RuleTextField
                label="Description"
                value={description}
                onChange={setDescription}
                placeholder="Why this limit exists"
                description="Optional context for operators."
              />
            </div>
            <div>
              <div
                slot="title"
                className="mb-2 text-sm font-medium text-gray-700"
              >
                Enabled
              </div>
              <FormFieldCheckbox
                name="enabled"
                value="enabled"
                checked={enabled}
                onChange={setEnabled}
                disabled={pending}
                className="mt-0.5 self-baseline"
              >
                <span
                  slot="description"
                  className="block text-0.5xs leading-5 text-gray-500"
                >
                  Enforce this rule.
                </span>
              </FormFieldCheckbox>
            </div>
          </section>

          {fields.scope.trim() && (
            <RuleMatchPreview pattern={hasValidMatch ? pattern : ''} />
          )}

          <DialogFooter>
            <div className="flex flex-col gap-2">
              {error && <ErrorBanner error={error as Error} />}
              <div className="grid grid-cols-2 gap-2">
                <DialogClose>
                  <Button type="button" variant="secondary" disabled={pending}>
                    Cancel
                  </Button>
                </DialogClose>
                <SubmitButton
                  form={formId}
                  variant="primary"
                  disabled={!isValid}
                >
                  {isEditing ? 'Save rule' : 'Create'}
                </SubmitButton>
              </div>
            </div>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteRuleDialog({
  rule,
  onOpenChange,
  onDeleted,
}: {
  rule: EditableLimitRule;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const mutation = useDeleteLimitRule();
  return (
    <ConfirmationDialog
      open
      onOpenChange={onOpenChange}
      title="Delete limit rule"
      icon={IconName.Trash}
      iconClassName="text-red-500"
      description={
        <span className="flex flex-col items-start gap-1.5">
          <span className="flex items-center gap-1.5">
            Delete <LimitRuleTarget pattern={rule.pattern} />?
          </span>
          <span>Invocations will no longer be constrained by this rule.</span>
        </span>
      }
      submitText="Delete"
      closeText="Cancel"
      submitVariant="destructive"
      formMethod="POST"
      formAction="/limits/rules/bulk-delete"
      isPending={mutation.isPending}
      error={mutation.error as Error | null}
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate(
          {
            pattern: rule.pattern,
            expected_version: rule.version,
          },
          {
            onSuccess: () => {
              onOpenChange(false);
              onDeleted?.();
            },
          },
        );
      }}
    />
  );
}

type LimitRulesQueryData = {
  rules: LimitRuleWithStats[];
  hasMore: boolean;
} | null;

function setRuleDisabled(
  data: LimitRulesQueryData | undefined,
  pattern: string,
  disabled: boolean,
) {
  if (!data) return data;
  return {
    ...data,
    rules: data.rules.map((rule) =>
      rule.pattern === pattern ? { ...rule, disabled } : rule,
    ),
  };
}

function ToggleRuleDialog({
  rule,
  queryKey,
  onOpenChange,
}: {
  rule: EditableLimitRule;
  queryKey: QueryKey;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useUpdateLimitRule();
  const nextDisabled = !rule.disabled;
  const action = nextDisabled ? 'Disable' : 'Enable';

  return (
    <ConfirmationDialog
      open
      onOpenChange={onOpenChange}
      title={`${action} limit rule`}
      icon={nextDisabled ? IconName.Pause : IconName.Play}
      description={
        <span className="flex flex-col items-start gap-1.5">
          <span className="flex items-center gap-1.5">
            {action} <LimitRuleTarget pattern={rule.pattern} />?
          </span>
          <span>
            {nextDisabled
              ? 'Matching invocations will no longer be constrained by this rule.'
              : 'Matching invocations will be constrained by this rule.'}
          </span>
        </span>
      }
      submitText={action}
      closeText="Cancel"
      formMethod="PUT"
      formAction="/limits/rules"
      isPending={mutation.isPending}
      isSubmitDisabled={mutation.isPending}
      error={mutation.error as Error | null}
      onSubmit={async (event) => {
        event.preventDefault();
        await queryClient.cancelQueries({ queryKey, exact: true });
        const previous =
          queryClient.getQueryData<LimitRulesQueryData>(queryKey);
        queryClient.setQueryData<LimitRulesQueryData>(queryKey, (data) =>
          setRuleDisabled(data, rule.pattern, nextDisabled),
        );
        mutation.mutate(
          {
            pattern: rule.pattern,
            description: rule.description ?? null,
            disabled: nextDisabled,
            limits: rule.limits,
            version: rule.version,
          },
          {
            onError: () => queryClient.setQueryData(queryKey, previous),
            onSuccess: () => onOpenChange(false),
          },
        );
      }}
    />
  );
}

function Component() {
  const { baseUrl } = useRestateContext();
  const navigate = useNavigate();
  const features = useFeatures();
  const hasVqueues = features.has('vqueues');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'pattern',
    direction: 'ascending',
  });
  const ruleRequest = useMemo(
    () => ({
      sort: {
        field: 'pattern' as const,
        order: sortDescriptor.direction === 'ascending' ? 'ASC' : 'DESC',
      } as const,
      limit: LIMIT_LIST_QUERY_SIZE,
    }),
    [sortDescriptor],
  );
  const rules = useListLimitRules(ruleRequest, { enabled: hasVqueues });
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<EditableLimitRule | null>(
    null,
  );
  const [togglingRule, setTogglingRule] = useState<EditableLimitRule | null>(
    null,
  );
  const [deletingRule, setDeletingRule] = useState<EditableLimitRule | null>(
    null,
  );

  const rows = useMemo<RuleRow[]>(() => {
    return (rules.data?.rules ?? []).map((rule) => {
      return {
        ...rule,
        id: rule.pattern,
        href: limitCountersForRuleHref(baseUrl, rule.pattern),
        level: getRuleLevel(rule.pattern),
      };
    });
  }, [baseUrl, rules.data?.rules]);
  const rulePagination = useLimitListPagination(rows, ruleRequest);
  const ruleTableBodyKey = `${rules.isFetching ? 'loading' : 'ready'}:${rulePagination.pageItems
    .map((row) => row.id)
    .join(':')}`;

  const error = rules.error;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <FlowControlHero />
      <ContentPanel tabs={flowControlTabs(baseUrl, 'rules')}>
        <ContentPanelToolbar className="justify-end gap-2 px-1 pb-1">
          <Button
            type="button"
            variant="secondary"
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg py-0.5 pr-2 pl-1.5 text-0.5xs [&_svg]:h-3.5 [&_svg]:w-3.5"
            onClick={() => setCreateOpen(true)}
            disabled={!hasVqueues}
          >
            <Icon name={IconName.Plus} />
            New rule
          </Button>
          <Tooltip>
            <TooltipTrigger>
              <Button
                type="button"
                variant="icon"
                aria-label={
                  rules.isFetching ? 'Refreshing rules' : 'Refresh rules'
                }
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg p-0"
                onClick={() => void rules.refetch()}
                disabled={!hasVqueues || rules.isFetching}
              >
                <Icon
                  name={IconName.Retry}
                  className={refreshIconStyles({
                    isFetching: rules.isFetching,
                  })}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent size="sm">Refresh rules</TooltipContent>
          </Tooltip>
        </ContentPanelToolbar>
        <ContentPanelBody className="pb-32">
          <ContentPanelSection flush>
            {!hasVqueues ? (
              <EmptyState
                icon={IconName.Filters}
                title="Flow control is not enabled"
                description="Enable VQueues on the Restate server to create and manage concurrency rules."
              />
            ) : (
              <PanelTable
                aria-label="Limit rules"
                bodyKey={ruleTableBodyKey}
                columns={RULE_COLUMNS}
                items={rulePagination.pageItems}
                isLoading={rules.isFetching}
                error={error as Error | null}
                numOfRows={Math.max(rulePagination.pageItems.length, 6)}
                bodyDependencies={[error, rules.isFetching]}
                sortDescriptor={sortDescriptor}
                onSortChange={setSortDescriptor}
                emptyPlaceholder={
                  <EmptyState
                    icon={IconName.Filters}
                    title="No limit rules"
                    description="Create a rule to configure concurrency capacity."
                  />
                }
                renderCell={(row, column) =>
                  renderRuleCell(
                    row,
                    column,
                    setTogglingRule,
                    setEditingRule,
                    setDeletingRule,
                  )
                }
                onRowAction={(key) => {
                  const row = rulePagination.pageItems.find(
                    (item) => item.id === String(key),
                  );
                  if (row) navigate(row.href);
                }}
                rowClassName="transition-none [content-visibility:auto]"
              />
            )}
            {!rules.isFetching && (
              <LimitListPagination
                hasMore={Boolean(rules.data?.hasMore)}
                totalItems={rows.length}
                pageIndex={rulePagination.pageIndex}
                pageCount={rulePagination.pageCount}
                onPageChange={rulePagination.setPageIndex}
                label="rules"
              />
            )}
          </ContentPanelSection>
        </ContentPanelBody>
      </ContentPanel>

      {isCreateOpen && <RuleFormDialog onOpenChange={setCreateOpen} />}
      {editingRule && (
        <RuleFormDialog
          rule={editingRule}
          onOpenChange={(open) => {
            if (!open) setEditingRule(null);
          }}
        />
      )}
      {togglingRule && (
        <ToggleRuleDialog
          rule={togglingRule}
          queryKey={rules.queryKey}
          onOpenChange={(open) => {
            if (!open) setTogglingRule(null);
          }}
        />
      )}
      {deletingRule && (
        <DeleteRuleDialog
          rule={deletingRule}
          onOpenChange={(open) => {
            if (!open) setDeletingRule(null);
          }}
        />
      )}
    </div>
  );
}

export const limits = { Component };
