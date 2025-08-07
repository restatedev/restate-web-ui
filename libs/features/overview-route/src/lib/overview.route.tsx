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
import {
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { FormFieldInput } from '@restate/ui/form-field';
import { ErrorBanner } from '@restate/ui/error';

function MultipleDeploymentsPlaceholder({
  filterText,
  onFilter,
}: {
  filterText: string;
  onFilter: (filterText: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const input = inputRef.current;
    const keyHandler = (event: KeyboardEvent) => {
      if (
        event.key !== '/' ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.repeat
      ) {
        return;
      }
      if (
        event.target instanceof HTMLElement &&
        /^(?:input|textarea|select|button)$/i.test(event.target?.tagName)
      )
        return;
      event.preventDefault();
      input?.focus();
    };
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('keydown', keyHandler);
    };
  }, []);

  return (
    <LayoutOutlet zone={LayoutZone.Toolbar}>
      <div className="flex items-center rounded-xl border border-transparent p-0.5 ring-1 ring-transparent has-[input[data-focused=true]]:border-blue-500 has-[input[data-focused=true]]:ring-blue-500">
        <div className="flex w-full items-center gap-0 p-px">
          <kbd className="ml-2 rounded-sm bg-zinc-600 px-1.5 text-sm text-zinc-400">
            /
          </kbd>
          <FormFieldInput
            ref={inputRef}
            type="search"
            value={filterText}
            onChange={onFilter}
            placeholder="Filter services, handlers, or deployments…"
            className="w-[40ch] min-w-0 shadow-none *:h-6 *:min-h-0 [&_input]:h-full [&_input]:border-0 [&_input]:border-transparent [&_input]:bg-transparent [&_input]:text-current [&_input]:placeholder-zinc-400 [&_input::-webkit-search-cancel-button]:invert [&_input[data-focused=true]]:border-transparent [&_input[data-focused=true]]:outline-0"
          />
          <TriggerRegisterDeploymentDialog
            variant="button"
            className="ml-auto h-7 rounded-lg py-0"
          >
            Deployment
          </TriggerRegisterDeploymentDialog>
        </div>
      </div>
    </LayoutOutlet>
  );
}

function OneDeploymentPlaceholder() {
  return (
    <div className="relative flex w-full max-w-lg flex-col items-center gap-2 rounded-xl border bg-gray-200/50 p-4 text-center shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
      <p className="max-w-md text-sm text-gray-500">
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

function NoDeploymentPlaceholder({ error }: { error?: Error | null }) {
  if (error) {
    return (
      <div className="relative mt-6 flex w-full flex-col items-center gap-2">
        <ErrorBanner error={error} />
      </div>
    );
  }
  return (
    <div className="relative mt-6 flex w-full flex-col items-center gap-2 text-center">
      <h3 className="text-sm font-semibold text-gray-600">
        No{' '}
        <ServiceDeploymentExplainer>
          service deployments
        </ServiceDeploymentExplainer>
      </h3>
      <p className="max-w-md px-4 text-sm text-gray-500">
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
      false: 'min-h-[calc(100vh-9rem-9rem)] sticky top-36',
    },
  },
  defaultVariants: {
    isEmpty: false,
  },
});
const layoutStyles = tv({
  base: 'min-h-full *:items-center [&>*:first-child_[data-anchor]]:rounded-br-none [&>*:first-child_[data-anchor]]:rounded-tr-none [&>*:first-child_[data-anchor]]:rounded-bl-full [&>*:first-child_[data-anchor]]:rounded-tl-full [&>*:first-child_[data-anchor]]:right-0 [&>*:first-child_[data-anchor]]:left-auto',
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
      true: '-mb-24 pb-8 pt-24 flex-auto w-full justify-center rounded-xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]',
      false:
        'hidden lg:block lg:fixed top-[50vh] left-[50vw] -translate-y-1/2 -translate-x-1/2',
    },
    isError: {
      true: '[&>svg:first-child>path]:fill-red-100',
      false: '',
    },
    isPending: {
      true: 'flex fixed',
      false: '',
    },
  },
  defaultVariants: {
    isEmpty: false,
    isError: false,
    isPending: false,
  },
});

// TODO: refactor layout
function Component() {
  const {
    data: { services, sortedServiceNames, deployments } = {},
    isPending,
    isFetched,
    isError,
    error,
    isFetching,
  } = useListDeployments();

  const size = services ? services.size : 0;
  const [isScrolling, setIsScrolling] = useState(false);
  const masonryId = useId();

  const [filter, setFilter] = useState('');
  const filterQuery = useDeferredValue(filter);

  useLayoutEffect(() => {
    let isCanceled = false;
    const resizeObserver = new ResizeObserver(() => {
      if (!isCanceled) {
        const escapedMasonryId = masonryId.replace(/:/g, '\\:');
        const masonryContainerHeight =
          document.querySelector(`.${escapedMasonryId}`)?.clientHeight ?? 0;
        const columnHeight = Math.max(
          ...Array.from(
            document.querySelectorAll(`.${escapedMasonryId} > *`),
          ).map((el) => el.clientHeight),
        );
        setIsScrolling(
          document.body.scrollHeight > document.body.clientHeight &&
            masonryContainerHeight <= columnHeight,
        );
      }
    });
    resizeObserver.observe(document.body);
    return () => {
      isCanceled = true;
      resizeObserver.unobserve(document.body);
    };
  }, [masonryId, sortedServiceNames, filterQuery]);
  const isEmpty = isFetched && (!deployments || deployments.size === 0);

  // TODO: Handle isLoading & isError

  return (
    <>
      <ResponsiveMasonry
        columnsCountBreakPoints={{ 0: 1, 1024: 2 }}
        className={deploymentsStyles({ isEmpty })}
      >
        <Masonry
          gutter="1.5rem"
          style={{ gap: 'calc(8rem + 150px)' }}
          className={layoutStyles({ isScrolling, className: masonryId })}
        >
          {sortedServiceNames?.map((serviceName) => (
            <Service
              key={
                serviceName + services?.get(serviceName)?.sortedRevisions?.at(0)
              }
              serviceName={serviceName}
              className="max-w-lg"
              filterText={filterQuery}
            >
              <div
                className="absolute top-1/2 left-0 h-0 w-0 rounded-tr-full rounded-br-full"
                data-anchor
              />
            </Service>
          ))}
          {size === 1 && <OneDeploymentPlaceholder />}
        </Masonry>
      </ResponsiveMasonry>
      <RestateServer
        className={reactServerStyles({
          isEmpty,
          isError,
          isPending,
        })}
        isError={isError}
        isEmpty={isEmpty}
      >
        {isEmpty && <NoDeploymentPlaceholder error={error} />}
      </RestateServer>
      {size > 1 && (
        <MultipleDeploymentsPlaceholder
          filterText={filter}
          onFilter={setFilter}
        />
      )}
    </>
  );
}

export const overview = { Component };
