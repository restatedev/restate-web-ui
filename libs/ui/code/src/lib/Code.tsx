import { PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';

interface CodeProps {
  className?: string;
}

const styles = tv({
  base: 'group/code flex flex-col gap-2 gap-y-0 items-stretch font-mono wrap-anywhere rounded-xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] text-code p-2 sm:py-3 whitespace-break-spaces',
});

export function Code({ children, className }: PropsWithChildren<CodeProps>) {
  return <code className={styles({ className })}>{children}</code>;
}
