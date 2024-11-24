import { Label, CheckboxGroup } from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { FormFieldError } from './FormFieldError';
import { ComponentProps, PropsWithChildren, forwardRef } from 'react';
import {
  Checkbox as AriaCheckbox,
  CheckboxProps as AriaCheckboxProps,
  composeRenderProps,
} from 'react-aria-components';
import { focusRing } from '@restate/ui/focus';
import { Icon, IconName } from '@restate/ui/icons';
import { useObjectRef } from 'react-aria';

interface FormFieldCheckboxProps
  extends Pick<AriaCheckboxProps, 'name' | 'value' | 'autoFocus'> {
  className?: string;
  required?: boolean;
  disabled?: boolean;
  errorMessage?: ComponentProps<typeof FormFieldError>['children'];
  slot?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  direction?: 'left' | 'right';
}

const styles = tv({
  slots: {
    label: 'row-start-1 text-base',
    container: 'grid gap-x-2 items-center',
    error: 'error row-start-2 px-0',
    input: 'row-start-1  min-w-0',
  },
  variants: {
    direction: {
      left: {
        container: 'grid-cols-[1.25rem_1fr]',
        input: 'col-start-1',
        label: 'col-start-2',
        error: 'col-start-2',
      },
      right: {
        container: 'grid-cols-[1fr_1.25rem]',
        input: 'self-baseline col-start-2',
        label: 'col-start-1',
        error: 'col-start-1',
      },
    },
  },
  defaultVariants: {
    direction: 'left',
  },
});

export const FormFieldCheckbox = forwardRef<
  HTMLInputElement,
  PropsWithChildren<FormFieldCheckboxProps>
>(
  (
    {
      defaultChecked,
      checked,
      required,
      disabled,
      errorMessage,
      onChange,
      direction,
      children,
      className,
      value,
      slot,
      ...props
    },
    ref
  ) => {
    const { input, container, label, error } = styles({ direction });
    const inputRef = useObjectRef(ref);

    return (
      <CheckboxGroup
        className={container({ className })}
        isDisabled={disabled}
        isRequired={required}
        {...(typeof checked === 'boolean' && {
          value: checked && value ? [value] : [],
        })}
        {...(typeof defaultChecked === 'boolean' && {
          defaultValue: defaultChecked && value ? [value] : [],
        })}
        onChange={(values) => {
          const isSelected = Boolean(value && values.includes(value));
          onChange?.(isSelected);
        }}
        {...props}
      >
        <Checkbox
          inputRef={inputRef}
          value={value}
          className={input()}
          slot={slot}
        />
        <Label className={label()}>{children}</Label>
        <FormFieldError children={errorMessage} className={error()} />
      </CheckboxGroup>
    );
  }
);

const checkboxStyles = tv({
  base: 'flex gap-2 items-center group text-sm transition',
  variants: {
    isDisabled: {
      false: 'text-gray-800 dark:text-zinc-200',
      true: 'text-gray-300 dark:text-zinc-600 forced-colors:text-[GrayText]',
    },
    direction: {
      left: 'col-start-1',
      right: 'self-baseline col-start-2',
    },
  },
  defaultVariants: {
    direction: 'left',
  },
});

const boxStyles = tv({
  extend: focusRing,
  base: 'w-5 h-5 flex-shrink-0 rounded-md flex items-center justify-center border transition shadow-[inset_0_0.5px_0.5px_0px_rgba(0,0,0,0.08)]',
  variants: {
    isSelected: {
      false:
        'bg-[--color] border-gray-200 [--color:theme(colors.gray.100)] group-pressed:[--color:theme(colors.gray.200)]',
      true: 'bg-[--color] border-[--color] [--color:theme(colors.blue.600)] group-pressed:[--color:theme(colors.blue.800)]',
    },
    isInvalid: {
      true: '[--color:theme(colors.red.100)] group-pressed:[--color:theme(colors.red.200)] border-red-600',
    },
    isDisabled: {
      true: '[--color:theme(colors.gray.100)] border-gray-100 shadow-none',
    },
  },
});

const iconStyles =
  'w-4 h-4 text-white group-disabled:text-gray-400/70 stroke-[3px]';

export const Checkbox = forwardRef<
  HTMLInputElement,
  Omit<AriaCheckboxProps, 'children'>
>((props, ref) => {
  const inputRef = useObjectRef(ref);

  return (
    <AriaCheckbox
      inputRef={inputRef}
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        checkboxStyles({ ...renderProps, className })
      )}
    >
      {({ isSelected, isIndeterminate, ...renderProps }) => (
        <div
          className={boxStyles({
            isSelected: isSelected || isIndeterminate,
            ...renderProps,
          })}
        >
          {isIndeterminate ? (
            <Icon aria-hidden className={iconStyles} name={IconName.Minus} />
          ) : isSelected ? (
            <Icon aria-hidden className={iconStyles} name={IconName.Check} />
          ) : null}
        </div>
      )}
    </AriaCheckbox>
  );
});
