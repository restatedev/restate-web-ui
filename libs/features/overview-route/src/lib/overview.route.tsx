import { useListDeployments } from '@restate/data-access/admin-api';
import { RestateServer } from './RestateServer';
import { Deployment } from './Deployment';
import { tv } from 'tailwind-variants';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';

const deploymentsStyles = tv({
  base: 'w-full row-start-1 col-start-1 grid gap-8 gap-x-[calc(2rem+150px)] [grid-template-columns:1fr] md:[grid-template-columns:1fr_1fr] ',
  variants: {
    isEmpty: {
      true: 'rounded-xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]',
      false: '',
    },
  },
  defaultVariants: {
    isEmpty: false,
  },
});
const reactServerStyles = tv({
  base: 'row-start-1 col-start-1 flex sticky top-[calc(50%-75px+3rem)] flex-col items-center w-fit',
  variants: {
    isEmpty: {
      true: 'h-fit',
      false: 'h-[150px]',
    },
  },
  defaultVariants: {
    isEmpty: false,
  },
});

function NoDeploymentPlaceholder() {
  return (
    <div className="flex flex-col gap-2 items-center relative w-full text-center mt-6 max-w-md">
      <h3 className="text-sm font-semibold text-gray-600">No deployments</h3>
      <p className="text-sm text-gray-500 px-4">
        Point Restate to your deployed services so Restate can discover and
        register your services and handlers
      </p>
      <div className="mt-4">
        <Button variant="secondary" className="flex gap-2 items-center">
          <Icon name={IconName.Plus} /> Register deployment
        </Button>
      </div>
    </div>
  );
}

function Component() {
  const { data, isError, isLoading, isSuccess } = useListDeployments();

  // Handle isLoading & isError
  const deployments = data?.deployments.slice(0, 0) ?? [];
  const hasNoDeployment = isSuccess && deployments.length === 0;

  return (
    <div className="flex-auto grid relative grid-cols-1 grid-rows-1 justify-items-center">
      <RestateServer
        className={reactServerStyles({ isEmpty: hasNoDeployment })}
      >
        {hasNoDeployment && <NoDeploymentPlaceholder />}
      </RestateServer>
      <div className={deploymentsStyles({ isEmpty: hasNoDeployment })}>
        <div className="flex flex-col gap-2 justify-center">
          {deployments.map((deployment, i) => (
            <Deployment
              key={deployment.id}
              deployment={deployment}
              className={i % 2 === 1 ? 'sm:hidden' : 'sm:block'}
            />
          ))}
        </div>
        <div className="flex flex-col gap-2 justify-center">
          {deployments.map((deployment, i) => (
            <Deployment
              key={deployment.id}
              deployment={deployment}
              className={i % 2 === 0 ? 'hidden' : 'hidden sm:block'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export const overview = { Component };
