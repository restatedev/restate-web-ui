import {
  Label,
  DateField as AriaDateField,
  DateFieldProps as AriaDateFieldProps,
  DateInput as AriaDateInput,
  DateSegment,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
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
  base: 'text-center relative invalid:border-red-600 invalid:bg-red-100/70 focus:outline focus:border-gray-200 disabled:text-gray-500/80 disabled:placeholder:text-gray-300 disabled:border-gray-100 disabled:shadow-none   [&[readonly]]:text-gray-500/80 [&[readonly]]:bg-gray-100 read-only:shadow-none focus:shadow-none focus:outline-blue-600 focus:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] mt-0 bg-gray-100 rounded-lg border border-gray-200 py-1.5 placeholder:text-gray-500/70 px-10 w-full min-w-0 text-sm text-gray-900',
});
const containerStyles = tv({
  base: 'group flex flex-col gap-1',
});

const segmentStyles = tv({
  base: 'inline p-0.5 type-literal:px-0 rounded outline outline-0 forced-color-adjust-none caret-transparent text-gray-800 dark:text-zinc-200 forced-colors:text-[ButtonText]',
  variants: {
    isPlaceholder: {
      true: 'text-gray-600 dark:text-zinc-400 italic',
    },
    isDisabled: {
      true: 'text-gray-200 dark:text-zinc-600 forced-colors:text-[GrayText]',
    },
    isFocused: {
      true: 'bg-blue-600 text-white dark:text-white forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]',
    },
  },
});

interface InputProps
  extends Pick<
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
    ref
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
        <div className="relative min-h-[2.125rem]">
          <AriaDateInput ref={ref} className={inputStyles()}>
            {(segment) => (
              <DateSegment segment={segment} className={segmentStyles} />
            )}
          </AriaDateInput>
        </div>
        <FormFieldError children={errorMessage} />
      </AriaDateField>
    );
  }
);
