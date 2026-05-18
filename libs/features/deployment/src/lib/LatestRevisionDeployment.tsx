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
import { useListDeployments } from '@restate/data-access/admin-api-hooks';
import { Deployment } from './Deployment';
import { Revision } from './Revision';
import { panelHref } from '@restate/util/panel';

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
      highlightSelection={false}
      showEndpointCopyButton
      className="-mr-2 [&_a]:-mr-2 [&_a>svg]:hidden"
    />
  );
}

export function AllRevisions({ serviceName }: { serviceName: string }) {
  const pairs = useDeploymentPairs(serviceName);
  const latest = pairs[0];
  if (!latest) return null;

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="icon"
          className="relative inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-0.5xs hover:bg-black/3"
        >
          <Revision revision={latest.revision} />
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-3.5 w-3.5 text-gray-400"
          />
        </Button>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownSection title="Revisions">
          <DropdownMenu aria-label={`Deployments for ${serviceName}`}>
            {pairs.map(({ id, revision }) => (
              <DropdownItem
                key={id}
                href={panelHref({ deployment: id })}
                value={id}
              >
                <Deployment
                  deploymentId={id}
                  revision={revision}
                  highlightSelection={false}
                  showLink={false}
                  className="[&_.badge]:bg-black/3 [&>*]:text-inherit"
                />
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}
