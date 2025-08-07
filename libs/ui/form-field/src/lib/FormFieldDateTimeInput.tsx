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
  base: 'relative mt-0 w-full min-w-0 rounded-lg border border-gray-200 bg-gray-100 px-10 py-1.5 text-center text-sm text-gray-900 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] placeholder:text-gray-500/70 invalid:border-red-600 invalid:bg-red-100/70 read-only:shadow-none focus:border-gray-200 focus:shadow-none focus:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] focus:outline focus:outline-blue-600 disabled:border-gray-100 disabled:text-gray-500/80 disabled:shadow-none disabled:placeholder:text-gray-300 [&[readonly]]:bg-gray-100 [&[readonly]]:text-gray-500/80',
});
const containerStyles = tv({
  base: 'group flex flex-col gap-1',
});

const segmentStyles = tv({
  base: 'inline rounded-sm p-0.5 text-gray-800 caret-transparent outline outline-0 forced-color-adjust-none dark:text-zinc-200 forced-colors:text-[ButtonText] type-literal:px-0',
  variants: {
    isPlaceholder: {
      true: 'text-gray-600 italic dark:text-zinc-400',
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
