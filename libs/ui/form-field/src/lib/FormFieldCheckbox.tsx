import {
  TextFieldProps as AriaTextFieldProps,
  Input,
  TextField,
  Label,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { FormFieldError } from './FormFieldError';
import { ComponentProps, PropsWithChildren } from 'react';

interface FormFieldCheckboxProps
  extends Pick<
    AriaTextFieldProps,
    'name' | 'value' | 'defaultValue' | 'autoFocus'
  > {
  className?: string;
  required?: boolean;
  disabled?: boolean;
  errorMessage?: ComponentProps<typeof FormFieldError>['children'];
}

const styles = tv({
  slots: {
    input:
      'disabled:text-gray-100 hover:disabled:text-gray-100 focus:disabled:text-gray-100 disabled:bg-gray-100 disabled:border-gray-100 disabled:shadow-none invalid:bg-red-100 invalid:border-red-600 text-blue-600 checked:focus:text-blue-800 bg-gray-100 col-start-1 row-start-1 min-w-0 rounded-md w-5 h-5 border-gray-200 focus:bg-gray-300 hover:bg-gray-300 shadow-[inset_0_0.5px_0.5px_0px_rgba(0,0,0,0.08)]',
  },
});
export function FormFieldCheckbox({
  className,
  errorMessage,
  children,
  ...props
}: PropsWithChildren<FormFieldCheckboxProps>) {
  const { input } = styles();
  return (
    <TextField className="grid grid-cols-[1.25rem_1fr] gap-x-2 items-center">
      <Input {...props} type="checkbox" className={input()} />
      <Label className="col-start-2 row-start-1 text-base">{children}</Label>
      <FormFieldError
        children={errorMessage}
        className="col-start-2 row-start-2 px-0"
      />
    </TextField>
  );
}
