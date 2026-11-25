import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef } from 'react';
import { Badge } from '@restate/ui-badge';
import { Chip, ChipSegment } from '@restate/ui-chip';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
} from '@restate/ui-content-panel';
import { Icon, IconName } from '@restate/ui-icons';
import { RestateServer } from '@restate/ui-restate-server';
import {
  Cell,
  PanelTable,
  type PanelTableColumn,
  type RowDataAttributes,
} from '@restate/ui-table';
import {
  useWaveAnimation,
  waveAnimationProps,
} from '@restate/ui-wave-animation';
import { formatNumber } from '@restate/util-intl';

const WAVE_TARGET = 'overview-card';
const ROW_WAVE: RowDataAttributes = waveAnimationProps(WAVE_TARGET);

type ServiceColumn = 'name' | 'type' | 'invocations';

interface ServiceRow {
  id: string;
  type: string;
  invocations: number;
}

const services: ServiceRow[] = [
  { id: 'Checkout', type: 'Service', invocations: 1204 },
  { id: 'Cart', type: 'Virtual Object', invocations: 318 },
  { id: 'Signup', type: 'Workflow', invocations: 42 },
  { id: 'Inventory', type: 'Virtual Object', invocations: 0 },
];

const columns: PanelTableColumn<ServiceColumn>[] = [
  { id: 'name', name: 'Service', isRowHeader: true, minWidth: 200 },
  { id: 'type', name: 'Type', minWidth: 140 },
  { id: 'invocations', name: 'Not completed invocations', minWidth: 190 },
];

function renderCell(row: ServiceRow, column: PanelTableColumn<ServiceColumn>) {
  if (column.id === 'name') {
    return (
      <Cell>
        <Chip size="lg">
          <ChipSegment tone="raised">
            <Icon name={IconName.Box} size="xs" />
            {row.id}
          </ChipSegment>
        </Chip>
      </Cell>
    );
  }
  if (column.id === 'type') {
    return (
      <Cell>
        <Badge size="sm">{row.type}</Badge>
      </Cell>
    );
  }
  return <Cell className="tabular-nums">{formatNumber(row.invocations)}</Cell>;
}

function Overview() {
  const { triggerWave } = useWaveAnimation();
  const serverRef = useRef<HTMLDivElement>(null);

  const onRefresh = () => {
    serverRef.current?.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.04)' },
        { transform: 'scale(1)' },
      ],
      { duration: 500, easing: 'ease-in-out' },
    );
    triggerWave(serverRef, WAVE_TARGET);
  };

  return (
    <div className="flex flex-col items-center">
      <div ref={serverRef} className="relative z-20 h-[92px] w-[92px]">
        <div className="absolute top-1/2 left-1/2 -translate-1/2 scale-[0.7]">
          <RestateServer
            status="active"
            appearance="solid"
            onPress={onRefresh}
            aria-label="Refresh"
          />
        </div>
      </div>
      <div className="mt-10 w-full [--cp-toolbar-top:0.75rem] [--cp-toolbar-tuck:0.75rem]">
        <ContentPanel className="z-20 w-full">
          <ContentPanelBody className="pb-8">
            <ContentPanelSection flush>
              <PanelTable
                aria-label="Services"
                columns={columns}
                items={services}
                renderCell={renderCell}
                rowClassName="cursor-pointer"
                rowDataAttributes={() => ROW_WAVE}
              />
            </ContentPanelSection>
          </ContentPanelBody>
        </ContentPanel>
      </div>
    </div>
  );
}

const meta = {
  title: 'Feedback/Wave animation',
  component: Overview,
  parameters: {
    layout: 'padded',
    docs: { story: { inline: false, height: '560px' } },
  },
} satisfies Meta<typeof Overview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Refresh: Story = {};
