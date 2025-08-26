import { Badge } from '@restate/ui/badge';
import { SectionContent } from '@restate/ui/section';
import { tv } from '@restate/util/styles';
import { ReactNode } from 'react';

const subSectionStyles = tv({
  base: 'p-0',
});

export function SubSection({
  value,
  className,
  label,
  footer,
  isPending,
}: {
  className?: string;
  label: string;
  value?: string | null;
  isPending?: boolean;
  footer?: ReactNode;
}) {
  return (
    <div>
      <SectionContent className={subSectionStyles({ className })}>
        <div className="flex items-center px-1.5 py-1 not-last:border-b">
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
