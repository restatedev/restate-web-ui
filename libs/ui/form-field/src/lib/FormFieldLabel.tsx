import { PropsWithChildren } from 'react';
import { Label as AriaLabel } from 'react-aria-components';

interface FormFieldLabelProps {}

export function FormFieldLabel(props: PropsWithChildren<FormFieldLabelProps>) {
  return (
    <AriaLabel
      {...props}
      className="text-sm text-gray-500 dark:text-zinc-400 font-medium cursor-default w-fit"
    />
  );
}
