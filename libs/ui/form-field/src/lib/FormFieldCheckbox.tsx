import {
  TextFieldProps as AriaTextFieldProps,
  Input,
  TextField,
  Label,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { FormFieldError } from './FormFieldError';
import { ComponentProps, PropsWithChildren, forwardRef } from 'react';

interface FormFieldCheckboxProps
  extends Pick<
    AriaTextFieldProps,
    'name' | 'value' | 'defaultValue' | 'autoFocus'
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
    label: 'row-start-1 text-base',
    container: 'grid gap-x-2 items-center',
    input:
      'disabled:text-gray-100 hover:disabled:text-gray-100 focus:disabled:text-gray-100 disabled:bg-gray-100 disabled:border-gray-100 disabled:shadow-none invalid:bg-red-100 invalid:border-red-600 text-blue-600 checked:focus:text-blue-800 bg-gray-100  row-start-1 min-w-0 rounded-md w-5 h-5 border-gray-200 focus:bg-gray-300 hover:bg-gray-300 shadow-[inset_0_0.5px_0.5px_0px_rgba(0,0,0,0.08)]',
    error: 'error row-start-2 px-0',
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
});
export const FormFieldCheckbox = forwardRef<
  HTMLInputElement,
  PropsWithChildren<FormFieldCheckboxProps>
>(
  (
    {
      onChange,
      className,
      errorMessage,
      children,
      direction = 'left',
      ...props
    },
    ref
  ) => {
    const { input, container, label, error } = styles({ direction });
    return (
      <TextField className={container({ className })}>
        <Input
          {...props}
          type="checkbox"
          className={input()}
          ref={ref}
          onChange={(event) => onChange?.(event.currentTarget.checked)}
        />
        <Label className={label()}>{children}</Label>
        <FormFieldError children={errorMessage} className={error()} />
      </TextField>
    );
  }
);
