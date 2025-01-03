import {
  TextAreaProps as AriaTextAreaProps,
  TextArea as AriaTextArea,
  TextField,
  Label,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { FormFieldError } from './FormFieldError';
import { ComponentProps, ReactNode } from 'react';
import { FormFieldLabel } from './FormFieldLabel';

const inputStyles = tv({
  base: 'flex-1 invalid:border-red-600 invalid:bg-red-100/70 focus:outline focus:border-gray-200 disabled:text-gray-500/80 disabled:placeholder:text-gray-300 disabled:bg-gray-100 disabled:border-gray-100 disabled:shadow-none focus:shadow-none focus:outline-blue-600 focus:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] mt-0 bg-gray-100 rounded-lg border border-gray-200 py-1.5 placeholder:text-gray-500/70 px-2 w-full min-w-0 text-sm text-gray-900',
});
const containerStyles = tv({
  base: 'flex flex-col',
});

interface FormFieldTextarea
  extends Pick<
    AriaTextAreaProps,
    'name' | 'autoFocus' | 'autoComplete' | 'maxLength' | 'rows'
  > {
  className?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  label?: ReactNode;
  errorMessage?: ComponentProps<typeof FormFieldError>['children'];
  value?: string;
  defaultValue?: string;
}
export function FormFieldTextarea({
  className,
  required,
  disabled,
  autoComplete = 'off',
  placeholder,
  errorMessage,
  label,
  ...props
}: FormFieldTextarea) {
  return (
    <TextField
      {...props}
      autoComplete={autoComplete}
      isRequired={required}
      isDisabled={disabled}
      className={containerStyles({ className })}
    >
      {!label && <Label className="sr-only">{placeholder}</Label>}
      {label && <FormFieldLabel>{label}</FormFieldLabel>}
      <AriaTextArea
        className={inputStyles}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <FormFieldError children={errorMessage} />
    </TextField>
  );
}
