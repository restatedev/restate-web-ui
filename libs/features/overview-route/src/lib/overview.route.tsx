import { useListDeployments } from '@restate/data-access/admin-api';
import { RestateServer } from './RestateServer';
import { Deployment } from './Deployment';
import { tv } from 'tailwind-variants';

const deploymentsStyles = tv({
  base: 'row-start-1 col-start-1 grid gap-8 gap-x-[calc(2rem+150px)] [grid-template-columns:1fr] md:[grid-template-columns:1fr_1fr] ',
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

function Component() {
  const { data, isError, isLoading, isSuccess } = useListDeployments();

  // Handle isLoading & isError
  const deployments = data?.deployments.slice(0, 0) ?? [];
  const hasNoDeployment = isSuccess && deployments.length === 0;

  return (
    <div className="flex-auto grid relative grid-cols-1 grid-rows-1">
      <RestateServer className="row-start-1 col-start-1 hidden md:block sticky top-[calc(50%-75px+3rem)] left-[calc(50%-75px)] w-[150px] h-[150px]" />
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
