import { useListDeployments } from '@restate/data-access/admin-api';
import { RestateServer } from './RestateServer';
import { Deployment } from './Deployment';
import { tv } from 'tailwind-variants';
import { TriggerRegisterDeploymentDialog } from './RegisterDeployment/Dialog';
import { ServiceDetails } from './Details.tsx/Service';
import { DeploymentDetails } from './Details.tsx/Deployment';
import {
  ServiceDeploymentExplainer,
  ServiceExplainer,
} from '@restate/features/explainers';

const deploymentsStyles = tv({
  base: 'w-full md:row-start-1 md:col-start-1 grid gap-8 gap-x-20 gap2-x-[calc(8rem+150px)]',
  variants: {
    isEmpty: {
      true: 'gap-0 h-full [grid-template-columns:1fr]',
      false:
        'h-fit [grid-template-columns:1fr] md:[grid-template-columns:1fr_150px_1fr]',
    },
  },
  defaultVariants: {
    isEmpty: false,
  },
});
const reactServerStyles = tv({
  base: 'justify-center flex md:sticky md:top-[11rem] flex-col items-center w-fit',
  variants: {
    isEmpty: {
      true: 'md:h-[calc(100vh-150px-6rem)] py-8 flex-auto w-full justify-center rounded-xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]',
      false:
        'h-fit md:max-h-[calc(100vh-150px-6rem)] min-h-[min(100%,calc(100vh-150px-6rem))]',
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
        Point Restate to your{' '}
        <ServiceDeploymentExplainer>
          service deployments
        </ServiceDeploymentExplainer>{' '}
        so Restate can discover and register your{' '}
        <ServiceExplainer>services</ServiceExplainer> and handlers
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
      <h3 className="text-sm font-semibold text-gray-600">
        No{' '}
        <ServiceDeploymentExplainer>
          service deployment
        </ServiceDeploymentExplainer>
      </h3>
      <p className="text-sm text-gray-500 px-4 max-w-md">
        Point Restate to your deployed services so Restate can discover and
        register your <ServiceExplainer>services</ServiceExplainer> and handlers
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
  const deployments = data?.deployments.slice(0, 60) ?? [];
  const hasNoDeployment = isSuccess && deployments.length === 0;

  return (
    <>
      <div className="flex flex-col gap-2 relative justify-items-center">
        <div className={deploymentsStyles({ isEmpty: hasNoDeployment })}>
          <div className="flex flex-col min-w-0 gap-6 justify-start">
            {deployments.map((deployment, i) => (
              <Deployment
                key={deployment.id}
                deployment={deployment}
                className={i % 2 === 1 ? 'md:hidden' : 'md:block'}
              />
            ))}
          </div>
          <RestateServer
            className={reactServerStyles({ isEmpty: hasNoDeployment })}
          >
            {hasNoDeployment && <NoDeploymentPlaceholder />}
            {deployments.length > 1 && <MultipleDeploymentsPlaceholder />}
          </RestateServer>
          <div className="flex flex-col min-w-0 gap-6 justify-start">
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
      <ServiceDetails />
      <DeploymentDetails />
    </>
  );
}

export const overview = { Component };
