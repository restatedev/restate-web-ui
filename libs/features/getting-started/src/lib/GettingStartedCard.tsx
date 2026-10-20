import { PropsWithChildren } from 'react';
import { Icon, IconName } from '@restate/ui-icons';
import { tv } from '@restate/util-styles';
import { Badge } from '@restate/ui-badge';
import { Link } from '@restate/ui-link';

const styles = tv({
  base: 'relative flex transform flex-col overflow-hidden rounded-2xl border bg-linear-to-b from-(--sheen) to-subtle px-3 py-3 shadow-lg shadow-default/5 transition-all',
});
export interface GettingStartedCardProps {
  type?: string;
  title: string;
  description: string;
  icon: IconName;
  className?: string;
  href: string;
}

export function GettingStartedCard({
  className,
  type,
  description,
  icon,
  title,
  href,
}: PropsWithChildren<GettingStartedCardProps>) {
  return (
    <div className={styles({ className })}>
      <div className="absolute inset-0 translate-x-1/3 translate-y-1/4 rotate-12 text-inverse">
        <Icon name={icon} className="h-full w-full" />
      </div>
      <div className="z-[2] self-start rounded-md bg-muted p-1.5 text-muted">
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <h4 className="z-[2] mt-2 flex items-center gap-2 pr-12 text-sm font-medium text-tertiary">
        {title}
        <Icon name={IconName.ArrowRight} className="h-3.5 w-3.5 text-muted" />
      </h4>
      <p className="z-[2] mt-2 min-h-18 max-w-40 text-0.5xs text-muted">
        {description}
      </p>
      {type && (
        <Badge
          size="xs"
          className="absolute top-2 right-2 z-[2] rounded-md uppercase"
        >
          {type}
        </Badge>
      )}
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="before:absolute before:inset-0 before:z-[3] before:rounded-2xl before:content-[''] hover:before:bg-tint-subtle pressed:before:bg-tint"
      >
        <span className="sr-only">Go to</span>
      </Link>
    </div>
  );
}
