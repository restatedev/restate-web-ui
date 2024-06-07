import {
  TextFieldProps as AriaTextFieldProps,
  Input as AriaInput,
  TextField,
  Label,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { FormFieldError } from './FormFieldError';
import { ComponentProps, ReactNode } from 'react';
import { FormFieldLabel } from './FormFieldLabel';

const inputStyles = tv({
  base: 'invalid:border-red-600 invalid:bg-red-100/70 focus:outline focus:border-gray-200 disabled:text-gray-500/80 disabled:placeholder:text-gray-300 disabled:border-gray-100 disabled:shadow-none   [&[readonly]]:text-gray-500/80 [&[readonly]]:bg-gray-100 read-only:shadow-none focus:shadow-none focus:outline-blue-600 focus:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] mt-0 bg-gray-100 rounded-lg border border-gray-200 py-1.5 placeholder:text-gray-500/70 px-2 w-full min-w-0 text-sm text-gray-900',
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
  > {
  className?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  placeholder?: string;
  label?: ReactNode;
  errorMessage?: ComponentProps<typeof FormFieldError>['children'];
}
export function FormFieldInput({
  className,
  required,
  disabled,
  autoComplete = 'off',
  placeholder,
  errorMessage,
  label,
  readonly,
  ...props
}: InputProps) {
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
      <AriaInput
        className={inputStyles}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <FormFieldError children={errorMessage} />
    </TextField>
  );
}
