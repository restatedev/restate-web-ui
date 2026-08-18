import type { ContentPanelTabs } from '@restate/ui/content-panel';
import { Icon, IconName } from '@restate/ui/icons';
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

export function FlowControlHero() {
  return (
    <section className="flex w-full flex-col gap-3 px-5 pt-14 pb-4 md:px-8 md:pt-16 md:pb-6">
      <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-zinc-950">
        <Icon name={IconName.FlowControl} className="h-6 w-6 text-zinc-400" />
        Flow control
      </h1>
      <p className="max-w-4xl text-base leading-7 text-zinc-500">
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
      </p>
    </section>
  );
}
