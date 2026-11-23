import { CheckboxGroup } from 'react-aria-components';
import { tv } from '@restate/util-styles';
import { FormFieldError } from './FormFieldError';
import {
  ComponentProps,
  PropsWithChildren,
  ReactNode,
  forwardRef,
  useId,
} from 'react';
import {
  Checkbox as AriaCheckbox,
  CheckboxProps as AriaCheckboxProps,
  composeRenderProps,
} from 'react-aria-components';
import { focusRing } from '@restate/ui-focus';
import { Icon, IconName } from '@restate/ui-icons';
import { useObjectRef } from 'react-aria';

interface FormFieldCheckboxProps extends Pick<
  AriaCheckboxProps,
  'name' | 'value' | 'autoFocus'
> {
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
    label: 'text-base',
    container: 'grid items-center gap-x-2',
    error: 'error row-start-2 px-0',
    input:
      'col-span-2 col-start-1 row-start-1 grid min-w-0 grid-cols-subgrid items-center text-inherit',
    box: '',
  },
  variants: {
    direction: {
      left: {
        container: 'grid-cols-[1.25rem_1fr]',
        box: 'col-start-1',
        label: 'col-start-2',
        error: 'col-start-2',
      },
      right: {
        container: 'grid-cols-[1fr_1.25rem]',
        box: 'col-start-2 self-baseline',
        label: 'col-start-1 row-start-1',
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
    ref,
  ) => {
    const { input, container, label, error, box } = styles({ direction });
    const inputRef = useObjectRef(ref);
    const labelId = useId();

    return (
      <CheckboxGroup
        className={container({ className })}
        aria-labelledby={labelId}
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
          boxClassName={box()}
          slot={slot}
        >
          <span id={labelId} className={label()}>
            {children}
          </span>
        </Checkbox>
        <FormFieldError children={errorMessage} className={error()} />
      </CheckboxGroup>
    );
  },
);

const checkboxStyles = tv({
  base: 'group flex items-center gap-2 text-sm transition',
  variants: {
    isDisabled: {
      false: 'text-primary',
      true: 'text-faint',
    },
    direction: {
      left: 'col-start-1',
      right: 'col-start-2 self-baseline',
    },
  },
  defaultVariants: {
    direction: 'left',
  },
});

const boxStyles = tv({
  extend: focusRing,
  base: 'checkbox flex h-5 w-5 shrink-0 items-center justify-center rounded-md border shadow-[inset_0_0.5px_0.5px_0px_--theme(--box-shadow-color-default/8%)] transition',
  variants: {
    isSelected: {
      false:
        'border-default bg-(--color) [--color:var(--checkbox-bg,var(--background-color-muted))] group-pressed:[--color:var(--background-color-emphasis)]',
      true: 'border-(--color) bg-(--color) [--color:var(--background-color-accent)] group-pressed:[--color:var(--background-color-accent-pressed)]',
    },
    isInvalid: {
      true: 'border-danger-strong [--color:var(--background-color-danger-muted)] group-pressed:[--color:var(--background-color-danger-emphasis)]',
    },
    isDisabled: {
      true: 'border-muted shadow-none [--color:var(--background-color-muted)]',
    },
  },
});

const iconStyles =
  'w-4 h-4 text-inverse group-disabled:text-faint stroke-[3px]';

export const Checkbox = forwardRef<
  HTMLInputElement,
  Omit<AriaCheckboxProps, 'children'> & {
    children?: ReactNode;
    boxClassName?: string;
  }
>(({ children, boxClassName, ...props }, ref) => {
  const inputRef = useObjectRef(ref);

  return (
    <AriaCheckbox
      inputRef={inputRef}
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        checkboxStyles({ ...renderProps, className }),
      )}
    >
      {({ isSelected, isIndeterminate, ...renderProps }) => (
        <>
          <div
            className={boxStyles({
              isSelected: isSelected || isIndeterminate,
              ...renderProps,
              className: boxClassName,
            })}
          >
            {isIndeterminate ? (
              <Icon aria-hidden className={iconStyles} name={IconName.Minus} />
            ) : isSelected ? (
              <Icon aria-hidden className={iconStyles} name={IconName.Check} />
            ) : null}
          </div>
          {children}
        </>
      )}
    </AriaCheckbox>
  );
});
