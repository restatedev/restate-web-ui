import { useListDeployments } from '@restate/data-access/admin-api';
import { RestateServer } from './RestateServer';
import { Deployment } from './Deployment';
import { tv } from 'tailwind-variants';
import { TriggerRegisterDeploymentDialog } from './RegisterDeployment/Dialog';

const deploymentsStyles = tv({
  base: 'w-full md:row-start-1 md:col-start-1 grid gap-8 gap-x-[calc(2rem+150px)] [grid-template-columns:1fr] md:[grid-template-columns:1fr_1fr] ',
  variants: {
    isEmpty: {
      true: '',
      false: '',
    },
  },
  defaultVariants: {
    isEmpty: false,
  },
});
const reactServerStyles = tv({
  base: 'md:row-start-1 md:col-start-1 flex md:sticky md:top-[calc(50%-75px+3rem)] flex-col items-center w-fit',
  variants: {
    isEmpty: {
      true: 'flex-auto w-full justify-center rounded-xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]',
      false: 'md:h-[150px]',
    },
  },
  defaultVariants: {
    isEmpty: false,
  },
});

function MultipleDeploymentsPlaceholder() {
  return (
    <div className="flex flex-col gap-2 items-center relative w-full text-center mt-6">
      <div className="mt-4">
        <TriggerRegisterDeploymentDialog>
          Deployment
        </TriggerRegisterDeploymentDialog>
      </div>
    </div>
  );
}

function OneDeploymentPlaceholder() {
  return (
    <div className="flex p-4 flex-col gap-2 items-center relative w-full text-center rounded-xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
      <p className="text-sm text-gray-500 max-w-md">
        Point Restate to your deployed services so Restate can discover and
        register your services and handlers
      </p>
      <div className="mt-4">
        <TriggerRegisterDeploymentDialog />
      </div>
    </div>
  );
}

function NoDeploymentPlaceholder() {
  return (
    <div className="flex flex-col gap-2 items-center relative w-full text-center mt-6">
      <h3 className="text-sm font-semibold text-gray-600">No deployments</h3>
      <p className="text-sm text-gray-500 px-4 max-w-md">
        Point Restate to your deployed services so Restate can discover and
        register your services and handlers
      </p>
      <div className="mt-4">
        <TriggerRegisterDeploymentDialog />
      </div>
    </div>
  );
}

// TODO: refactor layout
function Component() {
  const { data, isError, isLoading, isSuccess } = useListDeployments();

  // Handle isLoading & isError
  const deployments = data?.deployments ?? [];
  const hasNoDeployment = isSuccess && deployments.length === 0;

  return (
    <div className="flex-auto flex flex-col gap-2 md:grid relative grid-cols-1 grid-rows-1 justify-items-center">
      <RestateServer
        className={reactServerStyles({ isEmpty: hasNoDeployment })}
      >
        {hasNoDeployment && <NoDeploymentPlaceholder />}
        {deployments.length > 1 && <MultipleDeploymentsPlaceholder />}
      </RestateServer>
      <div className={deploymentsStyles({ isEmpty: hasNoDeployment })}>
        <div
          className={`flex flex-col min-w-0 gap-6 ${
            deployments.length < 5 ? 'justify-center' : 'justify-start'
          }`}
        >
          {deployments.map((deployment, i) => (
            <Deployment
              key={deployment.id}
              deployment={deployment}
              className={i % 2 === 1 ? 'md:hidden' : 'md:block'}
            />
          ))}
        </div>
        <div
          className={`flex flex-col min-w-0 gap-6 ${
            deployments.length < 5 ? 'justify-center' : 'justify-start'
          }`}
        >
          {deployments.map((deployment, i) => (
            <Deployment
              key={deployment.id}
              deployment={deployment}
              className={i % 2 === 0 ? 'hidden' : 'hidden md:block'}
            />
          ))}
          {deployments.length === 1 && <OneDeploymentPlaceholder />}
        </div>
      </div>
    </div>
  );
}

export const overview = { Component };
