import { Children, PropsWithChildren, useId } from 'react';
import { tv } from 'tailwind-variants';
import { DetailsProvider } from './DetailsContext';
import { isSummary } from './Summary';

interface DetailsProps {
  open?: boolean;
  className?: string;
  disabled?: boolean;
}

const styles = tv({
  base: 'group bg-white rounded-xl border text-gray-800 shadow-sm p-1 has-[+details]:rounded-b-none has-[+details]:border-b-0 [&+details]:rounded-t-none [&:not([open]):has(+details)>summary]:rounded-b-none [&[open]>summary]:rounded-b-none [&+details>summary]:rounded-t-none',
  variants: {
    isDisabled: {
      false: '',
      true: '[&>summary]:pointer-events-none cursor-not-allowed',
    },
  },
  defaultVariants: {
    isDisabled: false,
  },
});

export function Details({
  children,
  open,
  className,
  disabled,
}: PropsWithChildren<DetailsProps>) {
  const id = useId();
  const childrenArray = Children.toArray(children);
  const summary = childrenArray.filter(isSummary);
  const detailChildren = childrenArray.filter((child) => !isSummary(child));

  return (
    <DetailsProvider id={id}>
      <details
        className={styles({ className, isDisabled: Boolean(disabled) })}
        open={open}
      >
        {summary}
        <div className="px-4 py-6 border-t bg-gray-50 -m-1 rounded-b-xl group-has-[+details]:rounded-b-none">
          {detailChildren}
        </div>
      </details>
    </DetailsProvider>
  );
}
