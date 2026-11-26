import { Children, PropsWithChildren, useState } from 'react';
import { tv } from '@restate/util-styles';
import { Disclosure, DisclosurePanel } from '@restate/ui-disclosure';
import { isSummary } from './Summary';

interface DetailsProps {
  open?: boolean;
  className?: string;
  disabled?: boolean;
}

const styles = tv({
  slots: {
    root: 'group/details details rounded-xl border bg-surface p-1 text-primary shadow-xs has-[+.details]:rounded-b-none has-[+.details]:border-b-0 [&+.details]:rounded-t-none',
    content:
      '-m-1 rounded-b-xl border-t bg-subtle px-4 py-6 [.details:has(+.details)_&]:rounded-b-none',
  },
  variants: {
    isDisabled: {
      false: '',
      true: {
        root: 'cursor-not-allowed [&_[data-disabled]]:cursor-not-allowed',
      },
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
  const [isOpen, setIsOpen] = useState(Boolean(open));
  const [openProp, setOpenProp] = useState(open);
  if (open !== openProp) {
    setOpenProp(open);
    setIsOpen(Boolean(open));
  }
  const childrenArray = Children.toArray(children);
  const summary = childrenArray.filter(isSummary);
  const detailChildren = childrenArray.filter((child) => !isSummary(child));
  const { root, content } = styles({ isDisabled: Boolean(disabled) });

  return (
    <Disclosure
      open={isOpen}
      onOpenChange={setIsOpen}
      disabled={disabled}
      className={root({ className })}
    >
      {summary}
      <DisclosurePanel>
        <div className={content()}>{detailChildren}</div>
      </DisclosurePanel>
    </Disclosure>
  );
}
