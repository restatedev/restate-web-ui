import { Badge } from '@restate/ui/badge';
import { SectionContent } from '@restate/ui/section';
import { tv } from '@restate/util/styles';
import { ReactNode } from 'react';

const subSectionStyles = tv({
  base: 'group-not-first/subsection:border-t-none p-0 group-not-first/subsection:-mt-px group-not-first/subsection:rounded-t-none group-not-last/subsection:rounded-b-none group-not-last/subsection:border-b',
});

const container = tv({
  base: 'group/subsection',
  variants: {
    footer: {
      true: '[&+*>*:first-child]:rounded-t-[calc(0.75rem-0.125rem)] [&:has(+*)>*:first-child]:rounded-b-[calc(0.75rem-0.125rem)]',
      false: '',
    },
  },
});

export function SubSection({
  value,
  className,
  label,
  footer,
  isPending,
}: {
  className?: string;
  label: ReactNode;
  value?: string | null;
  isPending?: boolean;
  footer?: ReactNode;
}) {
  return (
    <div className={container({ footer: Boolean(footer) })}>
      <SectionContent className={subSectionStyles({ className })}>
        <div className="flex items-center px-1.5 py-1">
          <span className="flex-auto pl-1 text-0.5xs font-medium text-gray-500">
            {label}
          </span>
          <Badge size="sm" className="py-0 align-middle font-mono">
            {value}
          </Badge>
        </div>
      </SectionContent>
      {footer && (
        <span className="mt-2 block px-3 pb-2 text-xs font-normal text-gray-500 normal-case">
          {footer}
        </span>
      )}
    </div>
  );
}
