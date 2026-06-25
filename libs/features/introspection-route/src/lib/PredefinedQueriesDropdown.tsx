import { Button } from '@restate/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { HoverTooltip } from '@restate/ui/tooltip';
import {
  predefinedQueries,
  type PredefinedQuery,
  type PredefinedQueryFeature,
} from './predefinedQueries';

const predefinedQueryById = new Map<string, PredefinedQuery>(
  predefinedQueries.map((query) => [query.id, query]),
);

function isFeatureAvailable(
  feature: PredefinedQueryFeature,
  availableFeatures: Set<PredefinedQueryFeature>,
) {
  return availableFeatures.has(feature);
}

function isQueryAvailable(
  query: PredefinedQuery,
  availableFeatures: Set<PredefinedQueryFeature>,
) {
  return (
    query.requiredFeatures?.every((feature) =>
      isFeatureAvailable(feature, availableFeatures),
    ) ?? true
  );
}

function getUnavailableReason(
  query: PredefinedQuery,
  availableFeatures: Set<PredefinedQueryFeature>,
) {
  const missingFeatures = query.requiredFeatures?.filter(
    (feature) => !isFeatureAvailable(feature, availableFeatures),
  );

  if (!missingFeatures?.length) {
    return undefined;
  }

  return `Requires ${missingFeatures.join(', ')}`;
}

export function PredefinedQueriesDropdown({
  hasVqueues,
  onSelect,
}: {
  hasVqueues: boolean;
  onSelect: (query: string) => void;
}) {
  const availableFeatures = new Set<PredefinedQueryFeature>(
    hasVqueues ? (['vqueues'] as const) : [],
  );
  const disabledItems = predefinedQueries
    .filter((query) => !isQueryAvailable(query, availableFeatures))
    .map((query) => query.id);

  return (
    <Dropdown>
      <DropdownTrigger>
        <HoverTooltip content="Useful queries">
          <Button
            variant="icon"
            className="h-full rounded-lg bg-white/10 px-2 text-gray-200 hover:bg-white/20 pressed:bg-white/25"
          >
            <Icon name={IconName.HatGlasses} className="h-4 w-4 shrink-0" />
          </Button>
        </HoverTooltip>
      </DropdownTrigger>
      <DropdownPopover className="w-[min(90vw,38rem)] max-w-[38rem]!">
        <DropdownSection title="Useful queries" className="mb-0">
          <DropdownMenu
            autoFocus
            aria-label="Useful queries"
            disabledItems={disabledItems}
            onSelect={(id) => {
              const query = predefinedQueryById.get(id);
              if (query) {
                onSelect(query.query);
              }
            }}
          >
            {predefinedQueries.map((query) => {
              const unavailableReason = getUnavailableReason(
                query,
                availableFeatures,
              );

              return (
                <DropdownItem
                  key={query.id}
                  value={query.id}
                  className="[&[data-focused]_*:not(svg)]:!text-inherit"
                >
                  <span className="flex min-w-0 flex-col gap-1 whitespace-normal">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium">
                        {query.title}
                      </span>
                      {unavailableReason && (
                        <span className="shrink-0 rounded-md border border-gray-200 px-1.5 py-0.5 text-0.5xs text-gray-500">
                          {unavailableReason}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500">
                      {query.description}
                    </span>
                  </span>
                </DropdownItem>
              );
            })}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}
