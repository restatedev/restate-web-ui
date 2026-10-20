import { PropsWithChildren } from 'react';
import { Label as AriaLabel } from 'react-aria-components';
import { tv } from '@restate/util-styles';

interface FormFieldLabelProps {
  className?: string;
}

const styles = tv({
  base: 'mb-1.5 flex w-fit cursor-default flex-col gap-0.5 text-sm font-medium text-secondary [&_[slot="description"]]:block [&_[slot="description"]]:text-0.5xs [&_[slot="description"]]:font-normal [&_[slot="description"]]:text-muted [&_[slot="title"]]:block',
});

export function FormFieldLabel({
  className,
  ...props
}: PropsWithChildren<FormFieldLabelProps>) {
  return <AriaLabel {...props} className={styles({ className })} />;
}
