import { FieldError as AriaFieldError } from 'react-aria-components';

interface FormFieldErrorProps {}

export function FormFieldError(props: FormFieldErrorProps) {
  return (
    <AriaFieldError
      {...props}
      className="text-sm text-red-600 forced-colors:text-[Mark]"
    />
  );
}
