import { Deployment } from '@restate/data-access/admin-api';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'w-full h-[80px] bg-red-200',
});
export function Deployment({
  deployment,
  className,
}: {
  deployment: Deployment;
  className?: string;
}) {
  return (
    <div
      className={styles({ className })}
      style={{
        height: `${Math.random() * 200 + 50}px`,
      }}
    >
      deployment
    </div>
  );
}
