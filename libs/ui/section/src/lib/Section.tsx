import { createContext, PropsWithChildren, use } from 'react';
import { tv } from 'tailwind-variants';

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
      standard: 'flex flex-col bg-gray-100 rounded-xl p-0.5',
      'two-cols': 'grid gap-x-10 gap-y-4 grid-cols-1 sm:grid-cols-[20ch_1fr]',
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
      standard: 'text-xs uppercase font-semibold text-gray-400 px-2 pt-2 pb-1',
      'two-cols':
        'flex flex-col gap-1 col-start-1 text-base sm:pt-3 font-semibold leading-7 text-gray-900 [&_p]:text-sm [&_p]:leading-6 [&_p]:text-gray-600 [&_p]:font-normal',
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
      true: 'bg-white shadow-sm border',
      false: '',
    },
    variant: {
      standard: 'p-3 rounded-[calc(0.75rem-0.125rem)] text-sm',
      'two-cols': 'col-start-1 sm:col-start-2 min-w-0',
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
