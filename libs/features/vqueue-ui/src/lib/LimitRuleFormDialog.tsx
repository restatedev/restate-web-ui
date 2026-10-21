import {
  type CreateLimitRuleRequest,
  type LimitRule,
  type UpdateLimitRuleRequest,
  useCreateLimitRule,
  useUpdateLimitRule,
} from '@restate/data-access-admin-api-hooks';
import { useRestateContext } from '@restate/features-restate-context';
import { Button, SubmitButton } from '@restate/ui-button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  QueryDialog,
  useDialog,
} from '@restate/ui-dialog';
import { ErrorBanner } from '@restate/ui-error';
import { FormFieldCheckbox } from '@restate/ui-form-field';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { showSuccessNotification } from '@restate/ui-notification';
import { type FormEvent, useId, useState } from 'react';
import {
  FieldError,
  Heading,
  Input,
  Label,
  TextField,
} from 'react-aria-components';
import { Form, useSearchParams } from 'react-router';
import { limitRulesForPatternHref } from './limitCounterNavigation';
import {
  buildPattern,
  concurrencyError,
  getRuleLevel,
  patternPartError,
  splitPattern,
  type PatternFields,
} from './limitRulePattern';
import { RuleLevelBadge, RuleLevelExplainer } from './RuleLevel';
import { RuleMatchPreview, RulePatternBuilder } from './RulePatternBuilder';

export const CREATE_LIMIT_RULE_QUERY_PARAM = 'create-rule';

export function createLimitRuleHref(pattern?: string) {
  const search = new URLSearchParams({
    [CREATE_LIMIT_RULE_QUERY_PARAM]: pattern || 'true',
  });
  return `?${search}`;
}

export type EditableLimitRule = Pick<
  LimitRule,
  'pattern' | 'description' | 'disabled' | 'limits' | 'version'
>;

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
            : 'text-sm font-medium text-secondary data-[disabled]:text-subtle'
        }
      >
        {label}
      </Label>
      <Input
        placeholder={placeholder}
        min={type === 'number' ? 1 : undefined}
        spellCheck={false}
        className="mt-0 h-9 w-full min-w-0 rounded-lg border border-default bg-muted px-2.5 py-1.5 text-sm text-primary shadow-[inset_0_1px_0px_0px_--theme(--box-shadow-color-default/3%)] outline-offset-2 placeholder:text-subtle invalid:border-danger-strong invalid:bg-danger-subtle read-only:text-tertiary focus:border-default focus:bg-surface focus:ring-0 focus:outline-2 focus:outline-focus disabled:border-muted disabled:text-subtle disabled:shadow-none disabled:placeholder:text-faint [&[readonly]]:bg-muted"
      />
      {description && (
        <span className="text-2xs leading-4 text-muted">{description}</span>
      )}
      <FieldError className="text-2xs leading-4 text-danger" />
    </TextField>
  );
}

function RuleFormContent({
  rule,
  initialPattern = '',
  onDone,
}: {
  rule?: EditableLimitRule;
  initialPattern?: string;
  onDone: VoidFunction;
}) {
  const formId = useId();
  const { baseUrl } = useRestateContext();
  const create = useCreateLimitRule();
  const update = useUpdateLimitRule();
  const initialFields = splitPattern(rule?.pattern ?? initialPattern);
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
        onSuccess: onDone,
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
      onSuccess: () => {
        onDone();
        showSuccessNotification(
          <>
            Rule <span className="font-mono">{pattern}</span> created.{' '}
            <Link
              href={limitRulesForPatternHref(baseUrl, pattern)}
              className="font-medium text-current decoration-current/50 hover:decoration-current"
            >
              View rule
            </Link>
          </>,
        );
      },
    });
  };

  return (
    <DialogContent className="max-w-2xl" isDismissable={!pending}>
      <Form
        id={formId}
        method="PUT"
        action="/limits/rules"
        className="flex flex-col gap-5"
        onSubmit={submit}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-default bg-surface shadow-xs">
            <Icon name={IconName.Filters} className="h-5 w-5 text-accent" />
          </span>
          <div className="min-w-0 flex-1">
            <Heading
              slot="title"
              level={2}
              className="text-lg font-semibold text-primary"
            >
              {isEditing ? 'Edit rule' : 'Create rule'}
            </Heading>
            <p className="text-sm leading-5 text-muted">
              {isEditing
                ? 'Update this rule’s capacity and settings. Its limit counter level cannot be changed.'
                : 'Choose the limit counter level, then define which values it matches.'}
            </p>
          </div>
        </div>

        <section className="flex flex-col gap-3 rounded-xl border border-default bg-subtle/50 p-3.5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h3 className="text-sm font-semibold text-primary">
                  Rule pattern
                </h3>
                <RuleLevelExplainer
                  label=""
                  activeLevel={ruleLevel}
                  className="text-[0.6875rem] text-muted"
                />
              </div>
              <p className="text-2xs leading-4 text-muted">
                Start with a scope, then optionally add Level 1 and Level 2 to
                narrow the limit.
              </p>
            </div>
            {ruleLevel && (
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-2xs text-subtle">Rule level</span>
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
            <p className="text-2xs text-subtle">
              The hierarchy and rule level cannot be changed after creation.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3 border-t border-muted pt-5">
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
              className="mb-2 text-sm font-medium text-secondary"
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
                className="block text-0.5xs leading-5 text-muted"
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
              <SubmitButton form={formId} variant="primary" disabled={!isValid}>
                {isEditing ? 'Save rule' : 'Create'}
              </SubmitButton>
            </div>
          </div>
        </DialogFooter>
      </Form>
    </DialogContent>
  );
}

export function RuleFormDialog({
  rule,
  onOpenChange,
}: {
  rule?: EditableLimitRule;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <RuleFormContent rule={rule} onDone={() => onOpenChange(false)} />
    </Dialog>
  );
}

function CreateRuleFormContent({ initialPattern }: { initialPattern: string }) {
  const { close } = useDialog();
  return (
    <RuleFormContent initialPattern={initialPattern} onDone={() => close?.()} />
  );
}

export function CreateRuleDialog() {
  const [searchParams] = useSearchParams();
  const value = searchParams.get(CREATE_LIMIT_RULE_QUERY_PARAM);
  return (
    <QueryDialog query={CREATE_LIMIT_RULE_QUERY_PARAM}>
      {value !== null && (
        <CreateRuleFormContent initialPattern={value === 'true' ? '' : value} />
      )}
    </QueryDialog>
  );
}
