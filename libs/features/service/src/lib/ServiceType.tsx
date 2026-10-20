import type { ServiceType } from '@restate/data-access-admin-api-spec';
import { ServiceTypeExplainer } from '@restate/features-explainers';
import { Badge } from '@restate/ui-badge';
import { tv } from '@restate/util-styles';

const styles = tv({
  base: '',
  variants: {
    variant: {
      default: '',
      subtle:
        'shrink-0 border-default bg-muted/70 px-1.5 py-0 text-2xs font-normal whitespace-nowrap text-muted',
    },
  },
  defaultVariants: { variant: 'default' },
});
export function ServiceType({
  type,
  variant = 'default',
  className,
}: {
  type?: ServiceType;
  variant?: 'default' | 'subtle';
  className?: string;
}) {
  return (
    <Badge variant="info" size="sm" className={styles({ variant, className })}>
      <ServiceTypeExplainer
        type={type}
        variant="indicator-button"
        className="z-10"
      >
        {type}
      </ServiceTypeExplainer>
    </Badge>
  );
}
