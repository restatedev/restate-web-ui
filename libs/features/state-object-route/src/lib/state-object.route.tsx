import type { FilterItem } from '@restate/data-access/admin-api';
import {
  useListDeployments,
  useListServices,
  useListVirtualObjectState,
  useQueryVirtualObjectState,
} from '@restate/data-access/admin-api-hooks';
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
import { DecodedValue, Value } from '@restate/features/invocation-route';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';
import { STATE_QUERY_NAME } from './constants';
import { Link } from '@restate/ui/link';
import { useEditStateContext } from '@restate/features/edit-state';
import { toStateParam } from './toStateParam';
import { SplitButton } from '@restate/ui/split-button';
import { useRestateContext } from '@restate/features/restate-context';

function getQuery(
  searchParams: URLSearchParams,
  schema: QueryClauseSchema<QueryClauseType>[],
) {
  return schema
    .filter((schemaClause) => searchParams.get(`filter_${schemaClause.id}`))
    .map((schemaClause) => {
      return QueryClause.fromJSON(
        schemaClause,
        searchParams.get(`filter_${schemaClause.id}`) ?? '',
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

const actionButtonStyles = tv({
  base: 'invisible absolute right-full z-2 translate-x-px rounded-l-md rounded-r-none px-2 py-0.5 [font-size:inherit] [line-height:inherit] drop-shadow-[-20px_2px_4px_rgba(255,255,255,0.4)] group-hover:visible',
});

function Component() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { virtualObject } = useParams<{ virtualObject: string }>();
  invariant(virtualObject, 'Missing virtualObject param');
  const { isValid, isValidating } = useValidateVirtualObject();

  const [keysSet, setKeysSet] = useState(
    () =>
      new Set([
        'service_key',
        ...Array.from(new URLSearchParams(window.location.search).keys())
          .filter((key) => key.startsWith('filter_'))
          .map((key) => key.replace('filter_', '')),
      ]),
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
        }) as QueryClauseSchema<QueryClauseType>,
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
      }),
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
    enabled: isValid,
  });

  const [pageIndex, _setPageIndex] = useState(0);
  const currentPageItems = useMemo(() => {
    return (serviceKeysData?.keys ?? [])
      .sort()
      .slice(pageIndex * STATE_PAGE_SIZE, (pageIndex + 1) * STATE_PAGE_SIZE);
  }, [pageIndex, serviceKeysData?.keys]);
  const listObjects = useListVirtualObjectState(
    virtualObject,
    currentPageItems,
  );

  const flattenedData = useMemo(() => {
    return (
      listObjects.data?.objects.map((obj) => ({
        ...obj,
        state: obj.state.reduce(
          (p, c) => ({ ...p, [c.name]: c.value }),
          {} as Record<string, string>,
        ),
      })) ?? []
    );
  }, [listObjects.data]);

  useEffect(() => {
    if (!isPending) {
      const keys =
        listObjects.data?.objects
          .map((obj) => obj.state.map(({ name }) => name))
          .flat() ?? [];
      setKeysSet(
        (s) =>
          new Set([
            'service_key',
            ...[
              ...Array.from(s.values()).filter((v) => keys.includes(v)),
              ...keys,
            ].sort(),
          ]),
      );
    }
  }, [listObjects.data, isPending]);

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>();
  const [, startTransition] = useTransition();

  const setPageIndex = useCallback(
    (arg: Parameters<typeof _setPageIndex>[0]) => {
      startTransition(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
        _setPageIndex(arg);
      });
    },
    [],
  );

  const [selectedColumns, setSelectedColumns] = useState<DropdownMenuSelection>(
    new Set(['service_key']),
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
    (serviceKeysData?.keys.length ?? 0) / STATE_PAGE_SIZE,
  );
  const dataUpdate = error ? errorUpdatedAt : dataUpdatedAt;
  const setEditState = useEditStateContext();
  const { EncodingWaterMark } = useRestateContext();

  useEffect(() => {
    if ((serviceKeysData?.keys ?? []).length <= STATE_PAGE_SIZE * pageIndex) {
      setPageIndex(0);
    }
  }, [pageIndex, serviceKeysData?.keys, setPageIndex]);
  const hash = 'hash' + flattenedData.map(({ key }) => key).join('');

  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdate}>
      <div className="relative flex flex-auto flex-col gap-2">
        <Table
          aria-label="State"
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
          key={hash}
        >
          <TableHeader
            columns={selectedColumnsArray}
            dependencies={[selectedColumnsArray, selectedColumns, keys]}
          >
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
                              className="aspect-square h-4 w-4 text-gray-500"
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
                  allowsSorting={false}
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
              isValidating ||
              (listObjects.isPending && currentPageItems.length !== 0)
            }
            numOfColumns={selectedColumnsArray.length}
            emptyPlaceholder={
              <div className="flex flex-col items-center gap-4 py-14">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-gray-200/50 p-1">
                  <Icon
                    name={IconName.Database}
                    className="h-full w-full p-1 text-zinc-400"
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
                  className="aaa bg-transparent [&:has(td[role=rowheader]_a[data-invocation-selected='true'])]:bg-blue-50"
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
                        <Cell className="align-top [&&&]:overflow-visible">
                          <SplitButton
                            menus={
                              <>
                                <DropdownItem value="edit">Edit…</DropdownItem>
                                <DropdownItem destructive value="delete">
                                  Delete…
                                </DropdownItem>
                              </>
                            }
                            mini
                            onSelect={(key) => {
                              if (key === 'edit') {
                                setEditState({
                                  isEditing: true,
                                  isDeleting: false,
                                  objectKey: row.key!,
                                  service: virtualObject,
                                });
                              }
                              if (key === 'delete') {
                                setEditState({
                                  isEditing: true,
                                  isDeleting: true,
                                  objectKey: row.key!,
                                  service: virtualObject,
                                });
                              }
                            }}
                          >
                            <EditStateTrigger
                              className={actionButtonStyles()}
                              variant="secondary"
                              onClick={() =>
                                setEditState({
                                  isEditing: true,
                                  isDeleting: false,
                                  objectKey: row.key!,
                                  service: virtualObject,
                                })
                              }
                            >
                              Edit
                            </EditStateTrigger>
                          </SplitButton>
                        </Cell>
                      );
                    } else {
                      return (
                        <Cell
                          key={id}
                          className="group [&:has(*:focus)_*]:visible [&:has(*:hover)_*]:visible"
                        >
                          <div className="item-center flex h-full min-h-5 w-full justify-start gap-1">
                            {row.state?.[id] && (
                              <Popover>
                                <PopoverHoverTrigger>
                                  <Button
                                    className="truncate rounded-xs px-0.5 py-0 font-mono [font-size:inherit] text-inherit decoration-dashed decoration-from-font underline-offset-4"
                                    variant="icon"
                                  >
                                    <span className="inline-flex items-center truncate pr-0.5">
                                      {EncodingWaterMark && (
                                        <EncodingWaterMark
                                          value={row.state?.[id]}
                                          mini
                                          className="mr-1"
                                        />
                                      )}
                                      <DecodedValue
                                        value={row.state?.[id]}
                                        isBase64
                                      />
                                    </span>
                                  </Button>
                                </PopoverHoverTrigger>
                                <PopoverContent>
                                  <DropdownSection
                                    className="mb-1 max-w-[min(90vw,600px)] overflow-auto px-4"
                                    title={
                                      <div className="flex items-center text-0.5xs">
                                        {id}
                                        <EditStateTrigger
                                          onClick={() =>
                                            setEditState({
                                              isEditing: true,
                                              isDeleting: false,
                                              key: id,
                                              objectKey: row.key!,
                                              service: virtualObject,
                                            })
                                          }
                                          variant="secondary"
                                          className="ml-auto flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0 text-xs font-normal"
                                        >
                                          Edit
                                          <Icon
                                            name={IconName.ExternalLink}
                                            className="h-3 w-3"
                                          />
                                        </EditStateTrigger>
                                      </div>
                                    }
                                  >
                                    <Value
                                      value={row.state?.[id]}
                                      className="py-3 font-mono text-xs"
                                    />
                                  </DropdownSection>
                                </PopoverContent>
                              </Popover>
                            )}
                            <EditStateTrigger
                              onClick={() =>
                                setEditState({
                                  isEditing: true,
                                  isDeleting: false,
                                  key: id,
                                  objectKey: row.key!,
                                  service: virtualObject,
                                })
                              }
                              variant="icon"
                              className="invisible shrink-0 group-hover:visible"
                            >
                              <Icon
                                name={IconName.Pencil}
                                className="h-3 w-3 fill-current opacity-70"
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
            <div className="flex items-center rounded-lg border bg-zinc-50 py-0.5 shadow-xs">
              <Button
                variant="icon"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex(0)}
              >
                <Icon name={IconName.ChevronFirst} className="h-4 w-4" />
              </Button>
              <Button
                variant="icon"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex(pageIndex - 1)}
                className=""
              >
                <Icon name={IconName.ChevronLeft} className="h-4 w-4" />
              </Button>
              <div className="mx-2 flex items-center gap-0.5 text-0.5xs">
                {pageIndex + 1} / {totalSize}
              </div>

              <Button
                variant="icon"
                disabled={pageIndex + 1 === totalSize}
                onClick={() => setPageIndex(pageIndex + 1)}
                className=""
              >
                <Icon name={IconName.ChevronRight} className="h-4 w-4" />
              </Button>
              <Button
                variant="icon"
                disabled={pageIndex + 1 === totalSize}
                onClick={() => setPageIndex(totalSize - 1)}
              >
                <Icon name={IconName.ChevronLast} className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Footnote>
      </div>
      <LayoutOutlet zone={LayoutZone.Toolbar}>
        <Form
          action={`/query/services/${virtualObject}/state`}
          method="POST"
          className="relative flex items-center"
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
                    }) as FilterItem,
                ),
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
              className="w-full rounded-xl border-transparent pr-24 has-[input[data-focused=true]]:border-blue-500 has-[input[data-focused=true]]:ring-blue-500 [&_input]:min-w-[25ch] [&_input]:placeholder-zinc-400 [&_input+*]:right-24 [&_input::-webkit-search-cancel-button]:invert"
            >
              {ClauseChip}
            </AddQueryTrigger>
          </QueryBuilder>
          <SubmitButton
            isPending={isFetching}
            className="absolute top-1 right-1 bottom-1 rounded-lg py-0 disabled:bg-gray-400 disabled:text-gray-200"
          >
            Query
          </SubmitButton>
        </Form>
      </LayoutOutlet>
    </SnapshotTimeProvider>
  );
}

const stylesKey = tv({
  base: 'relative -ml-1 w-fit max-w-full font-mono text-zinc-600',
  slots: {
    text: '',
    container: 'inline-flex w-full items-center pl-1 align-middle',
    link: "m-0.5 ml-0 rounded-full text-zinc-500 outline-offset-0 before:absolute before:inset-0 before:rounded-lg before:content-[''] hover:before:bg-black/3 pressed:before:bg-black/5",
    linkIcon: 'h-4 w-4 shrink-0 text-current',
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
    <div className="flex w-full flex-row-reverse flex-wrap items-center text-center text-xs text-gray-500/80">
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

function getDefaultVirtualObjectOrWorkflow(services: string[]) {
  if (typeof window !== 'undefined') {
    const previousSelectedState = localStorage.getItem('state_last_service');
    return previousSelectedState && services.includes(previousSelectedState)
      ? previousSelectedState
      : services.at(0);
  }
  return services.at(0);
}

function useValidateVirtualObject() {
  const { virtualObject: serviceParam } = useParams<{
    virtualObject: string;
  }>();
  invariant(serviceParam, 'Missing virtualObject param');
  const { data: deployments, isPending } = useListDeployments();
  const services = Array.from(deployments?.services.keys() ?? []);
  const servicesSize = services.length;
  const { data } = useListServices(services);
  const virtualObjects = Array.from(data.values() ?? [])
    .filter((service) => service.ty === 'VirtualObject')
    .map((service) => service.name)
    .sort();
  const workflows = Array.from(data.values() ?? [])
    .filter((service) => service.ty === 'Workflow')
    .map((service) => service.name)
    .sort();
  const virtualObjectsAndWorkflows = [...virtualObjects, ...workflows];
  const navigate = useNavigate();
  const newService = getDefaultVirtualObjectOrWorkflow(
    virtualObjectsAndWorkflows,
  );

  const base = useHref('/');
  const defaultService = useHref(newService ? `../${newService}` : '..', {
    relative: 'path',
  }).replace(base, '');

  const isInValid =
    data.size === servicesSize &&
    servicesSize > 0 &&
    !virtualObjectsAndWorkflows.includes(serviceParam);

  useEffect(() => {
    if (isInValid) {
      navigate(`/${defaultService}${window.location.search}`, {
        relative: 'path',
      });
    }
  }, [navigate, defaultService, isInValid]);

  return {
    isValidating: isPending,
    isValid: virtualObjectsAndWorkflows.includes(serviceParam),
    virtualObjectsAndWorkflows,
    virtualObjects,
    workflows,
  };
}

function ServiceSelector() {
  const { virtualObject: serviceParam } = useParams<{
    virtualObject: string;
  }>();
  invariant(serviceParam, 'Missing virtualObject param');
  const { virtualObjects, workflows } = useValidateVirtualObject();

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="secondary"
          className="flex min-w-0 shrink-0 items-center gap-[0.7ch] rounded-lg bg-white/25 px-1.5 py-1 text-xs text-zinc-50 hover:bg-white/30 pressed:bg-white/30"
        >
          <span className="shrink-0 whitespace-nowrap">
            {virtualObjects.includes(serviceParam)
              ? 'Virtual Object'
              : workflows.includes(serviceParam)
                ? 'Workflow'
                : 'Service'}
          </span>
          <span className="font-mono">is</span>
          <span className="truncate font-semibold">{serviceParam}</span>
          <Icon
            name={IconName.ChevronsUpDown}
            className="ml-2 h-3.5 w-3.5 shrink-0"
          />
        </Button>
      </DropdownTrigger>
      <DropdownPopover placement="top">
        {virtualObjects.length > 0 && (
          <DropdownSection title="Virtual Objects">
            <DropdownMenu
              selectable
              selectedItems={[serviceParam]}
              onSelect={(value) =>
                localStorage.setItem('state_last_service', value)
              }
            >
              {virtualObjects.map((service) => (
                <DropDownVirtualObject service={service} key={service} />
              ))}
            </DropdownMenu>
          </DropdownSection>
        )}
        {workflows.length > 0 && (
          <DropdownSection title="Workflows">
            <DropdownMenu
              selectable
              selectedItems={[serviceParam]}
              onSelect={(value) =>
                localStorage.setItem('state_last_service', value)
              }
            >
              {workflows.map((service) => (
                <DropDownVirtualObject service={service} key={service} />
              ))}
            </DropdownMenu>
          </DropdownSection>
        )}
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
