import { InvocationStatusBadge } from '@restate/features-invocation-ui';
import { Icon, IconName } from '@restate/ui-icons';
import { formatOrdinals } from '@restate/util-intl';
import { tv } from '@restate/util-styles';
import { Fragment, type ReactNode } from 'react';

export const COLUMN_GAP_PX = 10;
export const FIRST_TICK_COLUMN = 2;
export const GUTTER_WIDTH = '3.75rem';
export const JOURNAL_LINE_WIDTHS = ['72%', '46%', '84%', '58%', '66%'];

export const timelineStyles = tv({
  slots: {
    root: 'flex flex-col gap-3 text-2xs',
    section: 'flex flex-col',
    sectionHeader:
      'flex items-baseline gap-1.5 px-2 pb-1 text-xs font-semibold text-muted',
    sectionHandler: 'font-mono text-[0.6875rem] font-normal text-muted',
    sectionNote: 'text-[0.6875rem] font-normal text-subtle',
    sectionExplanation: '-mt-1 w-0 min-w-full px-2 text-xs',
    sectionBody:
      'overflow-hidden rounded-xl border bg-surface [--illustration-bg:var(--background-color-surface)]',
    story: 'grid gap-x-2.5 gap-y-0.5 px-3 pb-2 text-[0.65625rem] text-muted',
    axisHeader: 'relative -mx-3 border-b border-default bg-subtle',
    axisLabel:
      'relative flex flex-col items-center justify-end pt-2 pb-1.5 text-center leading-tight after:absolute after:bottom-[-4.5px] after:left-1/2 after:h-2 after:w-px after:-translate-x-1/2 after:bg-strong after:content-[""]',
    axisEvent: 'text-[0.65625rem] font-medium text-muted',
    axisEventSub: 'text-[0.59375rem] font-normal whitespace-nowrap text-subtle',
    chip: 'inline-grid grid-cols-[auto_auto] overflow-hidden rounded-md border border-default bg-surface text-left shadow-xs [&>:nth-child(n+3)]:border-t [&>:nth-child(n+3)]:border-default',
    chipTag:
      'flex items-center border-r border-default bg-muted/80 px-1 text-[0.4375rem] leading-none font-semibold tracking-[0.03em] text-muted uppercase',
    chipValue:
      'flex items-center px-1.5 py-[3px] font-mono text-[0.625rem] leading-none font-medium whitespace-nowrap text-secondary',
    chipCappedTag: 'border-pending bg-pending-subtle text-pending-strong',
    chipCappedValue: 'text-pending-strong',
    chipStruck: 'mr-0.5 text-pending line-through decoration-pending-strong/60',
    chipArrow: 'mx-0.5 font-sans text-pending',
    axisEventLabel:
      'relative flex flex-col items-center justify-end pt-2 text-center leading-tight',
    axisIntervals: 'relative h-7',
    axisTickMark:
      'absolute bottom-[-4.5px] h-2 w-px -translate-x-1/2 bg-strong',
    axisIntervalChip: 'absolute bottom-[5px] -translate-x-1/2',
    axisInterval: 'absolute bottom-[-2px] h-[3px] rounded-full',
    axisIntervalInfo: 'bg-strong/90',
    axisIntervalWarning: 'bg-pending-strong/90',
    axisArrow:
      'absolute right-1.5 bottom-[-3.5px] h-0 w-0 border-y-[3px] border-l-[5px] border-y-transparent border-l-strong',
    guide:
      'pointer-events-none relative before:absolute before:inset-y-0 before:left-1/2 before:border-l before:border-dashed before:border-default before:content-[""]',
    band: 'relative -mx-1.5 mt-1 grid gap-x-2.5 rounded-lg border border-dashed border-accent/70 bg-(--illustration-bg) px-1.5 pt-0.5 pb-2 [--illustration-bg:color-mix(in_oklab,var(--background-color-accent-subtle)_55%,var(--background-color-surface))]',
    bandGuide: 'before:border-accent/60',
    bandLabel:
      'relative z-1 flex items-center pl-1 text-[0.59375rem] leading-tight text-muted',
    cardsRow: 'relative',
    cell: 'relative flex min-w-0 flex-col items-center gap-[3px] px-[3px] pt-1.5 pb-0.5',
    card: 'relative z-1 flex min-h-[4.5rem] w-[min(5rem,100%)] flex-col gap-[5px] rounded-lg border bg-surface p-[5px] shadow-xs',
    cardGone:
      'relative z-1 flex min-h-[4.5rem] w-[min(5rem,100%)] flex-col items-center justify-center gap-[3px] rounded-lg border border-dashed bg-surface p-[5px] text-center text-faint',
    goneTitle: 'text-[0.625rem] leading-tight font-medium text-muted',
    goneSub: 'text-[0.5625rem] leading-tight text-subtle',
    cardSmall: 'min-h-0',
    badge: 'h-4 rounded px-[5px] text-[0.53125rem] leading-none',
    badgeRetrying: 'w-max gap-1 pr-[2px] pl-1',
    attemptChip:
      'inline-flex h-3 items-center gap-[3px] rounded-[4px] border border-default/80 bg-surface/70 px-1 text-[0.5rem] leading-none font-medium whitespace-nowrap text-warning-strong',
    attemptIcon: 'h-2 w-2 shrink-0 text-warning',
    cardWide: 'w-full [&_.badge]:max-w-none',
    journal: 'flex flex-col gap-0.5 px-px',
    journalLine: 'flex h-2 items-center gap-1',
    journalNumber:
      'w-[7px] shrink-0 text-right font-mono text-[0.4375rem] leading-none text-subtle',
    journalBar: 'block h-1 rounded-sm bg-accent-strong/80',
    journalEntry:
      'truncate font-mono text-[0.5rem] leading-none text-tertiary [&.muted]:text-subtle',
    captionReturn:
      'relative z-1 inline-flex w-max items-center gap-1 rounded bg-(--illustration-bg,var(--background-color-surface)) px-[3px] text-[0.65625rem] leading-tight font-medium text-tertiary',
    returnKey:
      'inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] border bg-surface',
    returnIcon: 'h-2 w-2 shrink-0',
    lane: 'relative h-[4.75rem]',
    laneSegment: 'absolute top-1/2 border-t border-strong',
    laneSegmentDashed: 'border-dashed',
    laneSegmentStop:
      'after:absolute after:top-[-6px] after:right-0 after:h-[11px] after:w-px after:bg-strong after:content-[""]',
    laneArrow: 'absolute top-1/2 h-3 w-3 -translate-y-1/2 text-subtle',
    node: 'absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[3px]',
    nodeDot:
      'relative z-1 h-2.5 w-2.5 rounded-full border-[1.5px] shadow-[0_0_0_3px_var(--illustration-bg,var(--background-color-surface))]',
    nodeCaption: 'absolute top-full mt-0.5 whitespace-nowrap',
    up: 'absolute bottom-1/2 left-1/2 h-[3rem] w-px -translate-x-1/2 border-l border-dashed border-neutral before:absolute before:bottom-[10px] before:left-1/2 before:h-1.5 before:w-1.5 before:-translate-x-1/2 before:rotate-45 before:border-r before:border-b before:border-neutral before:content-[""]',
    linkRow: 'relative h-9',
    link: 'absolute top-0 bottom-0 w-px -translate-x-1/2 border-l border-dashed border-neutral before:absolute before:left-1/2 before:h-1.5 before:w-1.5 before:-translate-x-1/2 before:rotate-45 before:border-neutral before:content-[""]',
    linkDown: 'before:bottom-[1px] before:border-r before:border-b',
    linkUp: 'before:top-[1px] before:border-t before:border-l',
    linkCaption: 'absolute top-1/2 -translate-y-1/2 whitespace-nowrap',
    laneLabel:
      'relative z-1 flex items-center pl-1 text-[0.59375rem] leading-tight text-muted',
    stateBlock: 'flex flex-col gap-0.5 px-px',
    stateHeading:
      'mb-px inline-flex h-3 w-max items-center rounded-[3px] border border-strong/80 bg-surface/80 px-[3px] text-[0.4375rem] leading-none font-semibold tracking-[0.03em] text-muted uppercase',
    stateLine: 'flex h-2 items-center gap-1',
    stateKey:
      'w-[11px] shrink-0 font-mono text-[0.4375rem] leading-none text-muted',
    stateBar: 'block h-1 rounded-sm bg-accent-strong/80',
    stateBarMuted: 'bg-emphasis',
    flowNode:
      'relative z-1 flex min-h-[5.25rem] flex-col gap-[5px] rounded-lg border bg-surface p-[5px] shadow-xs',
    nodeTitle:
      'flex min-w-0 items-center gap-1 px-px text-[0.65625rem] leading-tight font-medium text-tertiary',
    nodeIcon: 'h-3 w-3 shrink-0 text-subtle',
    nodeTag:
      'inline-flex h-3 w-max items-center gap-[2px] rounded-[3px] border border-strong/80 bg-subtle px-[3px] text-[0.4375rem] leading-none font-semibold tracking-[0.03em] text-muted uppercase',
    nodeCode:
      'truncate px-px font-mono text-[0.5625rem] leading-none text-tertiary',
    wires: 'relative min-h-[5.25rem] self-stretch',
    wire: 'absolute right-1 left-1 border-t border-strong',
    wireDashed: 'border-dashed',
    dotStart:
      'absolute top-[-3px] left-0 h-[5px] w-[5px] rounded-full bg-neutral',
    dotEnd:
      'absolute top-[-3px] right-0 h-[5px] w-[5px] rounded-full bg-neutral',
    arrowRight:
      'absolute top-[-3.5px] right-0 h-1.5 w-1.5 rotate-45 border-t border-r border-neutral-strong',
    arrowLeft:
      'absolute top-[-3.5px] left-0 h-1.5 w-1.5 rotate-45 border-b border-l border-neutral-strong',
    wireLabel:
      'absolute left-1/2 -translate-x-1/2 -translate-y-full bg-surface px-1 pb-[2px] font-mono text-[0.5625rem] leading-none text-tertiary',
    wireEndTag:
      'absolute top-1/2 right-0 inline-flex h-3 w-max translate-x-full -translate-y-1/2 items-center gap-[2px] rounded-[3px] border border-strong/80 bg-surface px-[3px] text-[0.4375rem] leading-none font-semibold tracking-[0.03em] text-muted uppercase',
    packet:
      'absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap',
    packetBare: 'border-0 bg-transparent p-0 shadow-none',
    flowCaption:
      'absolute right-0 bottom-0 left-0 text-center text-[0.59375rem] leading-tight text-subtle',
    cardsLane: 'pointer-events-none absolute inset-0',
    cardsLaneSegment: 'absolute top-[40%] border-t border-strong',
    cardsLaneSegmentDashed: 'border-dashed',
    cardsLaneSegmentWarning: 'border-pending',
    cardNote:
      'inline-flex h-3 w-max items-center rounded-[3px] border border-pending bg-pending-subtle px-[3px] text-[0.4375rem] leading-none font-semibold tracking-[0.03em] text-pending-strong uppercase',
  },
  variants: {
    journalState: {
      solid: {},
      purged: {
        journalBar: 'h-[3px] border border-dashed border-strong bg-transparent',
        journalNumber: 'text-faint',
      },
    },
    dotStatus: {
      running: {
        nodeDot: 'border-dashed border-accent-strong/80 bg-accent-subtle',
        returnKey: 'border-accent text-accent',
      },
      succeeded: {
        nodeDot: 'border-success-strong/70 bg-success-subtle',
        returnKey: 'border-success text-success-strong',
      },
    },
  },
  defaultVariants: { journalState: 'solid', dotStatus: 'running' },
});

const styles = timelineStyles;

export type ChipRowTone = 'green' | 'gray' | 'amber' | 'blue';

export interface ChipRow {
  name: string;
  value: string;
  cappedFrom?: string;
  tone?: ChipRowTone;
}

const ROW_TONES: Record<ChipRowTone, { tag: string; value: string }> = {
  green: { tag: 'bg-success-subtle text-success-strong', value: '' },
  gray: { tag: 'bg-emphasis/50 text-tertiary', value: '' },
  amber: { tag: 'bg-pending-subtle text-pending-strong', value: '' },
  blue: { tag: 'bg-accent-subtle text-accent', value: '' },
};

export function displayValue(value?: string | null) {
  if (!value) return 'default';
  return value === '0s' ? 'disabled' : value;
}

export function columnCenter(index: number, columnCount: number) {
  const width = `((100% - ${(columnCount - 1) * COLUMN_GAP_PX}px) / ${columnCount})`;
  return `calc(${width} * ${index} + ${index * COLUMN_GAP_PX}px + ${width} / 2)`;
}

export function JournalLines({
  rows,
  state,
  entry,
  entryMuted,
  trailingRows = 0,
}: {
  rows: number;
  state: 'solid' | 'purged';
  entry?: string;
  entryMuted?: boolean;
  trailingRows?: number;
}) {
  const s = styles({ journalState: state });
  const bars = JOURNAL_LINE_WIDTHS.slice(0, rows);
  const trailing = JOURNAL_LINE_WIDTHS.slice(rows + 1, rows + 1 + trailingRows);
  return (
    <div className={s.journal()} aria-hidden="true">
      {bars.map((width, index) => (
        <span key={index} className={s.journalLine()}>
          <span className={s.journalNumber()}>{index + 1}</span>
          <span className={s.journalBar()} style={{ width }} />
        </span>
      ))}
      {entry && (
        <span className={s.journalLine()}>
          <span className={s.journalNumber()}>{rows + 1}</span>
          <span
            className={s.journalEntry({
              className: entryMuted ? 'muted' : undefined,
            })}
          >
            {entry}
          </span>
        </span>
      )}
      {trailing.map((width, index) => (
        <span key={`t${index}`} className={s.journalLine()}>
          <span className={s.journalNumber()}>{rows + 2 + index}</span>
          <span className={s.journalBar()} style={{ width }} />
        </span>
      ))}
    </div>
  );
}

export function InvocationCard({
  status,
  journal,
  rows,
  small,
  note,
  entry,
  entryMuted,
  trailingRows,
  children,
}: {
  status: 'running' | 'succeeded' | 'suspended' | 'backing-off' | 'retrying';
  journal: 'solid' | 'purged';
  rows: number;
  small?: boolean;
  note?: string;
  entry?: string;
  entryMuted?: boolean;
  trailingRows?: number;
  children?: ReactNode;
}) {
  const s = styles();
  return (
    <div
      className={s.card({
        className: [
          small && s.cardSmall(),
          status === 'retrying' && s.cardWide(),
        ]
          .filter(Boolean)
          .join(' '),
      })}
    >
      {status === 'retrying' ? (
        <InvocationStatusBadge
          status="running"
          isRetrying
          mini
          className={s.badge({ className: s.badgeRetrying() })}
        >
          <span className={s.attemptChip()}>
            <Icon name={IconName.TriangleAlert} className={s.attemptIcon()} />
            {formatOrdinals(2)} attempt
          </span>
        </InvocationStatusBadge>
      ) : (
        <InvocationStatusBadge status={status} mini className={s.badge()} />
      )}
      <JournalLines
        rows={rows}
        state={journal}
        entry={entry}
        entryMuted={entryMuted}
        trailingRows={trailingRows}
      />
      {children}
      {note && <span className={s.cardNote()}>{note}</span>}
    </div>
  );
}

export function GoneSlot({ title, sub }: { title: string; sub?: string }) {
  const s = styles();
  return (
    <div className={s.cardGone()}>
      <Icon name={IconName.Trash} className="h-3.5 w-3.5" />
      <span className={s.goneTitle()}>{title}</span>
      {sub && <span className={s.goneSub()}>{sub}</span>}
    </div>
  );
}

export function TickChip({ rows }: { rows: ChipRow[] }) {
  const s = styles();
  return (
    <span className={s.chip()}>
      {rows.map((row) => (
        <Fragment key={row.name}>
          <span
            className={s.chipTag({
              className: row.cappedFrom
                ? s.chipCappedTag()
                : row.tone
                  ? ROW_TONES[row.tone].tag
                  : undefined,
            })}
          >
            {row.name}
          </span>
          <span
            className={s.chipValue({
              className: row.cappedFrom
                ? s.chipCappedValue()
                : row.tone
                  ? ROW_TONES[row.tone].value
                  : undefined,
            })}
          >
            {row.cappedFrom && (
              <>
                <span className={s.chipStruck()}>{row.cappedFrom}</span>
                <span className={s.chipArrow()}>→</span>
              </>
            )}
            {row.value}
          </span>
        </Fragment>
      ))}
    </span>
  );
}

export function Section({
  title,
  handler,
  note,
  children,
}: {
  title?: string;
  handler?: string;
  note?: string;
  children: ReactNode;
}) {
  const s = styles();
  return (
    <section className={s.section()}>
      {(title || handler || note) && (
        <h4 className={s.sectionHeader()}>
          {title && <span>{title}</span>}
          {handler && <span className={s.sectionHandler()}>{handler}()</span>}
          {note && <span className={s.sectionNote()}>{note}</span>}
        </h4>
      )}
      <div className={s.sectionBody()}>{children}</div>
    </section>
  );
}
