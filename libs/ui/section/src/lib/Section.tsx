import { PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';

interface SectionProps {
  className?: string;
}

const styles = tv({
  base: 'section flex flex-col bg-gray-100 rounded-xl p-0.5',
});
export function Section({
  children,
  className,
}: PropsWithChildren<SectionProps>) {
  return <section className={styles({ className })}>{children}</section>;
}

interface SectionTitleProps {
  className?: string;
}

const stylesSectionTitle = tv({
  base: 'text-xs uppercase font-semibold text-gray-400 px-2 pt-2 pb-1',
});
export function SectionTitle({
  children,
  className,
}: PropsWithChildren<SectionTitleProps>) {
  return <h3 className={stylesSectionTitle({ className })}>{children}</h3>;
}

const stylesSectionContent = tv({
  base: 'p-3 rounded-[calc(0.75rem-0.125rem)] text-sm',
  variants: {
    raised: {
      true: 'bg-white shadow-sm border',
      false: '',
    },
  },
  defaultVariants: {
    raised: true,
  },
});
export function SectionContent({
  children,
  className,
  raised,
}: PropsWithChildren<{
  className?: string;
  raised?: boolean;
}>) {
  return (
    <div className={stylesSectionContent({ className, raised })}>
      {children}
    </div>
  );
}
