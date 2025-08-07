import {
  TextFieldProps as AriaTextFieldProps,
  Input as AriaInput,
  TextField,
  Label,
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

const inputStyles = tv({
  base: 'mt-0 w-full min-w-0 rounded-lg border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-900 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] placeholder:text-gray-500/70 invalid:border-red-600 invalid:bg-red-100/70 read-only:shadow-none focus:border-gray-200 focus:shadow-none focus:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] focus:outline focus:outline-blue-600 disabled:border-gray-100 disabled:text-gray-500/80 disabled:shadow-none disabled:placeholder:text-gray-300 [&[readonly]]:bg-gray-100 [&[readonly]]:text-gray-500/80',
});
const containerStyles = tv({
  base: '',
});

interface InputProps
  extends Pick<
    AriaTextFieldProps,
    | 'name'
    | 'value'
    | 'defaultValue'
    | 'autoFocus'
    | 'autoComplete'
    | 'validate'
    | 'pattern'
    | 'maxLength'
    | 'type'
    | 'onChange'
    | 'onKeyDown'
  > {
  className?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  placeholder?: string;
  label?: ReactNode;
  errorMessage?: ComponentProps<typeof FormFieldError>['children'];
  form?: string;
}
export const FormFieldInput = forwardRef<
  HTMLInputElement,
  PropsWithChildren<InputProps>
>(
  (
    {
      className,
      required,
      disabled,
      autoComplete = 'off',
      placeholder,
      errorMessage,
      label,
      readonly,
      children,
      form,
      ...props
    },
    ref,
  ) => {
    return (
      <TextField
        {...props}
        autoComplete={autoComplete}
        isRequired={required}
        isDisabled={disabled}
        isReadOnly={readonly}
        className={containerStyles({ className })}
      >
        {!label && <Label className="sr-only">{placeholder}</Label>}
        {label && <FormFieldLabel>{label}</FormFieldLabel>}
        <div className="relative min-h-8.5">
          <AriaInput
            className={inputStyles}
            placeholder={placeholder}
            aria-label={placeholder}
            ref={ref}
            spellCheck={false}
            form={form}
          />
          {children}
        </div>
        <FormFieldError children={errorMessage} />
      </TextField>
    );
  },
);
