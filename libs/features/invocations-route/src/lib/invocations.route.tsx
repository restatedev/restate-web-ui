import { Button, SubmitButton } from '@restate/ui/button';
import { Column, Row, Table, TableBody, TableHeader } from '@restate/ui/table';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import {
  COLUMN_NAMES,
  COLUMN_QUERY_PREFIX,
  ColumnKey,
  isColumnValid,
  setDefaultColumns,
  useColumns,
} from './columns';
import { InvocationCell } from './cells';
import {
  SnapshotTimeProvider,
  useDurationSinceLastSnapshot,
} from '@restate/util/snapshot-time';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { useSubmitShortcut, SubmitShortcutKey } from '@restate/ui/keyboard';
import { formatDurations, formatNumber } from '@restate/util/intl';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { AddQueryTrigger, QueryBuilder } from '@restate/ui/query-builder';
import { ClauseChip, FiltersTrigger } from './Filters';
import {
  ClientLoaderFunctionArgs,
  Form,
  redirect,
  ShouldRevalidateFunctionArgs,
  useNavigate,
  useSearchParams,
} from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useListInvocations } from '@restate/data-access/admin-api-hooks';
import { useRestateContext } from '@restate/features/restate-context';
import { useBatchOperations } from '@restate/features/batch-operations';
import { Badge } from '@restate/ui/badge';
import { Sort } from './QueryButton';
import {
  FILTER_QUERY_PREFIX,
  isSortValid,
  setDefaultSort,
  SORT_QUERY_PREFIX,
  useInvocationsQueryFilters,
} from './useInvocationsQueryFilters';
import { Key } from 'react-aria';
import { FilterShortcuts } from './FilterShortcuts';

const COLUMN_WIDTH: Partial<Record<ColumnKey, number>> = {
  id: 170,
  created_at: 100,
  modified_at: 110,
  deployment: 220,
  journal_size: 180,
  pinned_service_protocol_version: 80,
};
const MIN_COLUMN_WIDTH: Partial<Record<ColumnKey, number>> = {
  status: 200,
  target: 200,
  invoked_by: 100,
};
const MAX_COLUMN_WIDTH: Partial<Record<ColumnKey, number>> = {
  invoked_by: 180,
};

function saveQueryForNextVisit(savedSearchParams: URLSearchParams) {
  Array.from(savedSearchParams.keys()).forEach((key) => {
    if (
      !key.startsWith(FILTER_QUERY_PREFIX) &&
      !key.startsWith(SORT_QUERY_PREFIX) &&
      !key.startsWith(COLUMN_QUERY_PREFIX)
    ) {
      savedSearchParams.delete(key);
    }
  });
  sessionStorage.setItem('query', savedSearchParams.toString());
}

const PAGE_SIZE = 30;
function Component() {
  const [searchParams] = useSearchParams();
  const { selectedColumns, setSelectedColumns, sortedColumnsList } =
    useColumns();
  const queryCLient = useQueryClient();
  const submitRef = useSubmitShortcut();
  const {
    schema,
    listInvocationsParameters,
    query,
    commitQuery,
    pageIndex,
    setPageIndex,
    sortParams,
    setSortParams,
  } = useInvocationsQueryFilters(selectedColumns);

  const {
    dataUpdatedAt,
    errorUpdatedAt,
    error,
    data,
    isFetching,
    isPending,
    queryKey,
  } = useListInvocations(listInvocationsParameters, {
    refetchOnMount: true,
    refetchOnReconnect: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const dataUpdate = error ? errorUpdatedAt : dataUpdatedAt;

  const [selectedInvocationIds, setSelectedInvocationIds] = useState<
    Set<string>
  >(new Set());

  const currentPageItems = useMemo(() => {
    return (
      data?.rows?.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE) ??
      []
    );
  }, [pageIndex, data?.rows]);

  // TODO
  useEffect(() => {
    if (Number(data?.rows?.length) <= PAGE_SIZE * pageIndex) {
      setPageIndex(0);
    }
  }, [pageIndex, setPageIndex, data?.rows?.length]);

  const totalSize = Math.ceil((data?.rows ?? []).length / PAGE_SIZE);
  const hash = 'hash' + currentPageItems.map(({ id }) => id).join('');

  const { OnboardingGuide } = useRestateContext();
  const {
    batchPurge,
    batchResume,
    batchCancel,
    batchKill,
    batchPause,
    batchRestartAsNew,
  } = useBatchOperations();

  useEffect(() => {
    setSelectedInvocationIds(new Set());
  }, [isFetching, pageIndex]);

  const navigate = useNavigate();
  const { baseUrl } = useRestateContext();

  useEffect(() => {
    saveQueryForNextVisit(new URLSearchParams(window.location.search));
  }, [searchParams]);

  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdate}>
      <div className="relative flex flex-auto flex-col gap-2">
        <div className="ml-auto flex items-center gap-1.5 pr-1.5">
          <Dropdown>
            <DropdownTrigger>
              <Button
                variant="secondary"
                className="flex items-center gap-1.5 self-end rounded-lg p-0.5 px-2 text-0.5xs"
              >
                <Icon
                  name={IconName.TableProperties}
                  className="aspect-square h-3.5 w-3.5 opacity-70"
                />
                Columns
              </Button>
            </DropdownTrigger>
            <DropdownPopover>
              <DropdownSection title="Columns">
                <DropdownMenu
                  multiple
                  selectable
                  selectedItems={selectedColumns}
                  onSelect={setSelectedColumns}
                >
                  {Object.entries(COLUMN_NAMES)
                    .filter(([key]) => key !== 'actions')
                    .map(([key, name]) => (
                      <DropdownItem key={key} value={key}>
                        {name}
                      </DropdownItem>
                    ))}
                </DropdownMenu>
              </DropdownSection>
            </DropdownPopover>
          </Dropdown>
          <Dropdown>
            <DropdownTrigger>
              <Button
                variant={
                  selectedInvocationIds.size > 0 ? 'primary' : 'secondary'
                }
                className="flex items-center gap-1.5 self-end rounded-lg p-0.5 px-2 text-0.5xs"
              >
                Actions
                {Boolean(selectedInvocationIds.size || data?.total_count) && (
                  <Badge
                    size="xs"
                    variant={
                      selectedInvocationIds.size > 0 ? 'default' : 'info'
                    }
                  >
                    {selectedInvocationIds.size
                      ? `${selectedInvocationIds.size}`
                      : data?.total_count
                        ? `${formatNumber(data?.total_count, data?.total_count_lower_bound)}${data?.total_count_lower_bound ? '+' : ''}`
                        : ''}
                  </Badge>
                )}
                <Icon
                  name={IconName.ChevronsUpDown}
                  className="aspect-square h-3.5 w-3.5 opacity-80"
                />
              </Button>
            </DropdownTrigger>
            <DropdownPopover>
              <DropdownSection
                title={
                  <div>
                    {selectedInvocationIds.size ? (
                      <span>
                        Actions{' '}
                        <span className="font-normal opacity-90">
                          on {selectedInvocationIds.size} selected items
                        </span>
                      </span>
                    ) : data?.total_count ? (
                      <span>
                        Actions{' '}
                        <span className="font-normal opacity-90">
                          on all{' '}
                          {formatNumber(
                            data?.total_count,
                            data?.total_count_lower_bound,
                          )}
                          {data?.total_count_lower_bound ? '+' : ''} results
                        </span>
                      </span>
                    ) : (
                      'Actions'
                    )}
                  </div>
                }
              >
                <DropdownMenu
                  selectable
                  selectedItems={selectedColumns}
                  onSelect={(key) => {
                    const args =
                      selectedInvocationIds.size > 0
                        ? {
                            invocationIds: Array.from(
                              selectedInvocationIds.values(),
                            ),
                          }
                        : // TODO
                          { filters: listInvocationsParameters.filters || [] };
                    switch (key) {
                      case 'cancel': {
                        return batchCancel(args, schema);
                      }
                      case 'kill': {
                        return batchKill(args, schema);
                      }
                      case 'pause': {
                        return batchPause(args, schema);
                      }
                      case 'resume': {
                        return batchResume(args, schema);
                      }
                      case 'purge': {
                        return batchPurge(args, schema);
                      }
                      case 'restart-as-new': {
                        return batchRestartAsNew(args, schema);
                      }

                      default:
                        break;
                    }
                  }}
                >
                  <DropdownItem value="cancel" destructive>
                    <Icon
                      name={IconName.Cancel}
                      className="h-3.5 w-3.5 shrink-0 opacity-80"
                    />
                    Cancel…
                  </DropdownItem>

                  <DropdownItem value="pause" destructive>
                    <Icon
                      name={IconName.Pause}
                      className="h-3.5 w-3.5 shrink-0 opacity-80"
                    />
                    Pause…
                  </DropdownItem>
                  <DropdownItem value="resume">
                    <Icon
                      name={IconName.Play}
                      className="h-3.5 w-3.5 shrink-0 opacity-80"
                    />
                    Resume…
                  </DropdownItem>
                  <DropdownItem value="restart-as-new">
                    <Icon
                      name={IconName.Restart}
                      className="h-3.5 w-3.5 shrink-0 opacity-80"
                    />
                    Restart as new…
                  </DropdownItem>
                  <DropdownItem value="kill" destructive>
                    <Icon
                      name={IconName.Kill}
                      className="h-3.5 w-3.5 shrink-0 opacity-80"
                    />
                    Kill…
                  </DropdownItem>
                  <DropdownItem value="purge" destructive>
                    <Icon
                      name={IconName.Trash}
                      className="h-3.5 w-3.5 shrink-0 opacity-80"
                    />
                    Purge…
                  </DropdownItem>
                </DropdownMenu>
              </DropdownSection>
            </DropdownPopover>
          </Dropdown>
        </div>
        <Table
          aria-label="Invocations"
          key={hash}
          selectionMode="multiple"
          selectedKeys={selectedInvocationIds}
          onSelectionChange={(keys) => {
            if (keys === 'all') {
              setSelectedInvocationIds(
                new Set(currentPageItems.map((inv) => inv.id)),
              );
            } else {
              setSelectedInvocationIds(keys as Set<string>);
            }
          }}
          onRowAction={(key) => {
            navigate({
              pathname: `${baseUrl}/invocations/${key}`,
              search: searchParams.toString(),
            });
          }}
        >
          <TableHeader className="[&_th:nth-last-child(2)_[data-resizable-direction]]:invisible">
            {sortedColumnsList.map((col) =>
              col.id !== 'actions' ? (
                <Column
                  id={col.id}
                  isRowHeader={col.isRowHeader}
                  allowsSorting
                  defaultWidth={COLUMN_WIDTH[col.id]}
                  minWidth={MIN_COLUMN_WIDTH[col.id] ?? 80}
                  maxWidth={MAX_COLUMN_WIDTH[col.id]}
                  key={col.id}
                >
                  {col.name}
                </Column>
              ) : (
                <Column
                  id="actions"
                  width={40}
                  key={col.id}
                  className="opacity-0"
                >
                  <span className="sr-only">Actions</span>
                </Column>
              ),
            )}
          </TableHeader>
          <TableBody
            items={currentPageItems}
            dependencies={[selectedColumns, pageIndex]}
            error={error}
            isLoading={isFetching}
            numOfColumns={sortedColumnsList.length}
            numOfRows={currentPageItems.length || 5}
            emptyPlaceholder={
              <div className="flex flex-col items-center gap-4 py-14">
                <div className="mr-1.5 h-12 w-12 shrink-0 rounded-xl bg-gray-200/50 p-1">
                  <Icon
                    name={IconName.Invocation}
                    className="h-full w-full p-1 text-zinc-400"
                  />
                </div>
                <h3 className="text-sm font-semibold text-zinc-400">
                  No invocations found
                </h3>
              </div>
            }
          >
            {(row) => (
              <Row
                id={row.id}
                columns={sortedColumnsList}
                className={`bg-transparent [content-visibility:auto] [&:has(td[role=rowheader]_a[data-invocation-selected='true'])]:bg-blue-50`}
              >
                {({ id }) => {
                  return (
                    <InvocationCell
                      key={id}
                      column={id}
                      invocation={row}
                      isVisible
                    />
                  );
                }}
              </Row>
            )}
          </TableBody>
        </Table>
        <Footnote data={data} isFetching={isFetching} key={dataUpdate}>
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
                onClick={() => setPageIndex((s) => s - 1)}
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
                onClick={() => setPageIndex((s) => s + 1)}
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
        {OnboardingGuide && (
          <OnboardingGuide
            stage="view-invocations"
            service={data?.rows.at(0)?.target_service_name}
          />
        )}
      </div>
      <LayoutOutlet zone={LayoutZone.Toolbar}>
        <Form
          action="/query/invocations"
          method="POST"
          className="relative flex w-[60rem] flex-col"
          onSubmit={async (event) => {
            event.preventDefault();
            commitQuery();
            saveQueryForNextVisit(new URLSearchParams(window.location.search));
            await queryCLient.invalidateQueries({ queryKey });
          }}
        >
          <QueryBuilder
            query={query}
            schema={schema}
            canRemoveItem={canRemoveItem}
            multiple
          >
            <AddQueryTrigger
              MenuTrigger={FiltersTrigger}
              placeholder="Filter invocations…"
              prefix={
                <Sort setSortParams={setSortParams} sortParams={sortParams} />
              }
              title="Filters"
              className="w-full rounded-xl border-transparent pb-8 has-[input[data-focused=true]]:border-blue-500 has-[input[data-focused=true]]:ring-blue-500 [&_input]:min-w-[25ch] [&_input]:placeholder-zinc-400 [&_input+*]:right-24 [&_input::-webkit-search-cancel-button]:invert"
            >
              {ClauseChip}
            </AddQueryTrigger>
          </QueryBuilder>
          <div className="absolute right-0 bottom-0 left-0 flex h-8 w-full overflow-hidden rounded-b-xl mask-[linear-gradient(to_right,transparent_0,black_6px,black_calc(100%-192px),transparent_calc(100%-100px))]">
            <div className="flex items-center gap-2 overflow-auto pb-0.5 pl-1.5 [scrollbar-width:thin]">
              <div className="ml-1 flex h-full shrink-0 items-center text-xs text-white/70">
                Quick Filters:
              </div>
              <FilterShortcuts
                schema={schema}
                setPageIndex={setPageIndex}
                setSortParams={setSortParams}
                query={query}
                setSelectedColumns={setSelectedColumns}
              />
            </div>
          </div>
          <SubmitButton
            ref={submitRef}
            isPending={isFetching}
            className="absolute right-1 bottom-1 flex h-7 items-center gap-2 rounded-lg py-0 pr-0.5 pl-4 disabled:bg-gray-400 disabled:text-gray-200"
          >
            Query
            <SubmitShortcutKey />
          </SubmitButton>
        </Form>
      </LayoutOutlet>
    </SnapshotTimeProvider>
  );
}

function canRemoveItem(key: Key) {
  if (key === 'status' || key === 'target_service_name') {
    return false;
  }
  return true;
}

function Footnote({
  data,
  isFetching,
  children,
}: PropsWithChildren<{
  isFetching: boolean;
  data?: ReturnType<typeof useListInvocations>['data'];
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
          {data.total_count ? (
            <>
              <span>{data.rows.length}</span>
              {' of '}
              <span className="font-medium text-gray-500">
                {data.total_count
                  ? `${formatNumber(data.total_count, data.total_count_lower_bound)}${data.total_count_lower_bound ? '+' : ''}`
                  : ''}
              </span>{' '}
              recently modified invocations
            </>
          ) : (
            'No invocations found'
          )}{' '}
          as of{' '}
          <span className="font-medium text-gray-500">{duration} ago</span>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export const clientLoader = ({ request }: ClientLoaderFunctionArgs) => {
  const url = new URL(request.url);
  let reqSearchParams = new URLSearchParams(url.searchParams);
  reqSearchParams.sort();
  const originalSearch = reqSearchParams.toString();
  const previousSearchParams = new URLSearchParams(
    sessionStorage.getItem('query') || '',
  );
  sessionStorage.removeItem('query');

  Array.from(previousSearchParams.keys()).forEach((key) => {
    reqSearchParams.delete(key);
  });
  previousSearchParams.forEach((value, name) => {
    if (reqSearchParams.has(name)) {
      reqSearchParams.append(name, value);
    } else {
      reqSearchParams.set(name, value);
    }
  });

  if (
    isSortValid(reqSearchParams) &&
    isColumnValid(reqSearchParams) &&
    reqSearchParams.toString() === originalSearch
  ) {
    return;
  }
  if (!isSortValid(reqSearchParams)) {
    reqSearchParams = setDefaultSort(reqSearchParams);
  }
  if (!isColumnValid(reqSearchParams)) {
    reqSearchParams = setDefaultColumns(reqSearchParams);
  }

  return redirect(`?${reqSearchParams.toString()}`);
};

export function shouldRevalidate(arg: ShouldRevalidateFunctionArgs) {
  if (!arg.nextUrl.pathname.endsWith('/invocations')) {
    return false;
  }
  if (
    !isSortValid(arg.nextUrl.searchParams) ||
    !isColumnValid(arg.nextUrl.searchParams)
  ) {
    return true;
  }
  saveQueryForNextVisit(new URLSearchParams(arg.nextUrl.searchParams));
  return false;
}

export const invocations = { Component, clientLoader, shouldRevalidate };
