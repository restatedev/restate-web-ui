import {
  TextAreaProps as AriaTextAreaProps,
  TextArea as AriaTextArea,
  TextField,
  Label,
} from 'react-aria-components';
import { tv } from '@restate/util-styles';
import { FormFieldError } from './FormFieldError';
import { ComponentProps, ReactNode } from 'react';
import { FormFieldLabel } from './FormFieldLabel';

const inputStyles = tv({
  base: 'mt-0 w-full min-w-0 flex-1 rounded-lg border border-inset bg-inset px-2 py-1.5 text-sm text-primary shadow-[inset_0_1px_2px_0px_var(--box-shadow-color-inset)] placeholder:text-placeholder invalid:border-danger-strong invalid:bg-danger-muted/70 focus:border-inset focus:shadow-none focus:[box-shadow:inset_0_1px_2px_0px_var(--box-shadow-color-inset)] focus:outline-2 focus:outline-focus disabled:border-muted disabled:bg-inset disabled:text-subtle disabled:shadow-none disabled:placeholder:text-faint',
});
const containerStyles = tv({
  base: 'flex flex-col',
});

interface FormFieldTextarea extends Pick<
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
