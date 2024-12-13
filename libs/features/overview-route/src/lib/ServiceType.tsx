import type { ServiceType } from '@restate/data-access/admin-api';
import { ServiceTypeExplainer } from '@restate/features/explainers';
import { Badge } from '@restate/ui/badge';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: '',
});
export function ServiceType({
  type,
  className,
}: {
  type?: ServiceType;
  className?: string;
}) {
  return (
    <Badge variant="info" size="sm" className={styles({ className })}>
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
