import { PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';

interface SectionProps {
  className?: string;
}

const styles = tv({
  base: 'grid gap-x-10 gap-y-4 grid-cols-1 sm:grid-cols-[20ch_1fr]',
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
  base: 'flex flex-col gap-1 col-start-1 text-base font-semibold leading-7 text-gray-900 [&_p]:text-sm [&_p]:leading-6 [&_p]:text-gray-600 [&_p]:font-normal',
});
export function SectionTitle({
  children,
  className,
}: PropsWithChildren<SectionTitleProps>) {
  return <h3 className={stylesSectionTitle({ className })}>{children}</h3>;
}

const stylesSectionContent = tv({
  base: 'col-start-1 sm:col-start-2',
});
export function SectionContent({
  children,
  className,
}: PropsWithChildren<SectionTitleProps>) {
  return <div className={stylesSectionContent({ className })}>{children}</div>;
}
