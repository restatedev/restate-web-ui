import { Deployment } from '@restate/data-access/admin-api';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'w-full h-[80px] bg-white border shadow-sm p-2 rounded-lg h-[2rem] flex items-center text-sm',
});
export function Deployment({
  deployment,
  className,
}: {
  deployment: Deployment;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className={styles()}>Deployment</div>
      {deployment.services.map((service, i) => (
        <div
          key={i}
          className={styles({ className: 'mx-1 w-[calc(100%-0.25rem)]' })}
        >
          Service {service.name}
        </div>
      ))}
    </div>
  );
}
