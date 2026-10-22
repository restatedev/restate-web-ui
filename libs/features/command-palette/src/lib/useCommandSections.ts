import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  useCanSortInvocationsByTransition,
  useListDeployments,
  useListServices,
} from '@restate/data-access-admin-api-hooks';
import {
  type Deployment,
  type FilterItem,
  type Service,
  getEndpoint,
} from '@restate/data-access-admin-api-spec';
import { useBatchOperations } from '@restate/features-batch-operations';
import { resolveDeploymentEndpoint } from '@restate/features-deployment';
import { useInvocationFilterSchema } from '@restate/features-invocations-route';
import {
  INTROSPECTION_QUERY_PARAM,
  predefinedQueries,
  useQueryHistory,
} from '@restate/features-introspection-route';
import { PRUNE_DRAINED_DEPLOYMENTS_QUERY } from '@restate/features-prune-deployments';
import { REGISTER_DEPLOYMENT_QUERY } from '@restate/features-register-deployment';
import { useRestateContext } from '@restate/features-restate-context';
import { virtualObjectInstanceHref } from '@restate/features-virtual-object-instance';
import {
  createLimitRuleHref,
  limitCountersForRuleHref,
  limitRulesForPatternHref,
} from '@restate/features-vqueue-ui';
import { workflowRunHref } from '@restate/features-workflow-run';
import { IconName } from '@restate/ui-icons';
import { getHrefWithQueryParams } from '@restate/ui-link';
import { ERROR_CODES } from '@restate/util-errors';
import {
  PRESERVED_QUERY_PARAMS,
  deploymentHref,
  panelHref,
  serviceHref,
} from '@restate/util-panel';
import {
  type InvocationPresetDefinition,
  listInvocationPresets,
  useInvocationsLastQuery,
} from '@restate/util-sidebar-nav';
import { matchScore } from './matchScore';
import { normalizeEndpoint, parseInput } from './parseInput';
import type {
  Command,
  CommandPaletteExtension,
  CommandPaletteStep,
  CommandSection,
} from './types';

type SectionId =
  | 'matches'
  | 'actions'
  | 'services'
  | 'handlers'
  | 'deployments'
  | 'pages'
  | 'invocations'
  | 'flowControl'
  | 'recentQueries'
  | 'usefulQueries';

const SECTION_TITLES: Record<SectionId, string> = {
  matches: 'Matches',
  actions: 'Actions',
  services: 'Services',
  handlers: 'Handlers',
  deployments: 'Deployments',
  pages: 'Pages',
  invocations: 'Invocations',
  flowControl: 'Flow control',
  recentQueries: 'Recent queries',
  usefulQueries: 'Useful queries',
};

const SECTION_LIMITS: Record<SectionId, number> = {
  matches: 20,
  actions: 10,
  services: 5,
  handlers: 5,
  deployments: 5,
  pages: 8,
  invocations: 8,
  flowControl: 3,
  recentQueries: 5,
  usefulQueries: 8,
};

const SERVICE_TYPE_LABELS: Record<Service['ty'], string> = {
  Service: 'Service',
  VirtualObject: 'Virtual Object',
  Workflow: 'Workflow',
};

const PRESET_KEYWORDS: Record<string, string[]> = {
  processing: ['active', 'executing'],
  inflight: ['active', 'inflight', 'ongoing'],
  stuck: ['stuck', 'blocked', 'pending', 'paused', 'backing off', 'waiting'],
  all: ['every', 'list'],
  notcompleted: ['open', 'unfinished', 'incomplete'],
  completed: ['done', 'finished', 'succeeded', 'failed'],
  scheduled: ['delayed', 'later', 'future'],
};

type BatchActionId =
  | 'cancel'
  | 'pause'
  | 'resume'
  | 'retry-now'
  | 'restart-as-new'
  | 'kill'
  | 'purge';

const PRESET_BATCH_ACTIONS: Record<string, BatchActionId[]> = {
  processing: ['cancel', 'pause', 'kill'],
  inflight: ['cancel', 'pause', 'kill'],
  stuck: ['cancel', 'resume', 'retry-now', 'kill'],
  notcompleted: ['cancel', 'kill'],
  scheduled: ['cancel', 'kill'],
  completed: ['restart-as-new', 'purge'],
};

const BATCH_ACTIONS: Record<
  BatchActionId,
  { verb: string; icon: IconName; destructive?: boolean }
> = {
  cancel: { verb: 'Cancel', icon: IconName.Cancel, destructive: true },
  pause: { verb: 'Pause', icon: IconName.Pause, destructive: true },
  resume: { verb: 'Resume', icon: IconName.Play },
  'retry-now': { verb: 'Retry now', icon: IconName.RetryNow },
  'restart-as-new': { verb: 'Restart as new', icon: IconName.Restart },
  kill: { verb: 'Kill', icon: IconName.Kill, destructive: true },
  purge: { verb: 'Purge', icon: IconName.Trash, destructive: true },
};

function rank(query: string, commands: Command[], limit: number) {
  return commands
    .map((command) => ({ command, score: matchScore(query, command) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ command }) => command);
}

function presetFilters(preset: InvocationPresetDefinition): FilterItem[] {
  return preset.filters.map(
    (filter) =>
      ({
        type: 'STRING_LIST',
        field: filter.id,
        operation: filter.operation,
        value: filter.value,
      }) as FilterItem,
  );
}

function errorDocsHref(code: string) {
  return `https://docs.restate.dev/references/errors#${code.toLowerCase()}`;
}

function firstLine(text: string) {
  return text.trim().split('\n')[0] ?? '';
}

const EXTENSION_SECTION_LIMIT = 6;
const NO_COMMANDS: Command[] = [];
const NO_SECTIONS: CommandSection[] = [];
const NO_STEPS: CommandPaletteStep[] = [];

function section(id: SectionId, items: Command[]): CommandSection {
  return {
    id,
    title: SECTION_TITLES[id],
    items: items.slice(0, SECTION_LIMITS[id]),
  };
}

function nonEmpty(sections: CommandSection[]) {
  return sections.filter(({ items }) => items.length > 0);
}

function browsable(items: Command[]) {
  return items.filter(({ searchOnly }) => !searchOnly);
}

function browsableSections(sections: CommandSection[]) {
  return sections
    .filter(({ searchOnly }) => !searchOnly)
    .map((browsableSection) => ({
      ...browsableSection,
      items: browsable(browsableSection.items),
    }));
}

function stepSections(step: CommandPaletteStep, query: string) {
  return nonEmpty(
    query
      ? step.sections.map((stepSection) => ({
          ...stepSection,
          items: rank(query, stepSection.items, Infinity),
        }))
      : browsableSections(step.sections),
  );
}

export interface CommandSectionsResult {
  sections: CommandSection[];
  step?: Pick<CommandPaletteStep, 'label' | 'placeholder'>;
}

export function useCommandSections(
  query: string,
  stepId: string | undefined,
  extension: CommandPaletteExtension,
): CommandSectionsResult {
  const { baseUrl, tunnel } = useRestateContext();
  const [searchParams] = useSearchParams();
  const { data: services } = useListServices();
  const { data: deploymentsData } = useListDeployments();
  const { getLastQuery } = useInvocationsLastQuery();
  const queryHistory = useQueryHistory();
  const batch = useBatchOperations();
  const { schema: invocationFilterSchema } = useInvocationFilterSchema();
  const canSortByTransition = useCanSortInvocationsByTransition();
  const hasLastQuery = Boolean(getLastQuery());

  const toPage = useCallback(
    (href: string) =>
      getHrefWithQueryParams({
        preserveQueryParams: PRESERVED_QUERY_PARAMS,
        href,
        searchParams,
      }),
    [searchParams],
  );
  const toHere = useCallback(
    (href: string) =>
      getHrefWithQueryParams({
        preserveQueryParams: true,
        href,
        searchParams,
      }),
    [searchParams],
  );

  const deployments = useMemo(() => {
    return Array.from(deploymentsData?.deployments.values() ?? []).map(
      (deployment: Deployment) => {
        const { endpoint, label, icon } = resolveDeploymentEndpoint(
          deployment,
          tunnel,
        );
        return { deployment, endpoint, label: label ?? deployment.id, icon };
      },
    );
  }, [deploymentsData, tunnel]);

  const catalog = useMemo(() => {
    const serviceList = Array.from(services.values());
    const introspectionHref = (sql: string) =>
      toPage(
        `${baseUrl}/introspection?${new URLSearchParams({ [INTROSPECTION_QUERY_PARAM]: sql })}`,
      );

    const pages: Command[] = [
      {
        id: 'page:overview',
        label: 'Overview',
        icon: IconName.House,
        href: toPage(`${baseUrl}/overview`),
        keywords: ['services', 'home'],
      },
      {
        id: 'page:deployments',
        label: 'Deployments',
        icon: IconName.Http,
        href: toPage(`${baseUrl}/overview?view=deployments`),
        keywords: ['endpoints'],
      },
      {
        id: 'page:workflows',
        label: 'Workflows',
        icon: IconName.Workflow,
        href: toPage(`${baseUrl}/workflows`),
        keywords: ['runs'],
      },
      {
        id: 'page:virtual-objects',
        label: 'Virtual Objects',
        icon: IconName.VirtualObject,
        href: toPage(`${baseUrl}/virtual-objects`),
        keywords: ['objects', 'keys', 'instances'],
      },
      {
        id: 'page:state',
        label: 'State',
        icon: IconName.Database,
        href: toPage(`${baseUrl}/state`),
        keywords: ['storage', 'kv'],
      },
      {
        id: 'page:introspection',
        label: 'Introspection',
        icon: IconName.ScanSearch,
        href: toPage(`${baseUrl}/introspection`),
        keywords: ['sql', 'query'],
      },
      {
        id: 'page:query-stats',
        label: 'Query inspector',
        icon: IconName.Gauge,
        href: toPage(`${baseUrl}/query-stats`),
        keywords: ['query stats', 'performance', 'slow'],
      },
    ];

    const invocationPages: Command[] = [
      ...listInvocationPresets(canSortByTransition).map<Command>((preset) => ({
        id: `page:invocations:${preset.id}`,
        label: preset.label,
        icon: IconName.Invocation,
        href: toPage(`${baseUrl}/invocations?${preset.search}`),
        keywords: ['invocations', ...(PRESET_KEYWORDS[preset.id] ?? [])],
      })),
      ...(hasLastQuery
        ? [
            {
              id: 'page:invocations:last',
              label: 'Last query',
              icon: IconName.History,
              href: toPage(`${baseUrl}/invocations?restore=1`),
              keywords: ['invocations', 'recent', 'previous', 'filters'],
            },
          ]
        : []),
    ];

    const flowControlPages: Command[] = [
      {
        id: 'page:rules',
        label: 'Rules',
        icon: IconName.Filters,
        href: toPage(`${baseUrl}/flow-control/rules`),
        keywords: ['flow control', 'limits', 'concurrency'],
      },
      {
        id: 'page:counters',
        label: 'Limit counters',
        icon: IconName.Gauge,
        href: toPage(`${baseUrl}/flow-control/counters`),
        keywords: ['flow control', 'limits', 'concurrency'],
      },
      {
        id: 'page:vqueues',
        label: 'VQueues',
        icon: IconName.Layers,
        rotateIcon: true,
        href: toPage(`${baseUrl}/flow-control/vqueues`),
        keywords: ['flow control', 'queues'],
      },
    ];

    const statePages = serviceList
      .filter((service) => service.ty !== 'Service')
      .map<Command>((service) => ({
        id: `page:state:${service.name}`,
        label: `State of ${service.name}`,
        icon: IconName.Database,
        href: toPage(`${baseUrl}/state/${encodeURIComponent(service.name)}`),
        keywords: ['state', 'storage', 'kv'],
      }));

    const mainActions: Command[] = [
      {
        id: 'action:register',
        label: 'Register deployment',
        icon: IconName.Plus,
        keywords: ['add', 'new', 'endpoint', 'deployment'],
        href: toHere(`?${REGISTER_DEPLOYMENT_QUERY}=true`),
      },
      {
        id: 'action:playground',
        label: 'Open playground…',
        icon: IconName.Play,
        keywords: ['playground', 'invoke', 'call', 'try', 'service', 'handler'],
        step: 'playground',
      },
      {
        id: 'action:queries',
        label: 'Run a query…',
        icon: IconName.ScanSearch,
        keywords: ['introspection', 'sql', 'useful', 'recent', 'query'],
        step: 'queries',
      },
      {
        id: 'action:create-rule',
        label: 'Create flow control rule',
        icon: IconName.Plus,
        keywords: ['new', 'limit', 'concurrency', 'rule'],
        href: toHere(createLimitRuleHref()),
      },
      {
        id: 'action:prune',
        label: 'Prune drained deployments',
        icon: IconName.Trash,
        keywords: ['remove', 'delete', 'clean', 'deployments'],
        href: toPage(
          `${baseUrl}/overview?view=deployments&${PRUNE_DRAINED_DEPLOYMENTS_QUERY}=true`,
        ),
      },
    ];

    const playgroundServices = serviceList
      .map<Command>((service) => ({
        id: `playground:${service.name}`,
        label: service.name,
        description: SERVICE_TYPE_LABELS[service.ty],
        icon: IconName.Box,
        href: toHere(panelHref({ playground: service.name })),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const playgroundHandlers = serviceList.flatMap((service) =>
      service.handlers.map<Command>((handler) => ({
        id: `playground:${service.name}/${handler.name}`,
        label: `${service.name}/${handler.name}`,
        icon: IconName.Function,
        keywords: [handler.name],
        href: toHere(
          panelHref({ playground: service.name, handler: handler.name }),
        ),
      })),
    );

    const recentQueries = queryHistory.map<Command>((sql, index) => ({
      id: `query:recent:${index}`,
      label: firstLine(sql),
      icon: IconName.History,
      keywords: [sql],
      monospace: true,
      href: introspectionHref(sql),
    }));

    const usefulQueries = predefinedQueries.map<Command>((predefined) => ({
      id: `query:useful:${predefined.id}`,
      label: predefined.title,
      description: predefined.description,
      icon: IconName.HatGlasses,
      keywords: ['introspection', 'sql', 'useful'],
      href: introspectionHref(predefined.query),
    }));

    return {
      pages,
      invocationPages,
      flowControlPages,
      statePages,
      mainActions,
      playgroundServices,
      playgroundHandlers,
      recentQueries,
      usefulQueries,
    };
  }, [
    services,
    baseUrl,
    canSortByTransition,
    hasLastQuery,
    toPage,
    toHere,
    queryHistory,
  ]);

  const extensionActions = extension.actions ?? NO_COMMANDS;
  const extensionSections = extension.sections ?? NO_SECTIONS;
  const extensionSteps = extension.steps ?? NO_STEPS;
  const steps = useMemo<CommandPaletteStep[]>(
    () => [
      {
        id: 'playground',
        label: 'Playground',
        placeholder: 'Pick a service or handler…',
        sections: [
          {
            id: 'services',
            title: SECTION_TITLES.services,
            items: catalog.playgroundServices,
          },
          {
            id: 'handlers',
            title: SECTION_TITLES.handlers,
            items: catalog.playgroundHandlers,
            searchOnly: true,
          },
        ],
      },
      {
        id: 'queries',
        label: 'Queries',
        placeholder: 'Pick a query…',
        sections: [
          {
            id: 'recentQueries',
            title: SECTION_TITLES.recentQueries,
            items: catalog.recentQueries,
          },
          {
            id: 'usefulQueries',
            title: SECTION_TITLES.usefulQueries,
            items: catalog.usefulQueries,
          },
        ],
      },
      ...extensionSteps,
    ],
    [catalog, extensionSteps],
  );

  const step = steps.find(({ id }) => id === stepId);

  const sections = useMemo(() => {
    const trimmed = query.trim();

    if (step) {
      return stepSections(step, trimmed);
    }

    if (!trimmed) {
      return nonEmpty([
        section(
          'actions',
          browsable([...catalog.mainActions, ...extensionActions]),
        ),
        section('pages', catalog.pages),
        section('invocations', catalog.invocationPages),
        section('flowControl', catalog.flowControlPages),
        ...browsableSections(extensionSections),
      ]);
    }

    const serviceList = Array.from(services.values());
    const parsed = parseInput(trimmed);
    const matches: Command[] = [];

    if (parsed.id) {
      const { kind, id } = parsed.id;
      if (kind === 'invocation') {
        matches.push({
          id: `match:${id}`,
          label: id,
          description: 'Invocation',
          hint: 'Go to',
          icon: IconName.Invocation,
          href: toPage(`${baseUrl}/invocations/${encodeURIComponent(id)}`),
          monospace: true,
        });
      }
      if (kind === 'deployment') {
        const known = deployments.find(
          ({ deployment }) => deployment.id === id,
        );
        matches.push({
          id: `match:${id}`,
          label: id,
          description: known ? `Deployment · ${known.label}` : 'Deployment',
          hint: 'Go to',
          icon: known?.icon ?? IconName.Http,
          href: toPage(deploymentHref(baseUrl, { deployment: id })),
          monospace: true,
        });
      }
      if (kind === 'vqueue') {
        matches.push({
          id: `match:${id}`,
          label: id,
          description: 'VQueue',
          hint: 'Go to',
          icon: IconName.Layers,
          rotateIcon: true,
          href: toPage(
            `${baseUrl}/flow-control/vqueues/${encodeURIComponent(id)}`,
          ),
          monospace: true,
        });
      }
    }

    if (parsed.endpoint) {
      const normalized = normalizeEndpoint(parsed.endpoint);
      const known = deployments.find(
        ({ deployment }) =>
          normalizeEndpoint(getEndpoint(deployment) ?? '') === normalized,
      );
      if (known) {
        matches.push({
          id: `match:endpoint:${known.deployment.id}`,
          label: known.label,
          description: `Deployment ${known.deployment.id}`,
          hint: 'Go to',
          icon: known.icon,
          href: toPage(
            deploymentHref(baseUrl, { deployment: known.deployment.id }),
          ),
        });
      } else {
        matches.push({
          id: 'match:register',
          label: `Register ${parsed.endpoint}`,
          description: 'Not registered yet. Opens the form with it filled in',
          icon: IconName.Plus,
          href: toHere(
            `?${REGISTER_DEPLOYMENT_QUERY}=${encodeURIComponent(parsed.endpoint)}`,
          ),
        });
      }
    }

    if (parsed.limitPattern) {
      matches.push(
        {
          id: 'match:rules',
          label: `Rules matching ${parsed.limitPattern}`,
          icon: IconName.Filters,
          href: toPage(limitRulesForPatternHref(baseUrl, parsed.limitPattern)),
        },
        {
          id: 'match:counters',
          label: `Limit counters for ${parsed.limitPattern}`,
          icon: IconName.Gauge,
          href: toPage(limitCountersForRuleHref(baseUrl, parsed.limitPattern)),
        },
        {
          id: 'match:create-rule',
          label: `Create rule for ${parsed.limitPattern}`,
          icon: IconName.Plus,
          href: toHere(createLimitRuleHref(parsed.limitPattern)),
        },
      );
    }

    if (parsed.errorCode) {
      const code = parsed.errorCode;
      const error = ERROR_CODES[code];
      if (error) {
        matches.push({
          id: `match:error:${code}`,
          label: code,
          description: error.summary,
          hint: 'Docs',
          icon: IconName.Docs,
          href: errorDocsHref(code),
          target: '_blank',
        });
      }
    }

    if (parsed.sql) {
      matches.push({
        id: 'match:sql',
        label: 'Run in Introspection',
        description: firstLine(parsed.sql),
        icon: IconName.ScanSearch,
        href: toPage(
          `${baseUrl}/introspection?${new URLSearchParams({ [INTROSPECTION_QUERY_PARAM]: parsed.sql })}`,
        ),
      });
    }

    if (parsed.servicePath) {
      const { service: name, rest } = parsed.servicePath;
      const service =
        services.get(name) ??
        serviceList.find(
          (candidate) => candidate.name.toLowerCase() === name.toLowerCase(),
        );
      const handler = service?.handlers.find(
        (candidate) => candidate.name.toLowerCase() === rest.toLowerCase(),
      );
      if (service && handler) {
        matches.push(
          {
            id: `match:handler:${service.name}/${handler.name}`,
            label: `${service.name}/${handler.name}`,
            description: 'Handler',
            hint: 'Go to',
            icon: IconName.Function,
            href: toPage(
              serviceHref(baseUrl, {
                service: service.name,
                handler: handler.name,
              }),
            ),
          },
          {
            id: `match:playground:${service.name}/${handler.name}`,
            label: `Open ${service.name}/${handler.name} in playground`,
            icon: IconName.Play,
            href: toHere(
              panelHref({ playground: service.name, handler: handler.name }),
            ),
          },
        );
      }
      if (service?.ty === 'VirtualObject') {
        matches.push({
          id: `match:object:${service.name}/${rest}`,
          label: `${service.name}/${rest}`,
          description: 'Virtual Object instance',
          hint: 'Go to',
          icon: IconName.VirtualObject,
          href: toPage(
            virtualObjectInstanceHref(baseUrl, {
              service: service.name,
              key: rest,
            }),
          ),
        });
      }
      if (service?.ty === 'Workflow') {
        matches.push({
          id: `match:workflow:${service.name}/${rest}`,
          label: `${service.name}/${rest}`,
          description: 'Workflow run',
          hint: 'Go to',
          icon: IconName.Workflow,
          href: toPage(
            workflowRunHref(baseUrl, { service: service.name, id: rest }),
          ),
        });
      }
    }

    const serviceCommands = serviceList.map<Command>((service) => ({
      id: `service:${service.name}`,
      label: service.name,
      description: SERVICE_TYPE_LABELS[service.ty],
      icon: IconName.Box,
      href: toPage(serviceHref(baseUrl, { service: service.name })),
    }));

    const handlerCommands = serviceList.flatMap((service) =>
      service.handlers.map<Command>((handler) => ({
        id: `handler:${service.name}/${handler.name}`,
        label: `${service.name}/${handler.name}`,
        icon: IconName.Function,
        keywords: [handler.name],
        href: toPage(
          serviceHref(baseUrl, {
            service: service.name,
            handler: handler.name,
          }),
        ),
      })),
    );

    const looksLikeEndpoint = /[.:/]/.test(trimmed);
    const deploymentCommands = looksLikeEndpoint
      ? deployments
          .filter(
            ({ endpoint, deployment }) =>
              endpoint?.toLowerCase().includes(trimmed.toLowerCase()) &&
              !matches.some(
                (match) => match.id === `match:endpoint:${deployment.id}`,
              ),
          )
          .map<Command>(({ deployment, label, icon }) => ({
            id: `deployment:${deployment.id}`,
            label,
            description: deployment.id,
            hint: 'Deployment',
            icon,
            href: toPage(
              deploymentHref(baseUrl, { deployment: deployment.id }),
            ),
          }))
      : [];

    const playgroundActions = [
      ...catalog.playgroundServices,
      ...catalog.playgroundHandlers,
    ].map<Command>((command) => ({
      ...command,
      id: `action:${command.id}`,
      label: `Open ${command.label} in playground`,
      description: undefined,
      icon: IconName.Play,
      keywords: ['playground', 'invoke', 'call', 'try'],
    }));

    const tokens = trimmed.toLowerCase().split(/\s+/);
    const requestedBatchActions = (
      Object.keys(BATCH_ACTIONS) as BatchActionId[]
    ).filter((actionId) =>
      tokens.some(
        (token) =>
          token.length >= 3 &&
          BATCH_ACTIONS[actionId].verb.toLowerCase().startsWith(token),
      ),
    );
    const mentionedServices = serviceList.filter((service) =>
      tokens.includes(service.name.toLowerCase()),
    );
    const batchActions = listInvocationPresets(canSortByTransition).flatMap(
      (preset) =>
        (PRESET_BATCH_ACTIONS[preset.id] ?? [])
          .filter((actionId) => requestedBatchActions.includes(actionId))
          .flatMap((actionId) => {
            const action = BATCH_ACTIONS[actionId];
            const run = {
              cancel: batch.batchCancel,
              pause: batch.batchPause,
              resume: batch.batchResume,
              'retry-now': batch.batchRetryNow,
              'restart-as-new': batch.batchRestartAsNew,
              kill: batch.batchKill,
              purge: batch.batchPurge,
            }[actionId];
            const scopes = [undefined, ...mentionedServices];
            return scopes.map<Command>((service) => ({
              id: `action:batch:${actionId}:${preset.id}:${service?.name ?? ''}`,
              label: `${action.verb} all ${preset.label} invocations${service ? ` of ${service.name}` : ''}`,
              description: 'Asks for confirmation first',
              icon: action.icon,
              destructive: action.destructive,
              keywords: ['batch', 'bulk'],
              onAction: () =>
                run(
                  {
                    filters: [
                      ...presetFilters(preset),
                      ...(service
                        ? [
                            {
                              type: 'STRING_LIST' as const,
                              field: 'target_service_name',
                              operation: 'IN' as const,
                              value: [service.name],
                            },
                          ]
                        : []),
                    ],
                  },
                  invocationFilterSchema,
                ),
            }));
          }),
    );

    return nonEmpty([
      section('matches', matches),
      section('services', rank(trimmed, serviceCommands, Infinity)),
      section(
        'handlers',
        parsed.servicePath ? [] : rank(trimmed, handlerCommands, Infinity),
      ),
      section('deployments', deploymentCommands),
      section(
        'pages',
        rank(trimmed, [...catalog.pages, ...catalog.statePages], Infinity),
      ),
      section('invocations', rank(trimmed, catalog.invocationPages, Infinity)),
      section('flowControl', rank(trimmed, catalog.flowControlPages, Infinity)),
      ...extensionSections.map((extensionSection) => ({
        ...extensionSection,
        items: rank(trimmed, extensionSection.items, EXTENSION_SECTION_LIMIT),
      })),
      section(
        'actions',
        rank(
          trimmed,
          [
            ...batchActions,
            ...catalog.mainActions,
            ...extensionActions,
            ...playgroundActions,
            ...catalog.usefulQueries.map((command) => ({
              ...command,
              label: `Run query: ${command.label}`,
            })),
            ...catalog.recentQueries.slice(0, 5).map((command) => ({
              ...command,
              label: `Rerun query: ${command.label}`,
              keywords: ['introspection', 'sql', 'recent', 'history'],
            })),
          ].filter(
            (action) => !matches.some((match) => match.href === action.href),
          ),
          Infinity,
        ),
      ),
    ]);
  }, [
    query,
    step,
    catalog,
    extensionActions,
    extensionSections,
    services,
    deployments,
    baseUrl,
    toPage,
    toHere,
    batch,
    invocationFilterSchema,
    canSortByTransition,
  ]);

  return useMemo(
    () => ({
      sections,
      step: step && { label: step.label, placeholder: step.placeholder },
    }),
    [sections, step],
  );
}
