import { useListDeployments } from '@restate/data-access/admin-api';
import { RestateServer } from './RestateServer';
import { tv } from 'tailwind-variants';
import { TriggerRegisterDeploymentDialog } from './RegisterDeployment/Dialog';
import {
  ServiceDeploymentExplainer,
  ServiceExplainer,
} from '@restate/features/explainers';
import { Service } from './Service';
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry';
import { useLayoutEffect, useState } from 'react';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';

function MultipleDeploymentsPlaceholder() {
  return (
    <LayoutOutlet zone={LayoutZone.Toolbar}>
      <div className="[&_a]:px-5 [&_a]:py-1.5 [&_a]:rounded-xl [&_a]:shadow-[inset_0_1px_0_0_theme(colors.gray.500)] [&_a]:[filter:drop-shadow(0_8px_6px_rgb(39_39_42/0.15))_drop-shadow(0_4px_3px_rgb(39_39_42/0.2))] [&_a:hover]:[filter:drop-shadow(0_12px_9px_rgb(39_39_42/0.15))_drop-shadow(0_8px_6px_rgb(39_39_42/0.2))] [&_a]:backdrop-blur-xl [&_a]:text-zinc-200 [&_a]:border-zinc-900/80 [&_a]:bg-zinc-900/90 [&_a:hover]:bg-zinc-900/85 [&_a[data-pressed=true]]:bg-zinc-900/80 flex flex-col gap-2 items-center text-center [&_a:hover]:scale-105 [&_a[data-pressed=true]]:scale-100 will-change-transform transform transition">
        <TriggerRegisterDeploymentDialog>
          Deployment
        </TriggerRegisterDeploymentDialog>
      </div>
    </LayoutOutlet>
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
        so Restate can register your{' '}
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
          service deployments
        </ServiceDeploymentExplainer>
      </h3>
      <p className="text-sm text-gray-500 px-4 max-w-md">
        Point Restate to your deployed services so Restate can register your{' '}
        <ServiceExplainer>services</ServiceExplainer> and handlers
      </p>
      <div className="mt-4">
        <TriggerRegisterDeploymentDialog />
      </div>
    </div>
  );
}

const deploymentsStyles = tv({
  base: '',
  variants: {
    isEmpty: {
      true: 'hidden',
      false: 'min-h-full',
    },
  },
  defaultVariants: {
    isEmpty: false,
  },
});
const layoutStyles = tv({
  base: 'min-h-full [&>*]:items-center',
  variants: {
    isScrolling: {
      true: 'items-start',
      false: 'items-center',
    },
  },
  defaultVariants: {
    isScrolling: false,
  },
});

const reactServerStyles = tv({
  base: 'justify-center flex flex-col items-center w-fit',
  variants: {
    isEmpty: {
      true: 'mb-[-6rem] pb-8 pt-24 flex-auto w-full justify-center rounded-xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]',
      false:
        'hidden lg:block lg:fixed top-[50vh] left-[50vw] -translate-y-1/2 -translate-x-1/2',
    },
  },
  defaultVariants: {
    isEmpty: false,
  },
});

// TODO: refactor layout
function Component() {
  const {
    data: { services, sortedServiceNames, deployments } = {},
    isPending,
    isSuccess,
  } = useListDeployments();
  const size = services ? services.size : 0;
  const isEmpty = isSuccess && (!deployments || deployments.size === 0);
  const [isScrolling, setIsScrolling] = useState(false);

  useLayoutEffect(() => {
    let isCanceled = false;
    const resizeObserver = new ResizeObserver(() => {
      if (!isCanceled) {
        setIsScrolling(document.body.scrollHeight > document.body.clientHeight);
      }
    });
    resizeObserver.observe(document.body);
    return () => {
      isCanceled = true;
      resizeObserver.unobserve(document.body);
    };
  }, [sortedServiceNames]);

  // Handle isLoading & isError

  return (
    <>
      <ResponsiveMasonry
        columnsCountBreakPoints={{ 0: 1, 1024: 2 }}
        className={deploymentsStyles({ isEmpty })}
      >
        <Masonry
          gutter="1.5rem"
          style={{ gap: 'calc(8rem + 150px)' }}
          className={layoutStyles({ isScrolling })}
        >
          {sortedServiceNames?.map((serviceName, i) => (
            <Service
              key={serviceName}
              serviceName={serviceName}
              className="max-w-lg"
            />
          ))}
          {size === 1 && <OneDeploymentPlaceholder />}
        </Masonry>
      </ResponsiveMasonry>
      <RestateServer className={reactServerStyles({ isEmpty })}>
        {isEmpty && <NoDeploymentPlaceholder />}
      </RestateServer>
      {size > 1 && <MultipleDeploymentsPlaceholder />}
    </>
  );
}

export const overview = { Component };
