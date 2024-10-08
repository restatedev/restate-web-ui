import type { Deployment } from '@restate/data-access/admin-api';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from 'tailwind-variants';
import { isHttpDeployment } from './types';
import { Service } from './Service';
import { Link } from '@restate/ui/link';

const styles = tv({
  base: 'w-full rounded-xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]',
});

function getDeploymentIdentifier(deployment: Deployment) {
  if (isHttpDeployment(deployment)) {
    return deployment.uri;
  } else {
    return deployment.arn;
  }
}

export function Deployment({
  deployment,
  className,
}: {
  deployment: Deployment;
  className?: string;
}) {
  return (
    <div className={styles({ className })}>
      <Link
        href={`?deployment=${deployment.id}`}
        className="[text-decoration:inherit] [color:inherit]"
      >
        <div className="rounded-[calc(0.75rem-1px)] bg-white shadow-lg shadow-zinc-800/5 border flex gap-2 items-center flex-row m-[1px] pr-4 text-sm">
          <div className="h-10 aspect-square p-[2px]">
            <div className="rounded-[calc(0.75rem-2px)] bg-blue-50 h-full w-full flex items-center justify-center text-blue-500">
              <Icon
                name={
                  isHttpDeployment(deployment) ? IconName.Http : IconName.Lambda
                }
                className="w-5 h-5"
              />
            </div>
          </div>
          <div className="font-medium truncate">
            {getDeploymentIdentifier(deployment)}
          </div>
        </div>
      </Link>
      {deployment.services.length > 0 && (
        <div className="flex flex-col mt-2">
          <div className="ml-4 uppercase text-xs font-semibold text-gray-400 mt-2">
            Services
          </div>
          {deployment.services.map((service) => (
            <Service service={service} key={service.name} />
          ))}
        </div>
      )}
    </div>
  );
}
