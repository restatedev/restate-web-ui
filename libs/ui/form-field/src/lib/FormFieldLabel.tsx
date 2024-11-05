import { PropsWithChildren } from 'react';
import { Label as AriaLabel } from 'react-aria-components';
import { tv } from 'tailwind-variants';

interface FormFieldLabelProps {
  className?: string;
}

const styles = tv({
  base: 'text-sm text-gray-700 flex flex-col gap-0.5 mb-1.5 font-medium cursor-default w-fit [&_[slot="title"]]:block [&_[slot="description"]]:block [&_[slot="description"]]:text-code [&_[slot="description"]]:font-normal [&_[slot="description"]]:text-gray-500',
});

export function FormFieldLabel({
  className,
  ...props
}: PropsWithChildren<FormFieldLabelProps>) {
  return <AriaLabel {...props} className={styles({ className })} />;
}
