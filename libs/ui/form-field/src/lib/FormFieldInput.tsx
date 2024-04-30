import {
  InputProps as AriaInputProps,
  Input as AriaInput,
  TextField,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { FormFieldError } from './FormFieldError';

const inputStyles = tv({
  base: 'invalid:border-red-600 invalid:bg-red-100/70 focus:outline focus:border-gray-200 focus:shadow-none focus:outline-blue-600 focus:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] mt-0 bg-gray-100 rounded-lg border border-gray-200 py-1.5 text-gray-900 placeholder:text-gray-500/70 px-2 w-full min-w-0 text-sm text-gray-800 disabled:text-gray-200',
});
const containerStyles = tv({
  base: '',
});

interface InputProps extends Omit<AriaInputProps, 'className'> {
  className?: string;
}
export function FormFieldInput({ className, ...props }: InputProps) {
  return (
    <TextField className={containerStyles({ className })}>
      <AriaInput {...props} className={inputStyles} />
      <FormFieldError />
    </TextField>
  );
}
