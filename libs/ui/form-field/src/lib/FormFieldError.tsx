import { FieldError as AriaFieldError } from 'react-aria-components';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface FormFieldErrorProps {}

export function FormFieldError(props: FormFieldErrorProps) {
  return (
    <AriaFieldError
      {...props}
      className="text-xs px-1 pt-0.5 text-red-600 forced-colors:text-[Mark]"
    />
  );
}
