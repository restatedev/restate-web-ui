import type { ServiceType } from '@restate/data-access-admin-api-spec';
import { ServiceTypeExplainer } from '@restate/features-explainers';
import { Badge } from '@restate/ui-badge';
import { Icon, IconName } from '@restate/ui-icons';
import { tv } from '@restate/util-styles';
import { isTanstackWorkflow } from './tanstackWorkflow';

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

const workflowStyles = tv({
  base: 'gap-1',
});
export function ServiceType({
  type,
  metadata,
  variant = 'default',
  className,
}: {
  type?: ServiceType;
  metadata?: Record<string, string> | null;
  variant?: 'default' | 'subtle';
  className?: string;
}) {
  if (isTanstackWorkflow({ metadata })) {
    return (
      <Badge
        variant="info"
        size="sm"
        className={styles({
          variant,
          className: workflowStyles({ className }),
        })}
      >
        <Icon name={IconName.TanStack} className="h-3 w-3 shrink-0" />
        <ServiceTypeExplainer
          type="TanstackWorkflow"
          variant="indicator-button"
          className="z-10"
        >
          TanStack Workflow
        </ServiceTypeExplainer>
      </Badge>
    );
  }
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
