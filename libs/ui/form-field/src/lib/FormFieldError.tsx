import {
  FieldError as AriaFieldError,
  FieldErrorProps,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';

interface FormFieldErrorProps extends Pick<FieldErrorProps, 'children'> {
  className?: string;
}

const styles = tv({
  base: 'error px-1 pt-0.5 text-xs text-red-600 forced-colors:text-[Mark]',
});
export function FormFieldError({ className, ...props }: FormFieldErrorProps) {
  return <AriaFieldError {...props} className={styles({ className })} />;
}
