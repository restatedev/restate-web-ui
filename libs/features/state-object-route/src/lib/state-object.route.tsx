import {
  FilterItem,
  useListDeployments,
  useListServices,
  useListVirtualObjectState,
  useQueryVirtualObjectState,
} from '@restate/data-access/admin-api';
import { Button, SubmitButton } from '@restate/ui/button';
import {
  Cell,
  Column,
  Row,
  Table,
  TableBody,
  TableHeader,
} from '@restate/ui/table';
import { SortDescriptor } from 'react-stately';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownMenuSelection,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import {
  SnapshotTimeProvider,
  useDurationSinceLastSnapshot,
} from '@restate/util/snapshot-time';
import {
  ComponentProps,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { formatDurations } from '@restate/util/intl';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import {
  AddQueryTrigger,
  QueryBuilder,
  QueryClause,
  QueryClauseSchema,
  QueryClauseType,
  useQueryBuilder,
} from '@restate/ui/query-builder';
import {
  Form,
  useHref,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import invariant from 'tiny-invariant';
import {
  ClauseChip,
  FiltersTrigger,
} from '@restate/features/invocations-route';
import {
  Popover,
  PopoverContent,
  PopoverHoverTrigger,
  usePopover,
} from '@restate/ui/popover';
import { Value } from '@restate/features/invocation-route';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { tv } from 'tailwind-variants';
import { STATE_QUERY_NAME } from './constants';
import { Link } from '@restate/ui/link';
import { useEditStateContext } from '@restate/features/edit-state';
import { toStateParam } from './toStateParam';

function getQuery(
  searchParams: URLSearchParams,
  schema: QueryClauseSchema<QueryClauseType>[]
) {
  return schema
    .filter((schemaClause) => searchParams.get(`filter_${schemaClause.id}`))
    .map((schemaClause) => {
      return QueryClause.fromJSON(
        schemaClause,
        searchParams.get(`filter_${schemaClause.id}`) ?? ''
      );
    });
}

const STATE_PAGE_SIZE = 30;

function EditStateTrigger(props: ComponentProps<typeof Button>) {
  const { close } = usePopover();
  return (
    <Button
      {...props}
      onClick={(e) => {
        close?.();
        props?.onClick?.(e);
      }}
    />
  );
}

function Component() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { virtualObject } = useParams<{ virtualObject: string }>();
  invariant(virtualObject, 'Missing virtualObject param');

  const [keysSet, setKeysSet] = useState(
    () =>
      new Set([
        'service_key',
        ...Array.from(new URLSearchParams(window.location.search).keys())
          .filter((key) => key.startsWith('filter_'))
          .map((key) => key.replace('filter_', '')),
      ])
  );
  const keys = Array.from(keysSet.values());

  const schema = useMemo(() => {
    return Array.from(keysSet.values()).map(
      (key) =>
        ({
          id: key,
          label: key === 'service_key' ? `${virtualObject} (Key)` : key,
          operations: [
            // TODO: add is null/ is not null
            { value: 'EQUALS', label: 'is' },
            { value: 'NOT_EQUALS', label: 'is not' },
            { value: 'CONTAINS', label: 'contains' },
            { value: 'NOT_CONTAINS', label: 'does not contain' },
          ],
          type: 'STRING',
        } as QueryClauseSchema<QueryClauseType>)
    ) satisfies QueryClauseSchema<QueryClauseType>[];
  }, [keysSet, virtualObject]);

  const [queryFilters, setQueryFilters] = useState<FilterItem[]>(() =>
    getQuery(searchParams, schema)
      .filter((clause) => clause.isValid)
      .map((clause) => {
        return {
          field: clause.id,
          operation: clause.value.operation!,
          type: clause.type,
          value: clause.value.value,
        } as FilterItem;
      })
  );
  const {
    dataUpdatedAt,
    errorUpdatedAt,
    error,
    data: serviceKeysData,
    isFetching,
    isPending,
    queryKey,
  } = useQueryVirtualObjectState(virtualObject, queryFilters, {
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 0,
  });

  const [pageIndex, _setPageIndex] = useState(0);
  const currentPageItems = useMemo(() => {
    return (serviceKeysData?.keys ?? [])
      .sort()
      .slice(pageIndex * STATE_PAGE_SIZE, (pageIndex + 1) * STATE_PAGE_SIZE);
  }, [pageIndex, serviceKeysData?.keys]);
  const listObjects = useListVirtualObjectState(
    virtualObject,
    currentPageItems
  );

  const flattenedData = useMemo(() => {
    return (
      listObjects.data?.objects.map((obj) => ({
        ...obj,
        state: obj.state.reduce(
          (p, c) => ({ ...p, [c.name]: c.value }),
          {} as Record<string, string>
        ),
      })) ?? []
    );
  }, [listObjects.data]);

  useEffect(() => {
    const keys =
      listObjects.data?.objects
        .map((obj) => obj.state.map(({ name }) => name))
        .flat() ?? [];
    setKeysSet((s) => new Set([...s.values(), ...keys].sort()));
  }, [listObjects.data]);

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>();
  const [, startTransition] = useTransition();

  const setPageIndex = useCallback(
    (arg: Parameters<typeof _setPageIndex>[0]) => {
      startTransition(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
        _setPageIndex(arg);
      });
    },
    []
  );

  const [selectedColumns, setSelectedColumns] = useState<DropdownMenuSelection>(
    new Set(['service_key'])
  );

  useEffect(() => {
    setSelectedColumns(new Set(['service_key']));
  }, [virtualObject]);

  useEffect(() => {
    setSelectedColumns((old) => {
      if (old instanceof Set && old.size <= 2) {
        return new Set([
          'service_key',
          ...Array.from(keysSet.values()).slice(0, 6),
        ]);
      }
      return old;
    });
  }, [keysSet]);

  const queryCLient = useQueryClient();

  const query = useQueryBuilder(getQuery(searchParams, schema));
  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  });

  const selectedColumnsArray = useMemo(() => {
    const cols = Array.from(selectedColumns).map((id, index) => ({
      name: id === 'service_key' ? `${virtualObject} (Key)` : id,
      id: String(id),
      isRowHeader: index === 0,
    }));
    cols.push({
      id: '__actions__',
      name: 'Actions',
      isRowHeader: false,
    });
    return cols;
  }, [selectedColumns, virtualObject]);

  const totalSize = Math.ceil(
    (serviceKeysData?.keys.length ?? 0) / STATE_PAGE_SIZE
  );
  const dataUpdate = error ? errorUpdatedAt : dataUpdatedAt;
  const setEditState = useEditStateContext();

  useEffect(() => {
    if ((serviceKeysData?.keys ?? []).length <= STATE_PAGE_SIZE * pageIndex) {
      setPageIndex(0);
    }
  }, [pageIndex, serviceKeysData?.keys, setPageIndex]);
  const hash = 'hash' + flattenedData.map(({ key }) => key).join('');

  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdate}>
      <div className="flex flex-col flex-auto gap-2 relative">
        <Table
          aria-label="Invocations"
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
          key={hash}
        >
          <TableHeader columns={selectedColumnsArray}>
            {(col) => {
              if (col.id === '__actions__') {
                return (
                  <Column id={col.id} width={40} allowsSorting={false}>
                    <Dropdown>
                      <DropdownTrigger>
                        {keys.length > 0 && (
                          <Button
                            variant="icon"
                            className="self-end rounded-lg p-0.5"
                          >
                            <Icon
                              name={IconName.TableProperties}
                              className="h-4 w-4 aspect-square text-gray-500"
                            />
                          </Button>
                        )}
                      </DropdownTrigger>
                      <DropdownPopover>
                        <DropdownSection title="Columns">
                          <DropdownMenu
                            multiple
                            selectable
                            selectedItems={selectedColumns}
                            onSelect={setSelectedColumns}
                          >
                            <DropdownItem
                              key={'service_key'}
                              value={'service_key'}
                            >
                              {virtualObject} (Key)
                            </DropdownItem>
                            {keys
                              .filter((key) => key !== 'service_key')
                              .map((key) => (
                                <DropdownItem key={key} value={key}>
                                  {key}
                                </DropdownItem>
                              ))}
                          </DropdownMenu>
                        </DropdownSection>
                      </DropdownPopover>
                    </Dropdown>
                  </Column>
                );
              }
              return (
                <Column
                  id={col.id}
                  isRowHeader={col.isRowHeader}
                  key={col.id}
                  allowsSorting={col.id === 'service_key'}
                >
                  {col.name}
                </Column>
              );
            }}
          </TableHeader>
          <TableBody
            numOfRows={pageIndex === 0 ? undefined : STATE_PAGE_SIZE}
            items={flattenedData}
            dependencies={[selectedColumnsArray, pageIndex]}
            error={error || listObjects.error}
            isLoading={
              isPending ||
              (listObjects.isPending && currentPageItems.length !== 0)
            }
            numOfColumns={selectedColumnsArray.length}
            emptyPlaceholder={
              <div className="flex flex-col items-center py-14 gap-4">
                <div className="shrink-0 h-12 w-12 p-1 bg-gray-200/50  rounded-xl">
                  <Icon
                    name={IconName.Database}
                    className="w-full h-full text-zinc-400 p-1"
                  />
                </div>
                <h3 className="text-sm font-semibold text-zinc-400">
                  No objects found
                </h3>
              </div>
            }
          >
            {(row) => {
              return (
                <Row
                  id={row.key + '_'}
                  columns={selectedColumnsArray}
                  className="[&:has(td[role=rowheader]_a[data-invocation-selected='true'])]:bg-blue-50 bg-transparent aaa"
                >
                  {({ id }) => {
                    if (id === 'service_key') {
                      return (
                        <Cell key={id}>
                          <KeyCell
                            serviceKey={String(row.key)}
                            virtualObject={virtualObject}
                          />
                        </Cell>
                      );
                    } else if (id === '__actions__') {
                      return (
                        <Cell>
                          <EditStateTrigger
                            className=""
                            variant="icon"
                            onClick={() =>
                              setEditState({
                                isEditing: true,
                                objectKey: row.key!,
                                service: virtualObject,
                              })
                            }
                          >
                            <Icon
                              name={IconName.Pencil}
                              className="w-3 h-3 fill-current opacity-70"
                            />
                          </EditStateTrigger>
                        </Cell>
                      );
                    } else {
                      return (
                        <Cell
                          key={id}
                          className="group [&:has(*:hover)_*]:visible [&:has(*:focus)_*]:visible"
                        >
                          <div className="min-h-5 flex item-center justify-start gap-1 w-full h-full">
                            {row.state?.[id] && (
                              <Popover>
                                <PopoverHoverTrigger>
                                  <Button
                                    className="truncate font-mono text-inherit [font-size:inherit] px-0.5 py-0 rounded-sm underline-offset-4 decoration-from-font decoration-dashed "
                                    variant="icon"
                                  >
                                    <span className="truncate pr-0.5">
                                      {row.state?.[id]}
                                    </span>
                                  </Button>
                                </PopoverHoverTrigger>
                                <PopoverContent>
                                  <DropdownSection
                                    className="min-w-80 overflow-auto max-w-[min(90vw,600px)] px-4 mb-1"
                                    title={
                                      <div className="flex items-center text-code">
                                        {id}
                                        <EditStateTrigger
                                          onClick={() =>
                                            setEditState({
                                              isEditing: true,
                                              key: id,
                                              objectKey: row.key!,
                                              service: virtualObject,
                                            })
                                          }
                                          variant="secondary"
                                          className="shrink-0 ml-auto flex items-center gap-1 text-xs font-normal rounded px-1.5 py-0"
                                        >
                                          Edit
                                          <Icon
                                            name={IconName.ExternalLink}
                                            className="w-3 h-3"
                                          />
                                        </EditStateTrigger>
                                      </div>
                                    }
                                  >
                                    <Value
                                      value={row.state?.[id]}
                                      className="text-xs font-mono py-3"
                                    />
                                  </DropdownSection>
                                </PopoverContent>
                              </Popover>
                            )}
                            <EditStateTrigger
                              onClick={() =>
                                setEditState({
                                  isEditing: true,
                                  key: id,
                                  objectKey: row.key!,
                                  service: virtualObject,
                                })
                              }
                              variant="icon"
                              className="shrink-0 invisible group-hover:visible"
                            >
                              <Icon
                                name={IconName.Pencil}
                                className="w-3 h-3 fill-current opacity-70"
                              />
                            </EditStateTrigger>
                          </div>
                        </Cell>
                      );
                    }
                  }}
                </Row>
              );
            }}
          </TableBody>
        </Table>
        <Footnote
          data={serviceKeysData}
          isFetching={isFetching || listObjects.isFetching}
          key={dataUpdate}
        >
          {!isPending && !error && totalSize > 1 && (
            <div className="flex items-center bg-zinc-50 shadow-sm border rounded-lg py-0.5">
              <Button
                variant="icon"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex(0)}
              >
                <Icon name={IconName.ChevronFirst} className="w-4 h-4" />
              </Button>
              <Button
                variant="icon"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex(pageIndex - 1)}
                className=""
              >
                <Icon name={IconName.ChevronLeft} className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-0.5 mx-2 text-code">
                {pageIndex + 1} / {totalSize}
              </div>

              <Button
                variant="icon"
                disabled={pageIndex + 1 === totalSize}
                onClick={() => setPageIndex(pageIndex + 1)}
                className=""
              >
                <Icon name={IconName.ChevronRight} className="w-4 h-4" />
              </Button>
              <Button
                variant="icon"
                disabled={pageIndex + 1 === totalSize}
                onClick={() => setPageIndex(totalSize - 1)}
              >
                <Icon name={IconName.ChevronLast} className="w-4 h-4" />
              </Button>
            </div>
          )}
        </Footnote>
      </div>
      <LayoutOutlet zone={LayoutZone.Toolbar}>
        <Form
          action={`/query/services/${virtualObject}/state`}
          method="POST"
          className="flex relative items-center"
          onSubmit={async (event) => {
            event.preventDefault();

            const newSearchParams = new URLSearchParams(searchParams);
            Array.from(newSearchParams.keys())
              .filter((key) => key.startsWith('filter_'))
              .forEach((key) => newSearchParams.delete(key));
            query.items
              .filter((clause) => clause.isValid)
              .forEach((item) => {
                newSearchParams.set(`filter_${item.id}`, String(item));
              });
            const sortedNewSearchParams = new URLSearchParams(newSearchParams);
            sortedNewSearchParams.sort();
            const sortedOldSearchParams = new URLSearchParams(searchParams);
            sortedOldSearchParams.sort();

            setSearchParams(newSearchParams, { preventScrollReset: true });
            console.log(query.items);
            setQueryFilters(
              query.items
                .filter((clause) => clause.isValid)
                .map(
                  (clause) =>
                    ({
                      field: clause.id,
                      operation: clause.value.operation!,
                      type: clause.type,
                      value: clause.value.value,
                    } as FilterItem)
                )
            );
            await queryCLient.invalidateQueries({ queryKey });
            await queryCLient.invalidateQueries({
              predicate: (query) =>
                query.queryKey[0] === `/query/services/${virtualObject}/state`,
            });
          }}
        >
          <QueryBuilder
            query={query}
            schema={schema}
            multiple={false}
            key={
              schema
                .map((s) => s.id)
                .sort()
                .join('') + virtualObject
            }
          >
            <AddQueryTrigger
              MenuTrigger={FiltersTrigger}
              placeholder={`Filter state…`}
              prefix={<ServiceSelector />}
              title="Filters"
              className="rounded-xl [&_input::-webkit-search-cancel-button]:invert has-[input[data-focused=true]]:border-blue-500 has-[input[data-focused=true]]:ring-blue-500 [&_input]:placeholder-zinc-400 border-transparent pr-24 w-full  [&_input+*]:right-24 [&_input]:min-w-[25ch]"
            >
              {ClauseChip}
            </AddQueryTrigger>
          </QueryBuilder>
          <SubmitButton
            isPending={isFetching}
            className="absolute right-1 top-1 bottom-1 rounded-lg py-0 disabled:bg-gray-400  disabled:text-gray-200"
          >
            Query
          </SubmitButton>
        </Form>
      </LayoutOutlet>
    </SnapshotTimeProvider>
  );
}

const stylesKey = tv({
  base: 'relative text-zinc-600 font-mono -ml-1 w-fit max-w-full',
  slots: {
    text: '',
    container: 'pl-1 inline-flex items-center w-full align-middle',
    link: "before:rounded-lg m-0.5 text-zinc-500 outline-offset-0 ml-0 rounded-full  before:absolute before:inset-0 before:content-[''] hover:before:bg-black/[0.03] pressed:before:bg-black/5",
    linkIcon: 'w-4 h-4 text-current shrink-0',
  },
});

function KeyCell({
  serviceKey,
  virtualObject,
  className,
}: {
  serviceKey: string;
  virtualObject: string;
  className?: string;
}) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const { base, text, link, container, linkIcon } = stylesKey();

  return (
    <div className={base({ className })}>
      <div className={container({})}>
        <TruncateWithTooltip copyText={serviceKey} triggerRef={linkRef}>
          <span className={text()}>{serviceKey}</span>
        </TruncateWithTooltip>
        <Link
          ref={linkRef}
          href={`?${STATE_QUERY_NAME}=${toStateParam({
            key: serviceKey,
            virtualObject,
          })}`}
          aria-label={serviceKey}
          variant="secondary"
          className={link()}
        >
          <Icon name={IconName.ChevronRight} className={linkIcon()} />
        </Link>
      </div>
    </div>
  );
}

function Footnote({
  data,
  isFetching,
  children,
}: PropsWithChildren<{
  isFetching: boolean;
  data?: ReturnType<typeof useQueryVirtualObjectState>['data'];
}>) {
  const [now, setNow] = useState(() => Date.now());
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    setNow(Date.now());

    if (data) {
      interval = setInterval(() => {
        setNow(Date.now());
      }, 30_000);
    }

    return () => {
      interval && clearInterval(interval);
    };
  }, [data]);

  const { isPast, ...parts } = durationSinceLastSnapshot(now);
  const duration = formatDurations(parts);

  return (
    <div className="flex flex-row-reverse flex-wrap items-center w-full text-center text-xs text-gray-500/80 ">
      {data && (
        <div className="ml-auto">
          {data.keys && data.keys.length > 0 ? (
            <>
              <span className="font-medium text-gray-500">
                {data.keys.length}
              </span>{' '}
              objects
            </>
          ) : (
            'No objects found'
          )}{' '}
          as of{' '}
          <span className="font-medium text-gray-500">{duration} ago</span>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

function ServiceSelector() {
  const { virtualObject } = useParams<{ virtualObject: string }>();
  invariant(virtualObject, 'Missing virtualObject param');
  const { data: deployments } = useListDeployments();
  const services = Array.from(deployments?.services.keys() ?? []);
  const servicesSize = services.length;
  const { data } = useListServices(services);
  const virtualObjects = Array.from(data.values() ?? [])
    .filter((service) => service.ty === 'VirtualObject')
    .map((service) => service.name);
  const navigate = useNavigate();
  const newVirtualObject = virtualObjects[0];

  const base = useHref('/');
  const defaultVirtualObject = useHref(
    newVirtualObject ? `../${newVirtualObject}` : '..',
    {
      relative: 'path',
    }
  ).replace(base, '');

  const isInValid =
    data.size === servicesSize &&
    servicesSize > 0 &&
    !virtualObjects.includes(virtualObject);

  useEffect(() => {
    if (isInValid) {
      navigate(`/${defaultVirtualObject}${window.location.search}`, {
        relative: 'path',
      });
    }
  }, [navigate, defaultVirtualObject, isInValid]);

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="secondary"
          className="shrink-0 min-w-0 flex gap-[0.7ch] items-center py-1 rounded-lg bg-white/[0.25] hover:bg-white/30 pressed:bg-white/30 text-zinc-50 text-xs px-1.5"
        >
          <span className="whitespace-nowrap shrink-0">Virtual Object</span>
          <span className="font-mono">is</span>
          <span className="font-semibold truncate">{virtualObject}</span>
          <Icon
            name={IconName.ChevronsUpDown}
            className="w-3.5 h-3.5 ml-2 shrink-0"
          />
        </Button>
      </DropdownTrigger>
      <DropdownPopover placement="top">
        <DropdownSection title="Virtual Objects">
          <DropdownMenu selectable selectedItems={[virtualObject]}>
            {virtualObjects.map((service) => (
              <DropDownVirtualObject service={service} key={service} />
            ))}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}

function DropDownVirtualObject({ service }: { service: string }) {
  const [searchParams] = useSearchParams();

  const search = useMemo(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    Array.from(newSearchParams.keys())
      .filter((key) => key.startsWith('filter_'))
      .forEach((key) => newSearchParams.delete(key));

    return newSearchParams.toString();
  }, [searchParams]);

  // TODO: refactor using useHref
  const base = useHref('/');
  const href = useHref(`../${service}?${search}`, { relative: 'path' });

  return (
    <DropdownItem value={service} href={href.replace(base, '')}>
      {service}
    </DropdownItem>
  );
}

export const virtualObject = { Component };
