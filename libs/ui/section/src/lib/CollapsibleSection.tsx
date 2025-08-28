import { PropsWithChildren, ReactNode } from 'react';
import { tv } from '@restate/util/styles';
import { Disclosure, DisclosurePanel, Heading } from 'react-aria-components';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';

interface SectionProps {
  className?: string;
  isExpanded?: boolean;
  onExpandedChange?: (isExpanded: boolean) => void;
}

const styles = tv({
  base: 'group section flex flex-col rounded-xl bg-gray-100 p-0.5',
});
export function CollapsibleSection({
  children,
  className,
  isExpanded,
  onExpandedChange,
}: PropsWithChildren<SectionProps>) {
  return (
    <Disclosure
      className={styles({ className })}
      isExpanded={isExpanded}
      onExpandedChange={onExpandedChange}
    >
      {children}
    </Disclosure>
  );
}

interface SectionTitleProps {
  className?: string;
}

const stylesSectionTitle = tv({
  base: 'relative px-2 py-2 text-xs font-semibold text-gray-400 uppercase',
});
export function CollapsibleSectionTitle({
  children,
  className,
}: PropsWithChildren<SectionTitleProps>) {
  return (
    <Heading className={stylesSectionTitle({ className })}>
      <Button
        variant="icon"
        slot="trigger"
        className="absolute inset-0 justify-end rounded-[calc(0.75rem-0.175rem)] p-2 text-sm text-zinc-400 hover:bg-black/3 pressed:bg-black/5"
      >
        <Icon
          name={IconName.ChevronDown}
          className="group-expanded:rotate-180"
        />
      </Button>
      {children}
    </Heading>
  );
}

const stylesSectionContent = tv({
  base: 'rounded-[calc(0.75rem-0.125rem)] p-3 text-sm',
  variants: {
    raised: {
      true: 'border bg-white shadow-xs',
      false: '',
    },
  },
  defaultVariants: {
    raised: true,
  },
});
const stylesSectionContentContainer = tv({
  base: '',
});

export function CollapsibleSectionContent({
  children,
  className,
  raised,
  footer,
}: PropsWithChildren<{
  className?: string;
  raised?: boolean;
  footer?: ReactNode;
}>) {
  return (
    <DisclosurePanel className={stylesSectionContentContainer({})}>
      <div className={stylesSectionContent({ raised, className })}>
        {children}
      </div>
      {footer && <div>{footer}</div>}
    </DisclosurePanel>
  );
}
