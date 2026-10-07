import {
  JOURNAL_RETENTION_DESCRIPTION,
  WORKFLOW_RETENTION_DESCRIPTION,
  idempotencyRetentionDescription,
} from '@restate/features/explainers';
import { Icon, IconName } from '@restate/ui/icons';
import { humanTimeToMs } from '@restate/util/humantime';
import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { explanationItemStyles } from './primitives';
import {
  FIRST_TICK_COLUMN,
  GUTTER_WIDTH,
  GoneSlot,
  InvocationCard,
  Section,
  TickChip,
  columnCenter,
  displayValue,
  timelineStyles,
  type ChipRow,
} from './timeline';

const styles = timelineStyles;

type StoryKind = 'run' | 'shared' | 'service';

interface Tick {
  ms: number;
  rows: ChipRow[];
}

interface Column {
  kind: 'event' | 'tick';
  label?: string;
  tick?: Tick;
}

interface RetentionWindow {
  name: string;
  value?: string | null;
}

function buildColumns({
  primary,
  others,
  journal,
}: {
  primary: RetentionWindow;
  others: RetentionWindow[];
  journal?: string | null;
}) {
  const ticks = new Map<number, Tick>();
  const add = (ms: number, row: ChipRow) => {
    const existing = ticks.get(ms);
    if (existing) {
      existing.rows.push(row);
    } else {
      ticks.set(ms, { ms, rows: [row] });
    }
  };
  const primaryMs = humanTimeToMs(primary.value);
  if (primaryMs > 0) {
    add(primaryMs, {
      name: primary.name,
      value: displayValue(primary.value),
    });
  }
  for (const other of others) {
    const ms = humanTimeToMs(other.value);
    if (ms > 0)
      add(ms, {
        name: other.name,
        value: displayValue(other.value),
      });
  }
  const journalMs = humanTimeToMs(journal);
  const journalDisabled = journal === '0s' || journalMs <= 0;
  const journalCapped =
    !journalDisabled && primaryMs > 0 && journalMs >= primaryMs;
  if (!journalDisabled) {
    if (journalCapped) {
      add(primaryMs, {
        name: 'journal',
        value: displayValue(primary.value),
        cappedFrom: journalMs > primaryMs ? displayValue(journal) : undefined,
      });
    } else {
      add(journalMs, { name: 'journal', value: displayValue(journal) });
    }
  }
  const sorted = Array.from(ticks.values()).sort((a, b) => a.ms - b.ms);
  const columns: Column[] = [
    { kind: 'event', label: 'called' },
    { kind: 'event', label: 'completed' },
    ...sorted.map((tick) => ({ kind: 'tick' as const, tick })),
  ];
  const primaryColumn =
    primaryMs > 0 ? 2 + sorted.findIndex((tick) => tick.ms === primaryMs) : -1;
  const journalColumn =
    journalDisabled || journalCapped
      ? -1
      : 2 + sorted.findIndex((tick) => tick.ms === journalMs);
  return { columns, primaryColumn, journalColumn, journalDisabled };
}

function ReturnCaption({
  text,
  status,
}: {
  text: string;
  status: 'running' | 'succeeded';
}) {
  const s = styles({ dotStatus: status });
  return (
    <span className={s.captionReturn()}>
      <span className={s.returnKey()}>
        <Icon name={IconName.Return} className={s.returnIcon()} />
      </span>
      {text}
    </span>
  );
}

function AxisLabel({ column, sub }: { column: Column; sub?: string }) {
  const s = styles();
  if (column.kind === 'event' || !column.tick) {
    return (
      <>
        {sub && <span className={s.axisEventSub()}>{sub}</span>}
        <span className={s.axisEvent()}>{column.label}</span>
      </>
    );
  }
  return <TickChip rows={column.tick.rows} />;
}

interface StoryProps {
  kind: StoryKind;
  label: string;
  calledNote: string;
  againNote: string;
  primary: RetentionWindow;
  others: RetentionWindow[];
  journal?: string | null;
}

const STORY_TEXT: Record<
  StoryKind,
  {
    cleared: string;
    clearedSub: string;
    clearedSubWithJournal: string;
    joins: string;
    result: string;
    fresh: string;
  }
> = {
  run: {
    cleared: 'cleared',
    clearedSub: 'incl. state & promises',
    clearedSubWithJournal: 'journal, state & promises',
    joins: 'joins the run',
    result: 'its result',
    fresh: 'new run',
  },
  shared: {
    cleared: 'expired',
    clearedSub: '',
    clearedSubWithJournal: 'journal too',
    joins: 'joins the call',
    result: 'its response',
    fresh: 'new invocation',
  },
  service: {
    cleared: 'expired',
    clearedSub: '',
    clearedSubWithJournal: 'journal too',
    joins: 'joins the call',
    result: 'its response',
    fresh: 'new invocation',
  },
};

function Story({
  kind,
  label,
  calledNote,
  againNote,
  primary,
  others,
  journal,
}: StoryProps) {
  const s = styles();
  const text = STORY_TEXT[kind];
  const { columns, primaryColumn, journalColumn, journalDisabled } =
    buildColumns({ primary, others, journal });
  const columnCount = columns.length;
  const gridTemplateColumns = `${GUTTER_WIDTH} repeat(${columnCount}, minmax(0, 6.5rem)) minmax(1.75rem, 1fr)`;
  const laneColumn = `${FIRST_TICK_COLUMN} / ${FIRST_TICK_COLUMN + columnCount}`;
  const journalPurgedAtPrimary = !journalDisabled && journalColumn === -1;
  const stopIndex = primaryColumn === -1 ? columnCount - 1 : primaryColumn;

  const cellFor = (index: number): ReactNode => {
    if (index === 0) {
      return (
        <>
          <InvocationCard status="running" journal="solid" rows={2} />
        </>
      );
    }
    if (index === 1) {
      return (
        <>
          <InvocationCard
            status="succeeded"
            journal={journalDisabled ? 'purged' : 'solid'}
            rows={4}
          />
        </>
      );
    }
    if (index === journalColumn) {
      return (
        <>
          <InvocationCard status="succeeded" journal="purged" rows={4} />
        </>
      );
    }
    if (index === primaryColumn) {
      const sub = journalPurgedAtPrimary
        ? text.clearedSubWithJournal
        : text.clearedSub;
      return (
        <>
          <GoneSlot title={text.cleared} sub={sub || undefined} />
        </>
      );
    }
    return null;
  };

  const repeatFor = (index: number): ReactNode => {
    const left: CSSProperties = { left: columnCenter(index, columnCount) };
    if (index === primaryColumn) {
      return (
        <div key={index} className={s.node()} style={left}>
          <InvocationCard status="running" journal="solid" rows={2} small />
          <span className={s.nodeCaption()}>
            <ReturnCaption text={text.fresh} status="running" />
          </span>
        </div>
      );
    }
    if (index === 0 || index === 1 || index === journalColumn) {
      return (
        <Fragment key={index}>
          <span className={s.up()} style={left} />
          <div className={s.node()} style={left}>
            <span
              className={s.nodeDot({
                dotStatus: index === 0 ? 'running' : 'succeeded',
              })}
            />
            <span className={s.nodeCaption()}>
              <ReturnCaption
                text={index === 0 ? text.joins : text.result}
                status={index === 0 ? 'running' : 'succeeded'}
              />
            </span>
          </div>
        </Fragment>
      );
    }
    return null;
  };

  const solidEnd = columnCenter(stopIndex, columnCount);

  return (
    <div
      className={s.story()}
      style={{ gridTemplateColumns }}
      role="img"
      aria-label={`${label} retention timeline`}
    >
      <div
        className={s.axisHeader()}
        style={{ gridColumn: '1 / -1', gridRowStart: 1 }}
      >
        <span className={s.axisArrow()} />
      </div>
      {columns.map((column, index) => (
        <div
          key={index}
          className={s.axisLabel()}
          style={{
            gridColumnStart: FIRST_TICK_COLUMN + index,
            gridRowStart: 1,
          }}
        >
          <AxisLabel
            column={column}
            sub={index === 0 ? calledNote : undefined}
          />
        </div>
      ))}
      {columns.map((_, index) => (
        <div
          key={index}
          className={s.guide()}
          style={{
            gridColumnStart: FIRST_TICK_COLUMN + index,
            gridRowStart: 2,
          }}
        />
      ))}

      <div
        className={s.cardsRow()}
        style={{ gridColumn: laneColumn, gridRowStart: 2 }}
      >
        <div className={s.cardsLane()}>
          <span
            className={s.cardsLaneSegment()}
            style={{
              left: columnCenter(0, columnCount),
              right: `calc(100% - ${solidEnd})`,
            }}
          />
        </div>
      </div>
      {columns.map((_, index) => {
        const content = cellFor(index);
        return (
          <div
            key={index}
            className={s.cell()}
            style={{
              gridColumnStart: FIRST_TICK_COLUMN + index,
              gridRowStart: 2,
            }}
          >
            {content}
          </div>
        );
      })}

      <div
        className={s.band()}
        style={{ gridColumn: '1 / -1', gridRowStart: 3, gridTemplateColumns }}
      >
        {columns.map((_, index) => (
          <div
            key={index}
            className={s.guide({ className: s.bandGuide() })}
            style={{
              gridColumnStart: FIRST_TICK_COLUMN + index,
              gridRowStart: 1,
            }}
          />
        ))}
        <div
          className={s.bandLabel()}
          style={{ gridColumnStart: 1, gridRowStart: 1 }}
        >
          {againNote}
        </div>
        <div
          className={s.lane()}
          style={{ gridColumn: laneColumn, gridRowStart: 1 }}
        >
          <span
            className={s.laneSegment()}
            style={{
              left: columnCenter(0, columnCount),
              right: `calc(100% - ${solidEnd})`,
            }}
          />
          {primaryColumn !== -1 && (
            <span
              className={s.laneSegment({ className: s.laneSegmentDashed() })}
              style={{ left: solidEnd, right: '-1.25rem' }}
            />
          )}
          <span className={s.laneArrow()} style={{ right: '-1.6rem' }}>
            <Icon name={IconName.ChevronRight} className="h-3 w-3" />
          </span>
          {columns.map((_, index) => repeatFor(index))}
        </div>
      </div>
    </div>
  );
}

export interface RetentionIllustrationProps {
  journal?: string | null;
  idempotency?: string | null;
  workflow?: string | null;
  isWorkflow?: boolean;
  handlers?: {
    name: string;
    ty?: 'Exclusive' | 'Shared' | 'Workflow' | null;
  }[];
  className?: string;
}

export function RetentionIllustration({
  journal,
  idempotency,
  workflow,
  isWorkflow = false,
  handlers = [],
  className,
}: RetentionIllustrationProps) {
  const s = styles();
  if (!isWorkflow) {
    const handler = handlers[0]?.name;
    return (
      <div className={s.root({ className })}>
        <Section handler={handler}>
          <Story
            kind="service"
            label={handler ? `${handler}()` : 'handler'}
            calledNote="with an idempotency key"
            againNote="same key, again"
            primary={{ name: 'idempotency', value: idempotency }}
            others={[]}
            journal={journal}
          />
        </Section>
      </div>
    );
  }
  const runHandler =
    handlers.find((handler) => handler.ty === 'Workflow')?.name ?? 'run';
  const sharedHandler = handlers.find(
    (handler) => handler.ty === 'Shared',
  )?.name;
  return (
    <div className={s.root({ className })}>
      <Section title="Workflow handler" handler={runHandler}>
        <Story
          kind="run"
          label={`${runHandler}()`}
          calledNote="with a workflow ID"
          againNote="same ID, again"
          primary={{ name: 'workflow', value: workflow }}
          others={[{ name: 'idempotency', value: idempotency }]}
          journal={journal}
        />
      </Section>
      <Section title="Shared handler" handler={sharedHandler}>
        <Story
          kind="shared"
          label={sharedHandler ? `${sharedHandler}()` : 'shared handler'}
          calledNote="with an idempotency key"
          againNote="same key, again"
          primary={{ name: 'idempotency', value: idempotency }}
          others={[{ name: 'workflow', value: workflow }]}
          journal={journal}
        />
      </Section>
    </div>
  );
}

export function RetentionExplanation({
  isWorkflow,
  className,
}: {
  isWorkflow: boolean;
  className?: string;
}) {
  const item = explanationItemStyles({ surface: 'light' });
  return (
    <ul className={className}>
      <li className={item}>
        <strong className="font-medium">Journal:</strong>{' '}
        {JOURNAL_RETENTION_DESCRIPTION}
      </li>
      {isWorkflow && (
        <li className={item}>
          <strong className="font-medium">Workflow:</strong>{' '}
          {WORKFLOW_RETENTION_DESCRIPTION}
        </li>
      )}
      <li className={item}>
        <strong className="font-medium">Idempotency:</strong>{' '}
        {idempotencyRetentionDescription(isWorkflow)}
      </li>
      <li className={item}>
        Journal retention removes only the journal; the status and result stay
        until the {isWorkflow ? 'workflow or idempotency' : 'idempotency'}{' '}
        window ends, and a repeated call receives that result without
        re-executing.
      </li>
    </ul>
  );
}
