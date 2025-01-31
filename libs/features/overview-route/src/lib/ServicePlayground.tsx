import { useSearchParams } from 'react-router';
import { useServiceOpenApi } from '@restate/data-access/admin-api';
import { Button } from '@restate/ui/button';
import { QueryDialog, DialogContent, DialogClose } from '@restate/ui/dialog';
import { Icon, IconName } from '@restate/ui/icons';
import { SERVICE_PLAYGROUND_QUERY_PARAM } from './constants';
import { ComponentProps, useEffect, useMemo, useState } from 'react';
import { useRestateContext } from '@restate/features/restate-context';
import { tv } from 'tailwind-variants';
import { API } from '@restate/ui/api';
import {
  ComplementaryClose,
  ComplementaryWithSearchParam,
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

const DEFAULT_CATEGORY = ' ';
export function ServicePlayground() {
  const [searchParams] = useSearchParams();
  const service = searchParams.get(SERVICE_PLAYGROUND_QUERY_PARAM);
  const enabled = typeof service === 'string';
  const { data } = useServiceOpenApi(String(service), { enabled });
  const { ingressUrl } = useRestateContext();
  const [isSheet, setIsSheet] = useState(true);

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
      (results: Map<string, { name: string; id: string }[]>, endpoint: any) => {
        const allMethods = Array.from(Object.values(endpoint)).map(
          (method: any) => ({
            category: method.tags?.at(0) ?? DEFAULT_CATEGORY,
            name: method?.summary,
            id: method.operationId,
          })
        );
        allMethods.forEach(({ category, name, id }) => {
          results.set(category, [
            ...(results.get(category) ?? []),
            { name, id },
          ]);
        });
        return results;
      },
      new Map<string, { name: string; id: string }[]>()
    );

    return { apiSpec, handlers };
  }, [data, ingressUrl]);

  const [selectedHandler, setSelectedHandler] = useState<string>();
  useEffect(() => {
    const handler = () => {
      const handlerId = window.location.hash.split('#/operations/').at(-1);
      setSelectedHandler(handlerId || undefined);
    };
    window.addEventListener('locationchange', handler, false);

    return () => {
      window.removeEventListener('locationchange', handler, false);
    };
  }, []);

  if (!service && !isSheet) {
    setIsSheet(true);
  }

  if (!isSheet) {
    const selectedCategory = Array.from(handlers.keys()).find((category) =>
      handlers.get(category)?.some(({ id }) => id === selectedHandler)
    );
    const selectedName = handlers
      .get(String(selectedCategory))
      ?.find(({ id }) => id === selectedHandler)?.name;
    const displayedName = [selectedCategory, selectedName]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join('/');
    return (
      <ComplementaryWithSearchParam
        paramName={SERVICE_PLAYGROUND_QUERY_PARAM}
        footer={
          <div className="flex gap-2 w-full">
            <ComplementaryClose>
              <Button
                className="flex-auto shrink-0  basis-1/2"
                variant="secondary"
              >
                Close
              </Button>
            </ComplementaryClose>
            <Dropdown>
              <DropdownTrigger>
                <Button
                  variant="secondary"
                  className="flex flex-auto gap-2 items-center pl-8 justify-center  basis-1/2 min-w-0"
                >
                  <span className="block truncate min-w-0">
                    {displayedName}
                  </span>
                  <Icon
                    name={IconName.ChevronsUpDown}
                    className="text-gray-400 w-3]4 h-4"
                  />
                </Button>
              </DropdownTrigger>
              <DropdownPopover>
                {Array.from(handlers.entries()).map(([category, methods]) => (
                  <DropdownSection title={category} key={category}>
                    <DropdownMenu
                      selectedItems={selectedHandler ? [selectedHandler] : []}
                      selectable
                      onSelect={(value) => {
                        window.location.hash = `#/operations/${value}`;
                      }}
                    >
                      {methods.map(({ name, id }) => (
                        <DropdownItem key={id} value={id}>
                          {name}
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </DropdownSection>
                ))}
              </DropdownPopover>
            </Dropdown>
          </div>
        }
      >
        <div className="[&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_.sl-elements-api>*:first-child]:hidden [&_.sl-elements-api>*:nth-child(2)]:px-2 [&_.sl-elements-api>*:nth-child(2)>*]:pt-2 [&_.sl-elements-api>*:nth-child(2)>*>*>*:last-child]:flex-col-reverse [&_.sl-elements-api>*:nth-child(2)>*>*>*>*]:mx-0 [&_.sl-elements-api>*:nth-child(2)>*>*>*>*]:w-full">
          <API apiDescriptionDocument={apiSpec} layout="sidebar" />
          <Button
            variant="icon"
            className="absolute right-3 top-3"
            onClick={() => {
              setIsSheet(true);
            }}
          >
            <Icon name={IconName.Maximize} className="w-5 h-5" />
          </Button>
        </div>
      </ComplementaryWithSearchParam>
    );
  }

  return (
    <QueryDialog query={SERVICE_PLAYGROUND_QUERY_PARAM}>
      <DialogContent
        variant={isSheet ? 'sheet' : 'modal'}
        className='[&_*:has(>[data-test="mobile-top-nav"])]:w-[calc(100vw-1rem)] [&_*:has(>[data-test="mobile-top-nav"])]:rounded-t-[0.7rem] [&_.sl-inverted_input]:text-gray-700 [&_input]:text-sm'
      >
        {apiSpec ? (
          <>
            <API apiDescriptionDocument={apiSpec} />
            <DialogClose>
              <Button variant="icon" className="absolute left-3 top-3">
                <Icon name={IconName.X} className="w-5 h-5" />
              </Button>
            </DialogClose>
            <Button
              variant="icon"
              className="absolute right-3 top-3"
              onClick={() => {
                setIsSheet((s) => !s);
                if (!selectedHandler) {
                  window.location.hash = `#/operations/${
                    handlers.get(DEFAULT_CATEGORY)?.at(0)?.id
                  }`;
                }
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
