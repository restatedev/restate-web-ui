import type { ContentPanelTabs } from '@restate/ui/content-panel';
import { Icon, IconName } from '@restate/ui/icons';
import { ListPageHeader } from '@restate/ui/layout';
import { Link } from '@restate/ui/link';

export type FlowControlTabId = 'rules' | 'counters' | 'vqueues';

export function flowControlTabs(
  baseUrl: string,
  selectedId: FlowControlTabId,
): ContentPanelTabs {
  return {
    selectedId,
    items: [
      {
        id: 'rules',
        label: (
          <>
            <Icon name={IconName.Filters} className="h-3.5 w-3.5" />
            Rules
          </>
        ),
        href: `${baseUrl}/flow-control/rules`,
      },
      {
        id: 'counters',
        label: (
          <>
            <Icon name={IconName.Gauge} className="h-3.5 w-3.5 !fill-none" />
            Limit counters
          </>
        ),
        href: `${baseUrl}/flow-control/counters`,
      },
      {
        id: 'vqueues',
        label: (
          <>
            <Icon name={IconName.Layers} className="h-3.5 w-3.5 rotate-90" />
            VQueues
          </>
        ),
        href: `${baseUrl}/flow-control/vqueues`,
      },
    ],
  };
}

export function FlowControlHeader() {
  return (
    <ListPageHeader icon={IconName.FlowControl} title="Flow control">
      Configure flow-control policies and inspect limit usage, capacity, and
      VQueue activity across scopes and limit keys.{' '}
      <Link
        href="https://docs.restate.dev/services/flow-control"
        variant="secondary"
        target="_blank"
        rel="noopener noreferrer"
      >
        Learn more
      </Link>
    </ListPageHeader>
  );
}
