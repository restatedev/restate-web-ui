import { PropsWithChildren, ReactNode } from 'react';
import { tv } from 'tailwind-variants';
import { Disclosure, DisclosurePanel, Heading } from 'react-aria-components';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';

interface SectionProps {
  className?: string;
}

const styles = tv({
  base: 'group section flex flex-col bg-gray-100 rounded-xl p-0.5 border2 shadow2-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]',
});
export function CollapsibleSection({
  children,
  className,
}: PropsWithChildren<SectionProps>) {
  return <Disclosure className={styles({ className })}>{children}</Disclosure>;
}

interface SectionTitleProps {
  className?: string;
}

const stylesSectionTitle = tv({
  base: 'text-xs uppercase font-semibold text-gray-400 px-2 py-2 relative',
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
        className=" p-2 text-zinc-400 text-sm inset-0 absolute justify-end rounded-[calc(0.75rem-0.175rem)] hover:bg-black/3 pressed:bg-black/5"
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
  base: 'p-3 rounded-[calc(0.75rem-0.125rem)] text-sm',
  variants: {
    raised: {
      true: 'bg-white shadow-xs border',
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
