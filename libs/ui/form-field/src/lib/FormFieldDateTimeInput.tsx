import {
  Label,
  DateField as AriaDateField,
  DateFieldProps as AriaDateFieldProps,
  DateInput as AriaDateInput,
  DateSegment,
} from 'react-aria-components';
import { tv } from '@restate/util-styles';
import { FormFieldError } from './FormFieldError';
import {
  ComponentProps,
  forwardRef,
  PropsWithChildren,
  ReactNode,
} from 'react';
import { FormFieldLabel } from './FormFieldLabel';
import { parseAbsoluteToLocal, ZonedDateTime } from '@internationalized/date';
const inputStyles = tv({
  base: 'relative mt-0 w-full min-w-0 rounded-lg border border-default bg-muted px-10 py-1.5 text-center text-sm text-primary shadow-[inset_0_1px_0px_0px_--theme(--box-shadow-color-default/3%)] placeholder:text-subtle invalid:border-danger-strong invalid:bg-danger-muted/70 read-only:shadow-none focus:border-default focus:shadow-none focus:[box-shadow:inset_0_1px_0px_0px_--theme(--box-shadow-color-default/3%)] focus:outline-2 focus:outline-focus disabled:border-muted disabled:text-subtle disabled:shadow-none disabled:placeholder:text-faint [&[readonly]]:bg-muted [&[readonly]]:text-subtle',
});
const containerStyles = tv({
  base: 'group flex flex-col gap-1',
});

const segmentStyles = tv({
  base: 'inline rounded-sm p-0.5 text-primary caret-transparent outline outline-0 forced-color-adjust-none forced-colors:text-[ButtonText] type-literal:px-0',
  variants: {
    isPlaceholder: {
      true: 'text-tertiary italic',
    },
    isDisabled: {
      true: 'text-inverse-secondary forced-colors:text-[GrayText]',
    },
    isFocused: {
      true: 'bg-accent text-inverse forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]',
    },
  },
});

interface InputProps extends Pick<
  AriaDateFieldProps<ZonedDateTime>,
  'name' | 'autoFocus' | 'validate'
> {
  className?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  placeholder?: string;
  label?: ReactNode;
  errorMessage?: ComponentProps<typeof FormFieldError>['children'];
  value?: string;
  placeholderValue?: string;
  defaultValue?: string;
  onChange?: (value?: string) => void;
}

export const FormFieldDateTimeInput = forwardRef<
  HTMLInputElement,
  PropsWithChildren<InputProps>
>(
  (
    {
      className,
      required,
      disabled,
      placeholder,
      errorMessage,
      label,
      readonly,
      children,
      value,
      defaultValue,
      onChange,
      placeholderValue,
      ...props
    },
    ref,
  ) => {
    return (
      <AriaDateField<ZonedDateTime>
        {...props}
        isRequired={required}
        isDisabled={disabled}
        isReadOnly={readonly}
        className={containerStyles({ className })}
        {...(placeholderValue && {
          placeholderValue: parseAbsoluteToLocal(placeholderValue),
        })}
        {...(value && {
          value: parseAbsoluteToLocal(value),
        })}
        {...(defaultValue && {
          defaultValue: parseAbsoluteToLocal(defaultValue),
        })}
        {...(onChange && {
          onChange: (value) => {
            onChange?.(value?.toAbsoluteString());
          },
        })}
      >
        {!label && <Label className="sr-only">{placeholder}</Label>}
        {label && <FormFieldLabel>{label}</FormFieldLabel>}
        <div className="relative min-h-8.5">
          <AriaDateInput ref={ref} className={inputStyles()}>
            {(segment) => (
              <DateSegment segment={segment} className={segmentStyles} />
            )}
          </AriaDateInput>
        </div>
        <FormFieldError children={errorMessage} />
      </AriaDateField>
    );
  },
);
