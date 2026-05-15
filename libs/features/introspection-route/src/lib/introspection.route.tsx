import { useSqlQuery } from '@restate/data-access/admin-api-hooks';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { PanelTable, PanelTableColumn } from '@restate/ui/table';
import { formatDurations } from '@restate/util/intl';
import {
  SnapshotTimeProvider,
  useDurationSinceLastSnapshot,
} from '@restate/util/snapshot-time';
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { RouterProvider } from 'react-aria';
import { useSearchParams } from 'react-router';
import { IntrospectionCell } from './IntrospectionCell';
import { Link } from '@restate/ui/link';
import { HoverTooltip } from '@restate/ui/tooltip';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
} from '@restate/ui/content-panel';
import { useQueryClient } from '@tanstack/react-query';
import { Toolbar } from './Toolbar';

const QUERY_PARAM = 'query';
const PAGE_SIZE = 30;

function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get(QUERY_PARAM) ?? '';
  const { isFetching, data, dataUpdatedAt, error, errorUpdatedAt, isPending } =
    useSqlQuery(query, {
      enabled: Boolean(query),
      refetchOnMount: false,
    });
  const queryCLient = useQueryClient();

  const dataUpdate = error ? errorUpdatedAt : dataUpdatedAt;

  const setQuery = useCallback(
    (query: string) => {
      queryCLient.removeQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === '/query' &&
          q.meta?.['query-health-check'] !== true,
      });
      setSearchParams((old) => {
        const searchParams = new URLSearchParams(old);
        if (query) {
          searchParams.set(QUERY_PARAM, query);
        } else {
          searchParams.delete(QUERY_PARAM);
        }
        return searchParams;
      });
    },
    [queryCLient, setSearchParams],
  );

  const [, startTransition] = useTransition();
  const [pageIndex, _setPageIndex] = useState(0);

  const setPageIndex = useCallback(
    (arg: Parameters<typeof _setPageIndex>[0]) => {
      startTransition(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
        _setPageIndex(arg);
      });
    },
    [],
  );

  const sortedItems = useMemo(() => {
    return (data?.rows ?? []).map((row, index) => ({ row, id: index }));
  }, [data?.rows]);

  const currentPageItems = useMemo(() => {
    return sortedItems.slice(
      pageIndex * PAGE_SIZE,
      (pageIndex + 1) * PAGE_SIZE,
    );
  }, [pageIndex, sortedItems]);

  useEffect(() => {
    if (sortedItems.length <= PAGE_SIZE * pageIndex) {
      setPageIndex(0);
    }
  }, [pageIndex, setPageIndex, sortedItems.length]);

  const allColumns = useMemo(() => {
    return new Set(data?.rows?.map((row) => Object.keys(row)).flat());
  }, [data?.rows]);

  const selectedColumnsArray = useMemo(() => {
    const cols = Array.from(allColumns).map((id, index) => ({
      name: id,
      id: String(id),
      isRowHeader: index === 0,
    }));
    if (cols.length === 0) {
      cols.push({
        id: '__actions__',
        name: '',
        isRowHeader: true,
      });
    }
    return cols;
  }, [allColumns]);

  const totalSize = Math.ceil((data?.rows ?? []).length / PAGE_SIZE);

  const panelColumns = useMemo<PanelTableColumn[]>(
    () =>
      selectedColumnsArray.map((col) => ({
        id: col.id,
        name: col.name,
        isRowHeader: col.isRowHeader,
        allowsSorting: false,
        minWidth: 100,
      })),
    [selectedColumnsArray],
  );

  const panelItems = useMemo(
    () => currentPageItems.map(({ row, id }) => ({ id: String(id), row })),
    [currentPageItems],
  );

  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdate}>
      <ContentPanel>
        <ContentPanelBody className="pb-32">
          <ContentPanelSection flush>
            <PanelTable
              aria-label="Introspection SQL"
              columns={panelColumns}
              items={panelItems}
              bodyDependencies={[allColumns, pageIndex]}
              isLoading={isPending && !!query}
              error={error}
              emptyPlaceholder={
                query ? (
                  <div className="flex flex-col items-center gap-4 py-14">
                    <div className="mr-1.5 h-12 w-12 shrink-0 rounded-xl bg-gray-200/50 p-1">
                      <Icon
                        name={IconName.ScanSearch}
                        className="h-full w-full p-1 text-zinc-400"
                      />
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-400">
                      No results found
                    </h3>
                  </div>
                ) : (
                  <div className="relative my-12 flex w-full flex-col items-center gap-2 text-center">
                    <Icon
                      name={IconName.ScanSearch}
                      className="h-8 w-8 text-gray-500"
                    />
                    <h3 className="text-sm font-semibold text-gray-600">
                      Introspection SQL
                    </h3>
                    <p className="max-w-lg px-4 text-sm text-gray-500">
                      Restate exposes information on invocations and application
                      state via Introspection SQL. You can use this to gain
                      insight into the status of invocations and the service
                      state that is stored.{' '}
                      <Link
                        href="https://docs.restate.dev/references/sql-introspection"
                        variant="secondary"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Learn more
                      </Link>
                    </p>
                  </div>
                )
              }
              rowClassName="bg-transparent [content-visibility:auto] [&:has(td[role=rowheader]_a[data-invocation-selected='true'])]:bg-blue-50"
              rowDependencies={[panelColumns]}
              renderCell={(item, { id }) => (
                <IntrospectionCell col={id} row={item.row} key={id} />
              )}
            />
            <Footnote
              data={data}
              isFetching={isFetching}
              key={dataUpdate}
              query={query}
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
          </ContentPanelSection>
        </ContentPanelBody>
      </ContentPanel>
      <Toolbar
        setQuery={setQuery}
        isPending={isFetching}
        initialQuery={searchParams.get(QUERY_PARAM) ?? ''}
      />
    </SnapshotTimeProvider>
  );
}

function Footnote({
  data,
  isFetching,
  children,
  query,
}: PropsWithChildren<{
  isFetching: boolean;
  data?: ReturnType<typeof useSqlQuery>['data'];
  query?: string;
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
    <div className="flex w-full flex-row-reverse flex-wrap items-center gap-2 pt-3 pr-4 pb-2 pl-2 text-center text-xs text-gray-500/80">
      {data && (
        <div className="ml-auto">
          {data.rows && data.rows.length > 0 ? (
            <>
              <span className="font-medium text-gray-500">
                {data.rows.length}
              </span>{' '}
              results
            </>
          ) : (
            'No results found'
          )}{' '}
          as of{' '}
          <span className="font-medium text-gray-500">{duration} ago</span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <Download
          data={data}
          query={query}
          className="block rounded-md bg-zinc-50 px-1.5 py-1.5 text-gray-600"
        />
        {children}
      </div>
    </div>
  );
}

function Download({
  data,
  className,
  query,
}: {
  data?: ReturnType<typeof useSqlQuery>['data'];
  className?: string;
  query?: string;
}) {
  const [href, setHref] = useState('');

  useEffect(() => {
    let href: string;
    if (data) {
      // Convert JSON data to a string
      const jsonString = JSON.stringify({ ...data, query }, null, 2);

      // Create a Blob from the JSON string
      const blob = new Blob([jsonString], { type: 'application/json' });
      href = URL.createObjectURL(blob);
      setHref(href);
    }

    return () => {
      if (href) {
        URL.revokeObjectURL(href);
      }
    };
  }, [data, query]);

  if (!data) {
    return null;
  }

  return (
    // TODO
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    <RouterProvider navigate={() => {}}>
      <HoverTooltip content="Download">
        <Link
          href={href}
          download="data.json"
          variant="secondary-button"
          className={className}
        >
          <Icon name={IconName.Download} className="h-4 w-4" />
        </Link>
      </HoverTooltip>
    </RouterProvider>
  );
}

export const introspection = { Component };
