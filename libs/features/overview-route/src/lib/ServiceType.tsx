import type { ServiceType } from '@restate/data-access/admin-api';
import { ServiceTypeExplainer } from '@restate/features/explainers';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'text-xs bg-blue-50 text-blue-800 ring-blue-600/20 inline-flex gap-1 items-center rounded-md px-2 py-0.5 font-medium ring-1 ring-inset',
});
export function ServiceType({
  type,
  className,
}: {
  type?: ServiceType;
  className?: string;
}) {
  return (
    <div className={styles({ className })}>
      <ServiceTypeExplainer
        type={type}
        variant="indicator-button"
        className="z-10"
      >
        {type}
      </ServiceTypeExplainer>
    </div>
  );
}
