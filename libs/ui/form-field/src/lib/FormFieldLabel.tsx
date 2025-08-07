import { PropsWithChildren } from 'react';
import { Label as AriaLabel } from 'react-aria-components';
import { tv } from 'tailwind-variants';

interface FormFieldLabelProps {
  className?: string;
}

const styles = tv({
  base: 'mb-1.5 flex w-fit cursor-default flex-col gap-0.5 text-sm font-medium text-gray-700 [&_[slot="description"]]:block [&_[slot="description"]]:text-code [&_[slot="description"]]:font-normal [&_[slot="description"]]:text-gray-500 [&_[slot="title"]]:block',
});

export function FormFieldLabel({
  className,
  ...props
}: PropsWithChildren<FormFieldLabelProps>) {
  return <AriaLabel {...props} className={styles({ className })} />;
}
