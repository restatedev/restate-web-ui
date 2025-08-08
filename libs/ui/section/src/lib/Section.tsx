import { createContext, PropsWithChildren, use } from 'react';
import { tv } from '@restate/util/styles';

interface SectionProps {
  className?: string;
  variant?: 'standard' | 'two-cols';
}

const SectionContext = createContext<{ variant: 'standard' | 'two-cols' }>({
  variant: 'standard',
});

const styles = tv({
  base: 'section',
  variants: {
    variant: {
      standard: 'flex flex-col rounded-xl bg-gray-100 p-0.5',
      'two-cols': 'grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-[20ch_1fr]',
    },
  },
  defaultVariants: {
    variant: 'standard',
  },
});
export function Section({
  children,
  className,
  variant = 'standard',
}: PropsWithChildren<SectionProps>) {
  return (
    <SectionContext.Provider value={{ variant }}>
      <section className={styles({ className, variant })}>{children}</section>
    </SectionContext.Provider>
  );
}

interface SectionTitleProps {
  className?: string;
}

const stylesSectionTitle = tv({
  base: '',
  variants: {
    variant: {
      standard: 'px-2 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase',
      'two-cols':
        'col-start-1 flex flex-col gap-1 text-base leading-7 font-semibold text-gray-900 sm:pt-3 [&_p]:text-sm [&_p]:leading-6 [&_p]:font-normal [&_p]:text-gray-600',
    },
  },
});
export function SectionTitle({
  children,
  className,
}: PropsWithChildren<SectionTitleProps>) {
  const { variant } = use(SectionContext);
  return (
    <h3 className={stylesSectionTitle({ className, variant })}>{children}</h3>
  );
}

const stylesSectionContent = tv({
  base: '',
  variants: {
    raised: {
      true: 'border bg-white shadow-xs',
      false: '',
    },
    variant: {
      standard: 'rounded-[calc(0.75rem-0.125rem)] p-3 text-sm',
      'two-cols': 'col-start-1 min-w-0 sm:col-start-2',
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
  const { variant } = use(SectionContext);

  return (
    <div className={stylesSectionContent({ className, raised, variant })}>
      {children}
    </div>
  );
}
