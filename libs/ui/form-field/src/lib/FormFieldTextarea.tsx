import {
  TextAreaProps as AriaTextAreaProps,
  TextArea as AriaTextArea,
  TextField,
  Label,
} from 'react-aria-components';
import { tv } from '@restate/util/styles';
import { FormFieldError } from './FormFieldError';
import { ComponentProps, ReactNode } from 'react';
import { FormFieldLabel } from './FormFieldLabel';

const inputStyles = tv({
  base: 'mt-0 w-full min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-900 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] placeholder:text-gray-500/70 invalid:border-red-600 invalid:bg-red-100/70 focus:border-gray-200 focus:shadow-none focus:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] focus:outline-2 focus:outline-blue-600 disabled:border-gray-100 disabled:bg-gray-100 disabled:text-gray-500/80 disabled:shadow-none disabled:placeholder:text-gray-300',
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
