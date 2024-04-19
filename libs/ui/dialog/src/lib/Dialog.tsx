import { PropsWithChildren } from 'react';
import { DialogTrigger } from 'react-aria-components';

interface DialogProps {}

export function Dialog({ children }: PropsWithChildren<DialogProps>) {
  return <DialogTrigger>{children}</DialogTrigger>;
}
