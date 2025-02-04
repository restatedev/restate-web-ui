import { useLocation, useSearchParams } from 'react-router';
import { useServiceOpenApi } from '@restate/data-access/admin-api';
import { Button } from '@restate/ui/button';
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
import { tv } from 'tailwind-variants';
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

const styles = tv({
  base: 'px-1.5 py-0.5 text-xs font-normal font-sans rounded-md flex items-center gap-1',
});
export function ServicePlaygroundTrigger({
  service,
  handler,
  onClick,
  className,
  variant = 'button',
}: {
  service: string;
  handler?: string;
  className?: string;
  onClick?: VoidFunction;
  variant?: ComponentProps<typeof Link>['variant'];
}) {
  const { data } = useServiceOpenApi(service);

  if (!data) {
    return null;
  }

  return (
    <Link
      variant={variant}
      href={`?${SERVICE_PLAYGROUND_QUERY_PARAM}=${service}${
        handler ? `#/operations/${handler}` : ''
      }`}
      className={styles({ className })}
    >
      Playground <Icon name={IconName.ExternalLink} className="w-3 h-3" />
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
      className="flex items-center px-4 py-3 border-t"
    >
      <svg
        aria-hidden="true"
        focusable="false"
        data-prefix="fas"
        data-icon="bolt"
        className="[color:rgb(144,97,249)] svg-inline--fa fa-bolt sl-icon fa-fw mr-1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 384 512"
      >
        <path
          fill="currentColor"
          d="M240.5 224H352C365.3 224 377.3 232.3 381.1 244.7C386.6 257.2 383.1 271.3 373.1 280.1L117.1 504.1C105.8 513.9 89.27 514.7 77.19 505.9C65.1 497.1 60.7 481.1 66.59 467.4L143.5 288H31.1C18.67 288 6.733 279.7 2.044 267.3C-2.645 254.8 .8944 240.7 10.93 231.9L266.9 7.918C278.2-1.92 294.7-2.669 306.8 6.114C318.9 14.9 323.3 30.87 317.4 44.61L240.5 224z"
        ></path>
      </svg>
      <div className="text-sm">
        powered by&nbsp;<strong>Stoplight</strong>
      </div>
    </a>
  );
}

function useApiSpec(service?: string | null) {
  const enabled = typeof service === 'string';
  const { data } = useServiceOpenApi(String(service), { enabled });
  const { ingressUrl } = useRestateContext();

  const { apiSpec, handlers } = useMemo(() => {
    const apiSpec = data
      ? JSON.stringify({
          servers: [{ url: ingressUrl }],
          ...data,
        })
      : undefined;
    const handlers = Array.from(
      Object.values((data as any)?.paths ?? {})
    ).reduce(
      (
        results: Map<string, { name: string; id: string; method: string }[]>,
        endpoint: any
      ) => {
        const allMethods = Array.from(Object.entries(endpoint)).map(
          ([method, metadata]: any[]) => ({
            category: metadata?.tags?.at(0) ?? DEFAULT_CATEGORY,
            name: metadata?.summary,
            id: metadata?.operationId,
            method,
          })
        );
        allMethods.forEach(({ category, name, id, method }) => {
          results.set(category, [
            ...(results.get(category) ?? []),
            { name, id, method },
          ]);
        });
        return results;
      },
      new Map<string, { name: string; id: string; method: string }[]>()
    );

    return { apiSpec, handlers };
  }, [data, ingressUrl]);

  return { apiSpec, handlers };
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
  const { apiSpec, handlers } = useApiSpec(service);
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
      methods.some(({ id }) => id === selectedHandlerFromURL)
    );
  const [selectedHandler, _setSelectedHandler] = useState(
    selectedHandlerFromURL
  );

  const setSelectedHandler = useCallback(
    (value: string) => {
      window.location.hash = `#/operations/${value}`;
      location.hash = `#/operations/${value}`;
      _setSelectedHandler(value);
    },
    [location]
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
    handlers.get(category)?.some(({ id }) => id === selectedHandler)
  );
  const selectedName = handlers
    .get(String(selectedCategory))
    ?.find(({ id }) => id === selectedHandler);

  return (
    <>
      <ComplementaryFooter>
        <div className="flex gap-2 w-full">
          <ComplementaryClose>
            <Button
              className="flex-auto shrink-0 grow-0 basis-1/2"
              variant="secondary"
              onClick={() => {
                _setSelectedHandler(undefined);
                onClose?.(service);
              }}
            >
              Close
            </Button>
          </ComplementaryClose>
          <Dropdown>
            <DropdownTrigger>
              <Button className="flex flex-auto gap-2 grow-0 items-center pl-8 justify-center  basis-1/2 min-w-0">
                <span className="block truncate min-w-0 font-mono">
                  <span className="uppercase">{selectedName?.method}</span>{' '}
                  {selectedName?.name}
                </span>
                <Icon
                  name={IconName.ChevronsUpDown}
                  className="text-gray-200 w-3]4 h-4"
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
                        <span className="font-mono ">
                          <Badge size="sm">
                            <span className="uppercase text-gray-500">
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
      </ComplementaryFooter>
      <div className="[&_.sl-rounded-lg]:rounded-xl [&_h1]:mb-2 [&_.sl-stack--8]:gap-4 [&_.sl-stack--5]:gap-2 [&_.sl-pt-8]:pt-2 [&_p]:text-sm [&_.sl-inverted_input]:text-gray-700 [&_input]:text-sm [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_.sl-elements-api>*:first-child]:hidden [&_.sl-elements-api>*:nth-child(2)]:px-2 [&_.sl-elements-api>*:nth-child(2)>*]:pt-2 [&_.sl-elements-api>*:nth-child(2)>*>*>*:last-child]:flex-col-reverse [&_.sl-elements-api>*:nth-child(2)>*>*>*>*]:mx-0 [&_.sl-elements-api>*:nth-child(2)>*>*>*>*]:w-full">
        {isActive && isSelectedHandlerFromURLValid && (
          <API
            apiDescriptionDocument={apiSpec}
            layout="sidebar"
            key={selectedHandlerFromURL}
          />
        )}
        <Attribution />
        <Button
          variant="icon"
          className="absolute right-3 top-3"
          onClick={() => {
            setIsSidebar((old) => {
              if (service) {
                old.set(service, false);
              }
              return new Map(old);
            });
          }}
        >
          <Icon name={IconName.Maximize} className="w-5 h-5" />
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
  const { apiSpec, handlers } = useApiSpec(service);
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <QueryDialog query={SERVICE_PLAYGROUND_QUERY_PARAM}>
      <DialogContent
        variant={'sheet'}
        className='[&_*:has(>[data-test="mobile-top-nav"])]:w-[calc(100vw-1rem)] [&_*:has(>[data-test="mobile-top-nav"])]:rounded-t-[0.7rem] [&_.sl-inverted_input]:text-gray-700 [&_input]:text-sm'
      >
        {apiSpec ? (
          <>
            <API apiDescriptionDocument={apiSpec} />
            <DialogClose>
              <Button
                variant="icon"
                className="absolute left-3 top-3"
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
                          ''
                        );
                      });

                      return new URLSearchParams(search);
                    },
                    { preventScrollReset: true }
                  );
                }}
              >
                <Icon name={IconName.X} className="w-5 h-5" />
              </Button>
            </DialogClose>
            <Button
              variant="icon"
              className="absolute right-3 top-3"
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
              <Icon name={IconName.Minimize} className="w-5 h-5" />
            </Button>
          </>
        ) : null}
      </DialogContent>
    </QueryDialog>
  );
}
