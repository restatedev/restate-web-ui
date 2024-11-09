import { PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';

interface SectionProps {
  className?: string;
}

const styles = tv({
  base: 'flex flex-col bg-gray-100 rounded-xl p-0.5 border2 shadow2-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]',
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
  base: 'bg-white shadow-sm border p-3 rounded-[calc(0.75rem-0.125rem)] text-sm',
});
export function SectionContent({
  children,
  className,
}: PropsWithChildren<SectionTitleProps>) {
  return <div className={stylesSectionContent({ className })}>{children}</div>;
}
