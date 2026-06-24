import type { FilterItem } from '@restate/data-access/admin-api-spec';
import { useVersion } from '@restate/data-access/admin-api';
import {
  useListVirtualObjectState,
  useQueryVirtualObjectState,
} from '@restate/data-access/admin-api-hooks';
import { Button, SubmitButton } from '@restate/ui/button';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  type ContentPanelTabs,
} from '@restate/ui/content-panel';
import { EmptyState } from '@restate/ui/empty-state';
import { ErrorBanner } from '@restate/ui/error';
import { Icon, IconName } from '@restate/ui/icons';
import {
  SnapshotTimeProvider,
  useDurationSinceLastSnapshot,
} from '@restate/util/snapshot-time';
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useSubmitShortcut, SubmitShortcutKey } from '@restate/ui/keyboard';
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
import { Form, Navigate, useParams, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import invariant from 'tiny-invariant';
import { tv } from '@restate/util/styles';
import {
  ClauseChip,
  FiltersTrigger,
} from '@restate/features/invocations-route';
import { STATE_QUERY_NAME } from './constants';
import { useEditStateContext } from '@restate/features/edit-state';
import { useResolvedCodecOptions } from '@restate/features/codec';
import { toStateParam } from './toStateParam';
import { useRestateContext } from '@restate/features/restate-context';
import { useFeatures } from '@restate/data-access/admin-api';
import { useIsFeatureFlagEnabled } from '@restate/util/feature-flag';
import {
  getStateServiceHref,
  ServiceSelector,
  StateOnlyServiceWarningIcon,
  useValidateVirtualObject,
} from './ServiceSelector';
import { StateObjectTable } from './StateObjectTable';
import { StateStorageBreakdown } from './StateStorageBreakdown';
import type { StateObjectRecord } from './types';

function urlKeyFor(schemaClause: QueryClauseSchema<QueryClauseType>) {
  if (schemaClause.metadata?.isSystem) {
    const column =
      (schemaClause.metadata?.column as string | undefined) ?? schemaClause.id;
    return `sysFilter_${column}`;
  }
  return `filter_${schemaClause.id}`;
}

function urlKeyForClause(clause: QueryClause<QueryClauseType>) {
  return urlKeyFor(clause.schema);
}

function getQuery(
  searchParams: URLSearchParams,
  schema: QueryClauseSchema<QueryClauseType>[],
) {
  return schema
    .filter((schemaClause) => searchParams.get(urlKeyFor(schemaClause)))
    .map((schemaClause) => {
      return QueryClause.fromJSON(
        schemaClause,
        searchParams.get(urlKeyFor(schemaClause)) ?? '',
      );
    });
}

function clausesToFilterArgs(clauses: QueryClause<QueryClauseType>[]): {
  systemFilters: FilterItem[];
  stateFilter?: FilterItem;
} {
  const systemFilters: FilterItem[] = [];
  let stateFilter: FilterItem | undefined;
  for (const clause of clauses) {
    if (!clause.isValid) continue;
    const operation = clause.value.operation;
    if (!operation) continue;
    const column = clause.schema.metadata?.column as string | undefined;
    const filter = {
      field: column ?? clause.fieldValue,
      operation,
      type: clause.type === 'CUSTOM_STRING' ? 'STRING' : clause.type,
      value: clause.value.value,
    } as FilterItem;
    if (clause.schema.metadata?.isSystem) {
      systemFilters.push(filter);
    } else {
      stateFilter = filter;
    }
  }
  return { systemFilters, stateFilter };
}

const STATE_PAGE_SIZE = 30;
const MAX_VISIBLE_STATE_SERVICE_TABS = 5;
const CUSTOM_KEY_ID = `__rs-state-key__`;

const stateRouteStyles = tv({
  base: 'relative flex min-h-0 flex-1 flex-col',
  variants: {
    hasStorageBreakdown: {
      true: 'gap-4 pt-20',
      false: '',
    },
  },
});

function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const submitRef = useSubmitShortcut();

  const { virtualObject: serviceName } = useParams<{
    virtualObject: string;
  }>();
  invariant(serviceName, 'Missing virtualObject param');
  const {
    isValid,
    isValidating,
    redirectTo,
    services,
    serviceType,
    stateOnlyServices,
  } = useValidateVirtualObject(serviceName);
  const isWorkflow = serviceType === 'workflow';
  const { baseUrl } = useRestateContext();
  const showStateStorage = useIsFeatureFlagEnabled(
    'FEATURE_STATE_STORAGE_BREAKDOWN',
  );

  const [keysSet, setKeysSet] = useState(
    () =>
      new Set(
        Array.from(new URLSearchParams(window.location.search).keys())
          .filter((key) => key.startsWith('filter_'))
          .map((key) => key.replace(/^filter_/, '')),
      ),
  );

  const { isSuccess: versionReady } = useVersion();
  const hasVqueues = useFeatures().has('vqueues');
  const hasScopeInUrl = searchParams.has('sysFilter_scope');
  const exposesScope = hasVqueues && serviceType !== 'virtual_object';
  const schema = useMemo(() => {
    const stringOps = [
      // TODO: add is null/ is not null
      { value: 'EQUALS' as const, label: 'is' },
      { value: 'NOT_EQUALS' as const, label: 'is not' },
      { value: 'CONTAINS' as const, label: 'contains' },
      { value: 'NOT_CONTAINS' as const, label: 'does not contain' },
    ];
    const clauses: QueryClauseSchema<QueryClauseType>[] = [];
    clauses.push({
      id: '__sys_service_key',
      label: `${serviceName} (Key)`,
      operations: stringOps,
      type: 'STRING',
      metadata: { isSystem: true, column: 'service_key' },
    });
    if (exposesScope || hasScopeInUrl) {
      clauses.push({
        id: '__sys_service_scope',
        label: 'Scope',
        operations: stringOps,
        type: 'STRING',
        metadata: { isSystem: true, column: 'scope' },
      });
    }
    Array.from(keysSet.values()).forEach((key) => {
      clauses.push({
        id: key,
        label: key,
        operations: stringOps,
        type: 'STRING',
      });
    });
    clauses.push({
      id: CUSTOM_KEY_ID,
      operations: stringOps,
      type: 'CUSTOM_STRING',
    } as QueryClauseSchema<QueryClauseType>);
    return clauses;
  }, [keysSet, serviceName, exposesScope, hasScopeInUrl]);

  const queryFilters = useMemo(
    () => clausesToFilterArgs(getQuery(searchParams, schema)),
    [searchParams, schema],
  );
  const {
    dataUpdatedAt,
    errorUpdatedAt,
    error,
    data: serviceKeysData,
    isFetching,
    queryKey,
  } = useQueryVirtualObjectState(serviceName, queryFilters, serviceType, {
    refetchOnMount: true,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: 0,
    enabled: isValid,
  });

  const allItems = useMemo<{ key: string; scope?: string }[]>(() => {
    if (error) return [];
    if (!serviceKeysData) return [];
    if ('items' in serviceKeysData) return serviceKeysData.items;
    return serviceKeysData.keys.map((key) => ({ key }));
  }, [serviceKeysData, error]);
  const [pageIndex, _setPageIndex] = useState(0);
  const currentPageItems = useMemo(() => {
    return allItems
      .slice()
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(pageIndex * STATE_PAGE_SIZE, (pageIndex + 1) * STATE_PAGE_SIZE);
  }, [pageIndex, allItems]);
  const listStateArgs = useMemo(
    () =>
      hasVqueues
        ? { items: currentPageItems }
        : { keys: currentPageItems.map((item) => item.key) },
    [currentPageItems, hasVqueues],
  );
  const listObjects = useListVirtualObjectState(
    serviceName,
    listStateArgs,
    serviceType,
    {
      refetchOnMount: true,
      refetchOnReconnect: false,
      staleTime: 0,
      refetchOnWindowFocus: false,
    },
  );

  const stateObjects = useMemo<StateObjectRecord[]>(() => {
    if (listObjects.error) return [];
    return (
      listObjects.data?.objects.map((obj) => ({
        ...obj,
        id: `${obj.key ?? ''}\x00${obj.scope ?? ''}`,
      })) ?? []
    );
  }, [listObjects.data, listObjects.error]);

  useEffect(() => {
    if (!isFetching && listObjects.data !== undefined) {
      const keys = listObjects.data.objects
        .map((obj) => obj.state.map(({ name }) => name))
        .flat();
      setKeysSet((s) => {
        const next = new Set(
          [
            ...Array.from(s.values()).filter((v) => keys.includes(v)),
            ...keys,
          ].sort(),
        );
        if (next.size === s.size && [...next].every((v) => s.has(v))) {
          return s;
        }
        return next;
      });
    }
  }, [listObjects.data, isFetching]);

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

  const queryCLient = useQueryClient();

  const query = useQueryBuilder(getQuery(searchParams, schema), !versionReady);
  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  });

  const totalSize = Math.ceil(allItems.length / STATE_PAGE_SIZE);
  const dataUpdate = error ? errorUpdatedAt : dataUpdatedAt;
  const setEditState = useEditStateContext();

  useEffect(() => {
    if (allItems.length <= STATE_PAGE_SIZE * pageIndex) {
      setPageIndex(0);
    }
  }, [pageIndex, allItems, setPageIndex]);
  const stateError = error || listObjects.error;
  const hasActiveFilters = Array.from(searchParams.keys()).some(
    (key) => key.startsWith('filter_') || key.startsWith('sysFilter_'),
  );
  const serviceCodecOptions = useMemo(
    () =>
      serviceType
        ? {
            service: { value: { name: serviceName } },
          }
        : undefined,
    [serviceName, serviceType],
  );
  const resolvedServiceCodecOptions = useResolvedCodecOptions(
    serviceCodecOptions,
  );
  const isStateLoading =
    isFetching ||
    isValidating ||
    (listObjects.isFetching && currentPageItems.length !== 0);
  const openStatePanel = useCallback(
    (rowKey: string, rowScope?: string) => {
      setSearchParams(
        (old) => {
          old.set(
            STATE_QUERY_NAME,
            toStateParam({
              key: rowKey,
              virtualObject: serviceName,
              scope: rowScope || undefined,
            }),
          );
          old.set('panel', STATE_QUERY_NAME);
          return old;
        },
        { preventScrollReset: true },
      );
    },
    [serviceName, setSearchParams],
  );
  const serviceTabs = useMemo<ContentPanelTabs>(
    () => ({
      items: services.map((service) => ({
        id: service,
        label: (
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className="truncate [[role=tab]_&]:max-w-[12ch]"
              title={service}
            >
              {service}
            </span>
            {stateOnlyServices.includes(service) && (
              <StateOnlyServiceWarningIcon />
            )}
          </span>
        ),
        href: getStateServiceHref({ baseUrl, service, searchParams }),
      })),
      maxVisible: MAX_VISIBLE_STATE_SERVICE_TABS,
      selectedId: serviceName,
      onSelect: (service) =>
        localStorage.setItem('state_last_service', service),
    }),
    [baseUrl, searchParams, serviceName, services, stateOnlyServices],
  );

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdate}>
      <div
        className={stateRouteStyles({
          hasStorageBreakdown: showStateStorage,
        })}
      >
        {showStateStorage && (
          <div className="mx-auto flex w-full max-w-3xl flex-col items-stretch gap-2 px-4">
            <StateStorageBreakdown />
          </div>
        )}
        <ContentPanel tabs={serviceTabs}>
          <ContentPanelBody className="pb-32">
            <ContentPanelSection flush>
              {stateError ? (
                <div className="px-4 py-20">
                  <EmptyState
                    icon={IconName.TriangleAlert}
                    intent="danger"
                    title="Couldn’t load state"
                  >
                    <ErrorBanner
                      error={stateError}
                      className="w-full rounded-xl text-left"
                    />
                  </EmptyState>
                </div>
              ) : stateObjects.length > 0 || isStateLoading ? (
                <StateObjectTable
                  key={serviceName}
                  items={stateObjects}
                  codecOptions={resolvedServiceCodecOptions}
                  serviceName={serviceName}
                  serviceType={serviceType}
                  isLoading={isStateLoading && stateObjects.length === 0}
                  numOfRows={currentPageItems.length || 5}
                  onOpenObject={openStatePanel}
                  onEditObject={(row) =>
                    setEditState({
                      isEditing: true,
                      isDeleting: false,
                      objectKey: row.key,
                      service: serviceName,
                      resolveCodecMetadata: Boolean(serviceType),
                      scope: row.scope,
                    })
                  }
                  onDeleteObject={(row) =>
                    setEditState({
                      isEditing: true,
                      isDeleting: true,
                      objectKey: row.key,
                      service: serviceName,
                      resolveCodecMetadata: Boolean(serviceType),
                      scope: row.scope,
                    })
                  }
                  onEditValue={(row, stateKey) =>
                    setEditState({
                      isEditing: true,
                      isDeleting: false,
                      key: stateKey,
                      objectKey: row.key,
                      service: serviceName,
                      resolveCodecMetadata: Boolean(serviceType),
                      scope: row.scope,
                    })
                  }
                />
              ) : (
                <div className="px-4 py-20">
                  <EmptyState
                    icon={IconName.Database}
                    title="No state found"
                    description={
                      hasActiveFilters
                        ? 'No state matches the current filters. Try adjusting or clearing them.'
                        : isWorkflow
                          ? 'State stored by this Workflow will appear here.'
                          : serviceType === 'virtual_object'
                            ? 'State stored by this Virtual Object will appear here.'
                            : 'State stored by this service will appear here.'
                    }
                  />
                </div>
              )}
              <Footnote
                data={serviceKeysData}
                isFetching={isFetching || listObjects.isFetching}
                key={dataUpdate}
              >
                {!isFetching && !error && totalSize > 1 && (
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
            </ContentPanelSection>
          </ContentPanelBody>
        </ContentPanel>
      </div>
      <LayoutOutlet zone={LayoutZone.Toolbar}>
        <Form
          action={`/query/services/${serviceName}/state`}
          method="POST"
          className="relative flex items-center"
          onSubmit={async (event) => {
            event.preventDefault();

            const newSearchParams = new URLSearchParams(searchParams);
            Array.from(newSearchParams.keys())
              .filter(
                (key) =>
                  key.startsWith('filter_') || key.startsWith('sysFilter_'),
              )
              .forEach((key) => newSearchParams.delete(key));
            query.items
              .filter((clause) => clause.isValid)
              .forEach((item) => {
                newSearchParams.set(urlKeyForClause(item), String(item));
              });
            const sortedNewSearchParams = new URLSearchParams(newSearchParams);
            sortedNewSearchParams.sort();
            const sortedOldSearchParams = new URLSearchParams(searchParams);
            sortedOldSearchParams.sort();

            setSearchParams(newSearchParams, { preventScrollReset: true });
            await queryCLient.invalidateQueries({ queryKey });
            await queryCLient.invalidateQueries({
              predicate: (query) =>
                query.queryKey[0] === `/query/services/${serviceName}/state`,
            });
          }}
        >
          <QueryBuilder
            query={query}
            schema={schema}
            multiple
            key={
              schema
                .map((s) => s.id)
                .sort()
                .join('') + serviceName
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
            ref={submitRef}
            isPending={isFetching}
            className="absolute top-1 right-1 bottom-1 flex items-center gap-2 rounded-lg py-0 pr-1 pl-4 disabled:bg-gray-400 disabled:text-gray-200"
          >
            Query
            <SubmitShortcutKey />
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
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [data]);

  const { isPast, ...parts } = durationSinceLastSnapshot(now);
  const duration = formatDurations(parts);
  const count = data
    ? 'items' in data
      ? data.items.length
      : (data.keys?.length ?? 0)
    : 0;

  return (
    <div className="flex w-full flex-row-reverse flex-wrap items-center gap-2 pt-3 pr-4 pb-2 pl-2 text-center text-xs text-gray-500/80">
      {data && (
        <div className="ml-auto">
          {count > 0 ? (
            <>
              <span className="font-medium text-gray-500">{count}</span> objects
            </>
          ) : (
            'No instances found'
          )}{' '}
          as of{' '}
          <span className="font-medium text-gray-500">{duration} ago</span>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export const virtualObject = { Component };
