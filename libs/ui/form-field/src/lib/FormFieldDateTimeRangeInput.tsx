import { parseAbsoluteToLocal, ZonedDateTime } from '@internationalized/date';
import { tv } from '@restate/util/styles';
import {
  DateInput as AriaDateInput,
  DateRangePicker as AriaDateRangePicker,
  DateRangePickerProps as AriaDateRangePickerProps,
  DateSegment,
  Group,
  Label,
  RangeValue,
} from 'react-aria-components';
import { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import { FormFieldError } from './FormFieldError';
import { FormFieldLabel } from './FormFieldLabel';

const containerStyles = tv({
  base: 'group flex flex-col gap-1',
});

const groupStyles = tv({
  base: 'relative mt-0 flex min-h-8.5 w-full min-w-0 items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100 px-2 py-1.5 text-center text-sm text-gray-900 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] invalid:border-red-600 invalid:bg-red-100/70 focus-within:border-gray-200 focus-within:shadow-none focus-within:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] focus-within:outline-2 focus-within:outline-blue-600 disabled:border-gray-100 disabled:text-gray-500/80 disabled:shadow-none',
});

const inputStyles = tv({
  base: 'flex min-w-0 flex-1 items-center justify-center overflow-x-auto overflow-y-hidden whitespace-nowrap px-1 [scrollbar-width:none]',
});

const separatorStyles = tv({
  base: 'px-1 text-gray-400',
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

export interface DateTimeRangeInputValue {
  start?: string;
  end?: string;
}

interface InputProps
  extends Pick<
    AriaDateRangePickerProps<ZonedDateTime>,
    'startName' | 'endName' | 'autoFocus' | 'validate'
  > {
  className?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  placeholder?: string;
  label?: ReactNode;
  errorMessage?: ComponentProps<typeof FormFieldError>['children'];
  value?: DateTimeRangeInputValue;
  placeholderValue?: string;
  defaultValue?: DateTimeRangeInputValue;
  onChange?: (value?: DateTimeRangeInputValue) => void;
}

function parseRangeValue(
  value?: DateTimeRangeInputValue,
): RangeValue<ZonedDateTime> | null {
  if (!value?.start || !value.end) {
    return null;
  }
  return {
    start: parseAbsoluteToLocal(value.start),
    end: parseAbsoluteToLocal(value.end),
  };
}

export function FormFieldDateTimeRangeInput({
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
}: PropsWithChildren<InputProps>) {
  return (
    <AriaDateRangePicker<ZonedDateTime>
      {...props}
      isRequired={required}
      isDisabled={disabled}
      isReadOnly={readonly}
      className={containerStyles({ className })}
      {...(placeholderValue && {
        placeholderValue: parseAbsoluteToLocal(placeholderValue),
      })}
      {...(value && {
        value: parseRangeValue(value),
      })}
      {...(defaultValue && {
        defaultValue: parseRangeValue(defaultValue),
      })}
      {...(onChange && {
        onChange: (value) => {
          onChange?.(
            value
              ? {
                  start: value.start.toAbsoluteString(),
                  end: value.end.toAbsoluteString(),
                }
              : undefined,
          );
        },
      })}
    >
      {!label && <Label className="sr-only">{placeholder}</Label>}
      {label && <FormFieldLabel>{label}</FormFieldLabel>}
      <Group className={groupStyles()}>
        <AriaDateInput slot="start" className={inputStyles()}>
          {(segment) => (
            <DateSegment segment={segment} className={segmentStyles} />
          )}
        </AriaDateInput>
        <span aria-hidden="true" className={separatorStyles()}>
          -
        </span>
        <AriaDateInput slot="end" className={inputStyles()}>
          {(segment) => (
            <DateSegment segment={segment} className={segmentStyles} />
          )}
        </AriaDateInput>
      </Group>
      {children}
      <FormFieldError children={errorMessage} />
    </AriaDateRangePicker>
  );
}
