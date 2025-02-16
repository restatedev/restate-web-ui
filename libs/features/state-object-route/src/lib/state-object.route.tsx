import {
  FilterItem,
  useGetVirtualObjectStateInterface,
  useListDeployments,
  useListServices,
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
import { useCollator } from 'react-aria';
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
  PropsWithChildren,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
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
import { Form, useNavigate, useParams, useSearchParams } from 'react-router';
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
} from '@restate/ui/popover';
import { Value } from '@restate/features/invocation-route';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { EditState, EditStateTrigger } from './EditState';

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

function Component() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { virtualObject } = useParams<{ virtualObject: string }>();
  invariant(virtualObject, 'Missing virtualObject param');

  const { data: stateInterface } =
    useGetVirtualObjectStateInterface(virtualObject);

  const keys = useMemo(
    () => stateInterface?.keys?.map(({ name }) => name).sort() ?? [],
    [stateInterface?.keys]
  );

  const schema = useMemo(() => {
    return [
      {
        id: 'service_key',
        label: 'Key',
        operations: [{ value: 'EQUALS', label: 'is' }],
        type: 'STRING',
      },
      ...keys.map(
        (key) =>
          ({
            id: key,
            label: key,
            operations: [
              // TODO: add is null/ is not null
              { value: 'EQUALS', label: 'is' },
              { value: 'NOT_EQUALS', label: 'is not' },
              { value: 'CONTAINS', label: 'contains' },
              { value: 'NOT_CONTAINS', label: 'does not contain' },
            ],
            type: 'STRING',
          } as QueryClauseSchema<QueryClauseType>)
      ),
    ] satisfies QueryClauseSchema<QueryClauseType>[];
  }, [keys]);

  const sortDescriptor: SortDescriptor = {
    column: searchParams.get('sort_col') ?? 'service_key',
    direction:
      (searchParams.get('sort_dir') as SortDescriptor['direction']) ??
      'descending',
  };
  const setSortDescriptor = useCallback(
    (sort: SortDescriptor) => {
      setSearchParams((old) => {
        const newParams = new URLSearchParams(old);
        newParams.set('sort_col', String(sort.column));
        newParams.set('sort_dir', sort.direction);
        newParams.set('page', '0');
        return newParams;
      });
    },
    [setSearchParams]
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
          sortDescriptor.column,
          ...keys.slice(0, 6),
        ]);
      }
      return old;
    });
  }, [keys, sortDescriptor.column]);

  const queryCLient = useQueryClient();
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

  const query = useQueryBuilder(getQuery(searchParams, schema));
  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    queryRef.current.remove(...queryRef.current.items.map((item) => item.id));
    const query = getQuery(searchParams, schema);
    queryRef.current.append(...query);

    setQueryFilters(
      query
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
  }, [schema]);

  const pageIndex = Number(searchParams.get('page') ?? 0);
  const setPageIndex = useCallback(
    (page: number) => {
      setSearchParams((old) => {
        const newParams = new URLSearchParams(old);
        newParams.set('page', String(page));
        return newParams;
      });
    },
    [setSearchParams]
  );

  const { dataUpdatedAt, error, data, isFetching, isPending, queryKey } =
    useQueryVirtualObjectState(
      virtualObject,
      pageIndex,
      {
        field: String(sortDescriptor.column),
        order: sortDescriptor.direction === 'ascending' ? 'ASC' : 'DESC',
      },
      queryFilters,
      {
        refetchOnMount: true,
        refetchOnReconnect: false,
        staleTime: 0,
      }
    );

  useEffect(() => {
    if (data && data.objects.length === 0 && pageIndex !== 0) {
      setPageIndex(0);
    }
  }, [data, pageIndex, setPageIndex]);

  const collator = useCollator();

  const sortedItems = useMemo(() => {
    return (
      [...(data?.objects ?? [])]
        .map((row) => {
          return {
            key: row.key,
            state: row.state?.reduce(
              (p, c) => ({ ...p, [c.name]: c.value }),
              {} as Record<string, string>
            ),
          };
        })
        .sort((a, b) => {
          let cmp = 0;

          cmp = collator.compare(
            a.state?.[sortDescriptor?.column]?.toString() ?? '',
            b.state?.[sortDescriptor?.column]?.toString() ?? ''
          );

          // Flip the direction if descending order is specified.
          if (sortDescriptor?.direction === 'descending') {
            cmp *= -1;
          }

          return cmp;
        }) ?? []
    );
  }, [
    collator,
    data?.objects,
    sortDescriptor?.column,
    sortDescriptor?.direction,
  ]);

  const selectedColumnsArray = useMemo(() => {
    const cols = Array.from(selectedColumns).map((id, index) => ({
      name: id === 'service_key' ? 'Key' : id,
      id: String(id),
      isRowHeader: index === 0,
    }));
    cols.push({
      id: '__actions__',
      name: 'Actions',
      isRowHeader: false,
    });
    return cols;
  }, [selectedColumns]);

  const totalSize = Math.ceil((data?.total_count ?? 0) / STATE_PAGE_SIZE);

  const [editState, setEditState] = useState<{
    isEditing: boolean;
    key?: string;
    objectKey?: string;
  }>({ isEditing: false, key: undefined, objectKey: undefined });

  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
      <EditState
        service={virtualObject}
        objectKey={editState.objectKey!}
        stateKey={editState.key}
        isOpen={editState.isEditing}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditState((s) => ({ ...s, isEditing: false }));
          }
        }}
      />
      <div className="flex flex-col flex-auto gap-2 relative">
        <Table
          aria-label="Invocations"
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
        >
          <TableHeader columns={selectedColumnsArray}>
            {(col) => {
              if (col.id === '__actions__') {
                return (
                  <Column id={col.id} width={40}>
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
                            {keys.map((key) => (
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
                  allowsSorting
                  key={col.id}
                >
                  {col.name}
                </Column>
              );
            }}
          </TableHeader>
          <TableBody
            numOfRows={pageIndex === 0 ? undefined : STATE_PAGE_SIZE}
            items={sortedItems}
            dependencies={[selectedColumnsArray, pageIndex]}
            error={error}
            isLoading={isPending}
            numOfColumns={selectedColumnsArray.length}
            emptyPlaceholder={
              <div className="flex flex-col items-center py-14 gap-4">
                <div className="mr-1.5 shrink-0 h-12 w-12 p-1 bg-gray-200/50  rounded-xl">
                  <Icon
                    name={IconName.Database}
                    className="w-full h-full text-zinc-400 p-1"
                  />
                </div>
                <h3 className="text-sm font-semibold text-zinc-400">
                  No object found
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
                          <TruncateWithTooltip>{row.key}</TruncateWithTooltip>
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
                          className="[&:has(*:hover)_*]:visible [&:has(*:focus)_*]:visible"
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
                                })
                              }
                              variant="icon"
                              className="shrink-0 invisible"
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
        <Footnote data={data} isFetching={isFetching}>
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
            newSearchParams.sort();
            const sortedOldSearchParams = new URLSearchParams(searchParams);
            sortedOldSearchParams.sort();

            if (
              sortedOldSearchParams.toString() !== newSearchParams.toString()
            ) {
              newSearchParams.set('page', '0');
            }
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
                    } as FilterItem)
                )
            );
            await queryCLient.invalidateQueries({ queryKey });
          }}
        >
          <QueryBuilder query={query} schema={schema} key={virtualObject}>
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
          {data.total_count ? (
            <>
              <span>{data.objects.length}</span>
              {' of '}
              <span className="font-medium text-gray-500">
                {data.total_count}
              </span>{' '}
              objects
            </>
          ) : (
            'No object found'
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
  const { data } = useListServices(services);
  const virtualObjects = Array.from(data.values() ?? [])
    .filter((service) => service.ty === 'VirtualObject')
    .map((service) => service.name);
  const navigate = useNavigate();

  useEffect(() => {
    const virtualObjects = Array.from(data.values() ?? [])
      .filter((service) => service.ty === 'VirtualObject')
      .map((service) => service.name);
    if (data && !virtualObjects.includes(virtualObject)) {
      const newVirtualObject = virtualObjects[0];
      navigate(newVirtualObject ? `/state/${newVirtualObject}` : '/state');
    }
  }, [data, navigate, virtualObject]);

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
              <DropdownItem
                value={service}
                key={service}
                href={`/state/${service}`}
              >
                {service}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}

export const virtualObject = { Component };
