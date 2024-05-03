import { PropsWithChildren } from 'react';
import { Label as AriaLabel } from 'react-aria-components';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface FormFieldLabelProps {}

export function FormFieldLabel(props: PropsWithChildren<FormFieldLabelProps>) {
  return (
    <AriaLabel
      {...props}
      className="text-sm text-gray-500 dark:text-zinc-400 font-medium cursor-default w-fit"
    />
  );
}
