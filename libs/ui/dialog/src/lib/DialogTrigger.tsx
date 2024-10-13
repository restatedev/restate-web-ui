import { PropsWithChildren } from 'react';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DialogTriggerProps {}
export function DialogTrigger({
  children,
}: PropsWithChildren<DialogTriggerProps>) {
  return children;
}
