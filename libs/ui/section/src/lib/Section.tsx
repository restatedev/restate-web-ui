import { PropsWithChildren } from 'react';
import { tv } from '@restate/util/styles';

interface SectionProps {
  className?: string;
}

const styles = tv({
  base: 'section flex flex-col rounded-xl bg-gray-100 p-0.5',
});
export function Section({
  children,
  className,
}: PropsWithChildren<SectionProps>) {
  return <section className={styles({ className })}>{children}</section>;
}

interface SectionTitleProps {
  className?: string;
  variant?: 'standard' | 'settings';
}

const stylesSectionTitle = tv({
  base: '',
  variants: {
    variant: {
      standard: 'px-2 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase',
      settings:
        'mb-2 flex flex-col gap-0.5 px-2 text-base leading-7 font-semibold text-gray-900 sm:pt-3 [&_a]:text-gray-500 [&_p]:text-sm [&_p]:leading-6 [&_p]:font-normal [&_p]:text-gray-500 [&+*]:pt-0',
    },
  },
  defaultVariants: {
    variant: 'standard',
  },
});
export function SectionTitle({
  children,
  className,
  variant,
}: PropsWithChildren<SectionTitleProps>) {
  return (
    <h3 className={stylesSectionTitle({ className, variant })}>{children}</h3>
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
