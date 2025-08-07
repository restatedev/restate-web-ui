import { PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';

interface CodeProps {
  className?: string;
}

const styles = tv({
  base: 'group/code flex flex-col items-stretch gap-2 gap-y-0 rounded-xl border bg-gray-200/50 p-2 font-mono text-code wrap-anywhere whitespace-break-spaces shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] sm:py-3',
});

export function Code({ children, className }: PropsWithChildren<CodeProps>) {
  return <code className={styles({ className })}>{children}</code>;
}
