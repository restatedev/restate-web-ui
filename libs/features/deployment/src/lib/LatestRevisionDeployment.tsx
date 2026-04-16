import {
  Dropdown,
  DropdownTrigger,
  DropdownPopover,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from '@restate/ui/dropdown';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { formatPlurals } from '@restate/util/intl';
import { useListDeployments } from '@restate/data-access/admin-api-hooks';
import { Deployment } from './Deployment';
import { DEPLOYMENT_QUERY_PARAM } from './constants';

function useDeploymentPairs(serviceName: string) {
  const { data } = useListDeployments({ refetchOnMount: false });
  const serviceData = data?.services.get(serviceName);
  if (!serviceData) return [];

  const { sortedRevisions, deployments } = serviceData;
  return sortedRevisions.flatMap((rev) =>
    (deployments[rev] ?? []).map((id) => ({ id, revision: rev })),
  );
}

export function LatestRevisionDeployment({
  serviceName,
}: {
  serviceName: string;
}) {
  const pairs = useDeploymentPairs(serviceName);
  const latest = pairs[0];
  if (!latest) return null;

  return (
    <Deployment
      deploymentId={latest.id}
      revision={latest.revision}
      highlightSelection={false}
      className="min-w-0 text-sm"
      showEndpointCopyButton
    />
  );
}

export function OlderRevisions({ serviceName }: { serviceName: string }) {
  const pairs = useDeploymentPairs(serviceName);
  const older = pairs.slice(1);

  if (older.length === 0) return <div className="h-5" />;

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="icon"
          className="relative z-10 gap-0.5 self-end rounded-lg px-1.5 py-0.5 text-0.5xs text-zinc-500 hover:bg-black/3 hover:text-zinc-700"
        >
          {older.length} older{' '}
          {formatPlurals(older.length, {
            one: 'revision',
            other: 'revisions',
          })}
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-4 w-4 text-gray-400"
          />
        </Button>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownSection title="Older revisions">
          <DropdownMenu aria-label={`Older deployments for ${serviceName}`}>
            {older.map(({ id, revision }) => (
              <DropdownItem
                key={id}
                href={`?${DEPLOYMENT_QUERY_PARAM}=${id}`}
                value={id}
              >
                <Deployment
                  deploymentId={id}
                  revision={revision}
                  highlightSelection={false}
                  showLink={false}
                  className="[&>*]:text-inherit"
                />
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}
