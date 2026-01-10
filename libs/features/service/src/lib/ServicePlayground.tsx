import { useLocation, useSearchParams } from 'react-router';
import { useServiceOpenApi } from '@restate/data-access/admin-api-hooks';
import { Button, SubmitButton } from '@restate/ui/button';
import { QueryDialog, DialogContent, DialogClose } from '@restate/ui/dialog';
import { Icon, IconName } from '@restate/ui/icons';
import { SERVICE_PLAYGROUND_QUERY_PARAM } from './constants';
import {
  ComponentProps,
  Dispatch,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRestateContext } from '@restate/features/restate-context';
import { tv } from '@restate/util/styles';
import { API } from '@restate/ui/api';
import {
  ComplementaryClose,
  ComplementaryFooter,
  ComplementaryWithSearchParam,
  useActiveSidebarParam,
  useParamValue,
} from '@restate/ui/layout';
import { Link } from '@restate/ui/link';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Badge } from '@restate/ui/badge';
import { useTransition } from 'react';
import { ErrorBanner } from '@restate/ui/error';
import { Spinner } from '@restate/ui/loading';
import { useOnboarding } from '@restate/util/feature-flag';

const styles = tv({
  base: 'flex items-center gap-1 rounded-md px-1.5 py-0.5 font-sans text-xs font-normal',
  variants: {
    isOnboarding: { true: 'animate-pulseButton', false: '' },
  },
});
export function ServicePlaygroundTrigger({
  service,
  handler,
  onClick,
  className,
  variant = 'button',
}: {
  service: string;
  handler?: string | null;
  className?: string;
  onClick?: VoidFunction;
  variant?: ComponentProps<typeof Link>['variant'];
}) {
  const { data } = useServiceOpenApi(service);
  const isOnboarding = useOnboarding();

  if (!data) {
    return null;
  }

  return (
    <Link
      variant={variant}
      href={`?${SERVICE_PLAYGROUND_QUERY_PARAM}=${service}${
        handler ? `#/operations/${handler}` : ''
      }`}
      className={styles({ className, isOnboarding })}
      autoFocus={isOnboarding}
    >
      Playground <Icon name={IconName.ExternalLink} className="h-3 w-3" />
    </Link>
  );
}

const DEFAULT_CATEGORY = 'DEFAULT';
export function ServicePlayground() {
  const [searchParams] = useSearchParams();
  const [isSidebar, setIsSidebar] = useState(() => new Map<string, boolean>());
  const services = searchParams.getAll(SERVICE_PLAYGROUND_QUERY_PARAM);
  const service = services.at(0);
  const isActiveServiceSheet = isSidebar.get(String(service)) !== true;
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <ComplementaryWithSearchParam paramName={SERVICE_PLAYGROUND_QUERY_PARAM}>
        <ServicePlaygroundComplementaryContent
          setIsSidebar={setIsSidebar}
          isSidebar={isSidebar}
          onClose={(service) => {
            startTransition(() => {
              setIsSidebar((old) => {
                old.delete(service);
                return new Map(old);
              });
              return Promise.resolve();
            });
          }}
        />
      </ComplementaryWithSearchParam>
      {service && isActiveServiceSheet && !isPending && (
        <ServicePlaygroundSheetContent
          service={service}
          isSidebar={isSidebar}
          setIsSidebar={setIsSidebar}
        />
      )}
    </>
  );
}

function Attribution() {
  return (
    <a
      href="https://stoplight.io/?utm_source=elements&amp;utm_medium=counter2&amp;utm_campaign=powered_by&amp;utm_content=/operations/add"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center border-t px-4 py-3"
    >
      <svg
        aria-hidden="true"
        focusable="false"
        data-prefix="fas"
        data-icon="bolt"
        className="svg-inline--fa fa-bolt sl-icon fa-fw mr-1 text-[rgb(144,97,249)]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 384 512"
      >
        <path
          fill="currentColor"
          d="M240.5 224H352C365.3 224 377.3 232.3 381.1 244.7C386.6 257.2 383.1 271.3 373.1 280.1L117.1 504.1C105.8 513.9 89.27 514.7 77.19 505.9C65.1 497.1 60.7 481.1 66.59 467.4L143.5 288H31.1C18.67 288 6.733 279.7 2.044 267.3C-2.645 254.8 .8944 240.7 10.93 231.9L266.9 7.918C278.2-1.92 294.7-2.669 306.8 6.114C318.9 14.9 323.3 30.87 317.4 44.61L240.5 224z"
        ></path>
      </svg>
      <div className="text-0.5xs">
        powered by&nbsp;<strong>Stoplight</strong>
      </div>
    </a>
  );
}

function useApiSpec(service?: string | null) {
  const enabled = typeof service === 'string';
  const { data, error, refetch, isFetching } = useServiceOpenApi(
    String(service),
    {
      enabled,
    },
  );
  const { ingressUrl } = useRestateContext();

  const { apiSpec, handlers } = useMemo(() => {
    const apiSpec = data
      ? JSON.stringify({
          ...data,
          ...(ingressUrl && {
            servers: [{ url: ingressUrl, description: 'Restate Ingress URL' }],
          }),
        })
      : undefined;
    const handlers = Array.from(
      Object.values((data as any)?.paths ?? {}),
    ).reduce(
      (
        results: Map<string, { name: string; id: string; method: string }[]>,
        endpoint: any,
      ) => {
        const allMethods = Array.from(Object.entries(endpoint)).map(
          ([method, metadata]: any[]) => ({
            category: metadata?.tags?.at(0) ?? DEFAULT_CATEGORY,
            name: metadata?.summary,
            id: metadata?.operationId,
            method,
          }),
        );
        allMethods.forEach(({ category, name, id, method }) => {
          results.set(category, [
            ...(results.get(category) ?? []),
            { name, id, method },
          ]);
        });
        return results;
      },
      new Map<string, { name: string; id: string; method: string }[]>(),
    );

    return { apiSpec, handlers };
  }, [data, ingressUrl]);

  return { apiSpec, handlers, error, refetch, isFetching };
}

function ServicePlaygroundComplementaryContent({
  setIsSidebar,
  isSidebar,
  onClose,
}: {
  setIsSidebar: Dispatch<React.SetStateAction<Map<string, boolean>>>;
  isSidebar: Map<string, boolean>;
  onClose?: (service: string) => void;
}) {
  const service = useParamValue();
  const { apiSpec, handlers, error, refetch, isFetching } = useApiSpec(service);
  const activeSearch = useActiveSidebarParam(SERVICE_PLAYGROUND_QUERY_PARAM);
  const shouldDisplay = isSidebar.get(service) === true;
  const isActive = activeSearch === service;
  const location = useLocation();

  const selectedHandlerFromURL = window.location.hash
    .split('#/operations/')
    .at(-1)
    ?.split('#')
    .at(0);

  const isSelectedHandlerFromURLValid =
    !handlers.size ||
    Array.from(handlers.values()).some((methods) =>
      methods.some(({ id }) => id === selectedHandlerFromURL),
    );

  const [selectedHandler, _setSelectedHandler] = useState(
    selectedHandlerFromURL,
  );

  const setSelectedHandler = useCallback(
    (value: string) => {
      window.location.hash = `#/operations/${value}`;
      location.hash = `#/operations/${value}`;
      _setSelectedHandler(value);
    },
    [location],
  );

  const defaultHandler = handlers.get(DEFAULT_CATEGORY)?.at(0)?.id;

  useEffect(() => {
    if (isActive && shouldDisplay) {
      if (!isSelectedHandlerFromURLValid && selectedHandler) {
        window.location.hash = `#/operations/${selectedHandler}`;
        location.hash = `#/operations/${selectedHandler}`;
      } else if (
        !selectedHandler &&
        !isSelectedHandlerFromURLValid &&
        defaultHandler
      ) {
        setSelectedHandler(defaultHandler);
      } else if (
        selectedHandler !== selectedHandlerFromURL &&
        isSelectedHandlerFromURLValid
      ) {
        _setSelectedHandler(selectedHandlerFromURL);
      }
    }
  }, [
    defaultHandler,
    isActive,
    isSelectedHandlerFromURLValid,
    location,
    selectedHandler,
    selectedHandlerFromURL,
    setSelectedHandler,
    shouldDisplay,
  ]);

  if (!shouldDisplay) {
    return null;
  }

  const selectedCategory = Array.from(handlers.keys()).find((category) =>
    handlers.get(category)?.some(({ id }) => id === selectedHandler),
  );
  const selectedName = handlers
    .get(String(selectedCategory))
    ?.find(({ id }) => id === selectedHandler);

  return (
    <>
      <ComplementaryFooter>
        <div className="flex flex-auto flex-col gap-2">
          {error && <ErrorBanner errors={[error]} />}
          <div className="flex w-full gap-2">
            <ComplementaryClose>
              <Button
                className="flex-auto grow-0 basis-1/2"
                variant="secondary"
                onClick={() => {
                  _setSelectedHandler(undefined);
                  onClose?.(service);
                }}
              >
                Close
              </Button>
            </ComplementaryClose>
            <SubmitButton
              className="flex-auto grow-0 basis-1/2"
              onClick={() => refetch()}
              isPending={isFetching}
            >
              Refresh
            </SubmitButton>
          </div>
        </div>
      </ComplementaryFooter>
      <div className="flex min-h-full flex-col [&_.sl-elements-api>*:first-child]:hidden! [&_.sl-elements-api>*:nth-child(2)]:px-2! [&_.sl-elements-api>*:nth-child(2)>*]:pt-2! [&_.sl-elements-api>*:nth-child(2)>*>*>*:last-child]:flex-col-reverse! [&_.sl-elements-api>*:nth-child(2)>*>*>*>*]:mx-0! [&_.sl-elements-api>*:nth-child(2)>*>*>*>*]:w-full! [&_.sl-inverted_input]:text-gray-700! [&_.sl-pt-8]:pt-2! [&_.sl-rounded-lg]:rounded-xl! [&_.sl-stack--5]:gap-2! [&_.sl-stack--8]:gap-6! [&_.sl-text-lg]:text-0.5xs! [&_[dir=ltr]>[dir=ltr]]:hidden! [&_elements-api_h2]:text-xl! [&_h1]:mb-2! [&_h1]:hidden! [&_h1]:text-2xl! [&_h3]:text-lg! [&_input]:text-sm! [&_p]:text-sm!">
        <h2 className="mb-0.5 flex items-center gap-2 text-lg leading-6 font-medium text-gray-900">
          <div className="h-10 w-10 shrink-0 text-blue-400">
            <Icon
              name={IconName.Function}
              className="h-full w-full fill-blue-50 p-0.5 text-blue-400 drop-shadow-md"
            />
          </div>{' '}
          <div className="flex min-w-0 flex-auto flex-col items-start gap-1">
            <div className="flex w-full items-center pr-3">
              <span className="mr-[0.5ch] block min-w-0 truncate text-gray-500">
                {service}
              </span>
              <span className="shrink-0 text-gray-500">/</span>
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    variant="icon"
                    className="flex min-w-0 grow-0 items-center justify-center gap-2 px-1.5 text-lg italic"
                  >
                    <span className="block min-w-0 truncate font-medium text-gray-900">
                      {selectedName?.name}
                    </span>
                    <Icon
                      name={IconName.ChevronsUpDown}
                      className="h-4 w-4 text-gray-500"
                    />
                  </Button>
                </DropdownTrigger>
                <DropdownPopover className="max-h-36">
                  {Array.from(handlers.entries()).map(([category, methods]) => (
                    <DropdownSection
                      key={category}
                      {...(category === DEFAULT_CATEGORY
                        ? {
                            className: 'mt-1',
                          }
                        : {
                            title: category,
                          })}
                    >
                      <DropdownMenu
                        selectedItems={selectedHandler ? [selectedHandler] : []}
                        selectable
                        onSelect={(value) => {
                          setSelectedHandler(value);
                        }}
                      >
                        {methods.map(({ name, id, method }) => (
                          <DropdownItem key={id} value={id}>
                            <span className="font-mono">
                              <Badge size="sm">
                                <span className="text-gray-500 uppercase">
                                  {method}
                                </span>
                              </Badge>{' '}
                              {name}
                            </span>
                          </DropdownItem>
                        ))}
                      </DropdownMenu>
                    </DropdownSection>
                  ))}
                </DropdownPopover>
              </Dropdown>
            </div>
          </div>
        </h2>
        {isActive ? (
          <API
            apiDescriptionDocument={apiSpec}
            layout="sidebar"
            key={selectedHandlerFromURL}
          />
        ) : (
          <div className="flex-auto" />
        )}
        <Attribution />
        <Button
          variant="icon"
          className="absolute top-1 right-1"
          onClick={() => {
            setIsSidebar((old) => {
              if (service) {
                old.set(service, false);
              }
              return new Map(old);
            });
          }}
        >
          <Icon name={IconName.Maximize} className="h-4 w-4 text-gray-500" />
        </Button>
      </div>
    </>
  );
}

function ServicePlaygroundSheetContent({
  service,
  setIsSidebar,
  isSidebar,
}: {
  service: string;
  setIsSidebar: Dispatch<React.SetStateAction<Map<string, boolean>>>;
  isSidebar: Map<string, boolean>;
}) {
  const { apiSpec, handlers, error, isFetching } = useApiSpec(service);
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <QueryDialog query={SERVICE_PLAYGROUND_QUERY_PARAM}>
      <DialogContent
        variant={'sheet'}
        className='[&_*:has(>[data-test="mobile-top-nav"])]:w-[calc(100vw-1rem)] [&_*:has(>[data-test="mobile-top-nav"])]:rounded-t-[0.7rem] [&_.sl-inverted_input]:text-gray-700 [&_input]:text-sm'
      >
        {apiSpec ? <API apiDescriptionDocument={apiSpec} /> : null}
        {error && (
          <div className="mx-8 mt-12">
            <ErrorBanner errors={[error]} />
          </div>
        )}
        {!apiSpec && isFetching && (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex items-center gap-2.5 text-lg text-zinc-500">
              <Spinner className="h-6 w-6" />
              Loading…
            </div>
          </div>
        )}

        <div className="absolute top-3 right-3 flex items-center gap-2">
          {handlers.size > 0 && (
            <Button
              variant="icon"
              onClick={() => {
                const handlerFromUrl = window.location.hash
                  .split('#/operations/')
                  .at(-1)
                  ?.split('#')
                  ?.at(0);

                const handlerId =
                  handlerFromUrl || handlers.get(DEFAULT_CATEGORY)?.at(0)?.id;
                window.location.hash = `#/operations/${handlerId}`;
                setIsSidebar((old) => {
                  if (service) {
                    old.set(service, true);
                  }
                  return new Map(old);
                });
              }}
            >
              <Icon name={IconName.Minimize} className="h-5 w-5" />
            </Button>
          )}
          <DialogClose>
            <Button
              variant="icon"
              onClick={() => {
                const valuesToBeDeleted = searchParams
                  .getAll(SERVICE_PLAYGROUND_QUERY_PARAM)
                  .filter((service) => isSidebar.get(service) !== true);
                setSearchParams(
                  (prev) => {
                    let search = prev.toString();
                    valuesToBeDeleted.forEach((serviceName) => {
                      search = search.replace(
                        `${SERVICE_PLAYGROUND_QUERY_PARAM}=${serviceName}`,
                        '',
                      );
                    });

                    return new URLSearchParams(search);
                  },
                  { preventScrollReset: true },
                );
              }}
            >
              <Icon name={IconName.X} className="h-5 w-5" />
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </QueryDialog>
  );
}
