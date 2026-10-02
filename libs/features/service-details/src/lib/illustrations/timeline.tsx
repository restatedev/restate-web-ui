import { InvocationStatusBadge } from '@restate/features/invocation-ui';
import { Icon, IconName } from '@restate/ui/icons';
import { formatOrdinals } from '@restate/util/intl';
import { tv } from '@restate/util/styles';
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
      'flex items-baseline gap-1.5 px-2 pb-1 text-xs font-semibold text-gray-500',
    sectionHandler: 'font-mono text-[0.6875rem] font-normal text-gray-500',
    sectionNote: 'text-[0.6875rem] font-normal text-gray-400',
    sectionExplanation: '-mt-1 w-0 min-w-full px-2 text-xs',
    sectionBody:
      'overflow-hidden rounded-xl border bg-white [--illustration-bg:var(--color-white)]',
    story: 'grid gap-x-2.5 gap-y-0.5 px-3 pb-2 text-[0.65625rem] text-gray-500',
    axisHeader: 'relative -mx-3 border-b border-gray-200 bg-gray-50',
    axisLabel:
      'relative flex flex-col items-center justify-end pt-2 pb-1.5 text-center leading-tight after:absolute after:bottom-[-4.5px] after:left-1/2 after:h-2 after:w-px after:-translate-x-1/2 after:bg-gray-300 after:content-[""]',
    axisEvent: 'text-[0.65625rem] font-medium text-gray-500',
    axisEventSub:
      'text-[0.59375rem] font-normal whitespace-nowrap text-gray-400',
    chip: 'inline-grid grid-cols-[auto_auto] overflow-hidden rounded-md border border-gray-200 bg-white text-left shadow-xs [&>:nth-child(n+3)]:border-t [&>:nth-child(n+3)]:border-gray-200',
    chipTag:
      'flex items-center border-r border-gray-200 bg-zinc-100/80 px-1 text-[0.4375rem] leading-none font-semibold tracking-[0.03em] text-zinc-500 uppercase',
    chipValue:
      'flex items-center px-1.5 py-[3px] font-mono text-[0.625rem] leading-none font-medium whitespace-nowrap text-zinc-700',
    chipCappedTag: 'border-amber-300/70 bg-amber-50 text-amber-800',
    chipCappedValue: 'text-amber-800',
    chipStruck: 'mr-0.5 text-amber-700/60 line-through decoration-amber-700/60',
    chipArrow: 'mx-0.5 font-sans text-amber-600',
    axisEventLabel:
      'relative flex flex-col items-center justify-end pt-2 text-center leading-tight',
    axisIntervals: 'relative h-7',
    axisTickMark:
      'absolute bottom-[-4.5px] h-2 w-px -translate-x-1/2 bg-gray-300',
    axisIntervalChip: 'absolute bottom-[5px] -translate-x-1/2',
    axisInterval: 'absolute bottom-[-2px] h-[3px] rounded-full',
    axisIntervalInfo: 'bg-zinc-300/90',
    axisIntervalWarning: 'bg-amber-300/90',
    axisArrow:
      'absolute right-1.5 bottom-[-3.5px] h-0 w-0 border-y-[3px] border-l-[5px] border-y-transparent border-l-gray-300',
    guide:
      'pointer-events-none relative before:absolute before:inset-y-0 before:left-1/2 before:border-l before:border-dashed before:border-gray-200 before:content-[""]',
    band: 'relative -mx-1.5 mt-1 grid gap-x-2.5 rounded-lg border border-dashed border-blue-200/70 bg-(--illustration-bg) px-1.5 pt-0.5 pb-2 [--illustration-bg:color-mix(in_oklab,var(--color-blue-50)_55%,var(--color-white))]',
    bandGuide: 'before:border-blue-200/60',
    bandLabel:
      'relative z-1 flex items-center pl-1 text-[0.59375rem] leading-tight text-gray-500',
    cardsRow: 'relative',
    cell: 'relative flex min-w-0 flex-col items-center gap-[3px] px-[3px] pt-1.5 pb-0.5',
    card: 'relative z-1 flex min-h-[4.5rem] w-[min(5rem,100%)] flex-col gap-[5px] rounded-lg border bg-white p-[5px] shadow-xs',
    cardGone:
      'relative z-1 flex min-h-[4.5rem] w-[min(5rem,100%)] flex-col items-center justify-center gap-[3px] rounded-lg border border-dashed bg-white p-[5px] text-center text-zinc-300',
    goneTitle: 'text-[0.625rem] leading-tight font-medium text-zinc-500',
    goneSub: 'text-[0.5625rem] leading-tight text-gray-400',
    cardSmall: 'min-h-0',
    badge: 'h-4 rounded px-[5px] text-[0.53125rem] leading-none',
    badgeRetrying: 'w-max gap-1 pr-[2px] pl-1',
    attemptChip:
      'inline-flex h-3 items-center gap-[3px] rounded-[4px] border border-gray-200/80 bg-white/70 px-1 text-[0.5rem] leading-none font-medium whitespace-nowrap text-orange-700',
    attemptIcon: 'h-2 w-2 shrink-0 text-orange-600',
    cardWide: 'w-full [&_.badge]:max-w-none',
    journal: 'flex flex-col gap-0.5 px-px',
    journalLine: 'flex h-2 items-center gap-1',
    journalNumber:
      'w-[7px] shrink-0 text-right font-mono text-[0.4375rem] leading-none text-zinc-400',
    journalBar: 'block h-1 rounded-sm bg-blue-300/85',
    journalEntry:
      'truncate font-mono text-[0.5rem] leading-none text-zinc-600 [&.muted]:text-zinc-400',
    captionReturn:
      'relative z-1 inline-flex w-max items-center gap-1 rounded bg-(--illustration-bg,var(--color-white)) px-[3px] text-[0.65625rem] leading-tight font-medium text-zinc-600',
    returnKey:
      'inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] border bg-white',
    returnIcon: 'h-2 w-2 shrink-0',
    lane: 'relative h-[4.75rem]',
    laneSegment: 'absolute top-1/2 border-t border-slate-300',
    laneSegmentDashed: 'border-dashed',
    laneSegmentStop:
      'after:absolute after:top-[-6px] after:right-0 after:h-[11px] after:w-px after:bg-slate-300 after:content-[""]',
    laneArrow: 'absolute top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400',
    node: 'absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[3px]',
    nodeDot:
      'relative z-1 h-2.5 w-2.5 rounded-full border-[1.5px] shadow-[0_0_0_3px_var(--illustration-bg,var(--color-white))]',
    nodeCaption: 'absolute top-full mt-0.5 whitespace-nowrap',
    up: 'absolute bottom-1/2 left-1/2 h-[3rem] w-px -translate-x-1/2 border-l border-dashed border-slate-400 before:absolute before:bottom-[10px] before:left-1/2 before:h-1.5 before:w-1.5 before:-translate-x-1/2 before:rotate-45 before:border-r before:border-b before:border-slate-400 before:content-[""]',
    linkRow: 'relative h-9',
    link: 'absolute top-0 bottom-0 w-px -translate-x-1/2 border-l border-dashed border-slate-400 before:absolute before:left-1/2 before:h-1.5 before:w-1.5 before:-translate-x-1/2 before:rotate-45 before:border-slate-400 before:content-[""]',
    linkDown: 'before:bottom-[1px] before:border-r before:border-b',
    linkUp: 'before:top-[1px] before:border-t before:border-l',
    linkCaption: 'absolute top-1/2 -translate-y-1/2 whitespace-nowrap',
    laneLabel:
      'relative z-1 flex items-center pl-1 text-[0.59375rem] leading-tight text-gray-500',
    stateBlock: 'flex flex-col gap-0.5 px-px',
    stateHeading:
      'mb-px inline-flex h-3 w-max items-center rounded-[3px] border border-zinc-300/80 bg-white/80 px-[3px] text-[0.4375rem] leading-none font-semibold tracking-[0.03em] text-zinc-500 uppercase',
    stateLine: 'flex h-2 items-center gap-1',
    stateKey:
      'w-[11px] shrink-0 font-mono text-[0.4375rem] leading-none text-zinc-500',
    stateBar: 'block h-1 rounded-sm bg-blue-300/85',
    stateBarMuted: 'bg-zinc-200',
    flowNode:
      'relative z-1 flex min-h-[5.25rem] flex-col gap-[5px] rounded-lg border bg-white p-[5px] shadow-xs',
    nodeTitle:
      'flex min-w-0 items-center gap-1 px-px text-[0.65625rem] leading-tight font-medium text-zinc-600',
    nodeIcon: 'h-3 w-3 shrink-0 text-zinc-400',
    nodeTag:
      'inline-flex h-3 w-max items-center gap-[2px] rounded-[3px] border border-zinc-300/80 bg-zinc-50 px-[3px] text-[0.4375rem] leading-none font-semibold tracking-[0.03em] text-zinc-500 uppercase',
    nodeCode:
      'truncate px-px font-mono text-[0.5625rem] leading-none text-zinc-600',
    wires: 'relative min-h-[5.25rem] self-stretch',
    wire: 'absolute right-1 left-1 border-t border-slate-300',
    wireDashed: 'border-dashed',
    dotStart:
      'absolute top-[-3px] left-0 h-[5px] w-[5px] rounded-full bg-slate-400',
    dotEnd:
      'absolute top-[-3px] right-0 h-[5px] w-[5px] rounded-full bg-slate-400',
    arrowRight:
      'absolute top-[-3.5px] right-0 h-1.5 w-1.5 rotate-45 border-t border-r border-slate-500',
    arrowLeft:
      'absolute top-[-3.5px] left-0 h-1.5 w-1.5 rotate-45 border-b border-l border-slate-500',
    wireLabel:
      'absolute left-1/2 -translate-x-1/2 -translate-y-full bg-white px-1 pb-[2px] font-mono text-[0.5625rem] leading-none text-zinc-600',
    wireEndTag:
      'absolute top-1/2 right-0 inline-flex h-3 w-max translate-x-full -translate-y-1/2 items-center gap-[2px] rounded-[3px] border border-zinc-300/80 bg-white px-[3px] text-[0.4375rem] leading-none font-semibold tracking-[0.03em] text-zinc-500 uppercase',
    packet:
      'absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap',
    packetBare: 'border-0 bg-transparent p-0 shadow-none',
    flowCaption:
      'absolute right-0 bottom-0 left-0 text-center text-[0.59375rem] leading-tight text-gray-400',
    cardsLane: 'pointer-events-none absolute inset-0',
    cardsLaneSegment: 'absolute top-[40%] border-t border-slate-300',
    cardsLaneSegmentDashed: 'border-dashed',
    cardsLaneSegmentWarning: 'border-amber-300',
    cardNote:
      'inline-flex h-3 w-max items-center rounded-[3px] border border-amber-300/70 bg-amber-50 px-[3px] text-[0.4375rem] leading-none font-semibold tracking-[0.03em] text-amber-800 uppercase',
  },
  variants: {
    journalState: {
      solid: {},
      purged: {
        journalBar:
          'h-[3px] border border-dashed border-gray-300 bg-transparent',
        journalNumber: 'text-zinc-300',
      },
    },
    dotStatus: {
      running: {
        nodeDot: 'border-dashed border-blue-500/80 bg-blue-50',
        returnKey: 'border-blue-300 text-blue-600',
      },
      succeeded: {
        nodeDot: 'border-green-600/70 bg-green-50',
        returnKey: 'border-green-300 text-green-700',
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
  green: { tag: 'bg-green-50/80 text-green-700/90', value: '' },
  gray: { tag: 'bg-zinc-200/50 text-zinc-600', value: '' },
  amber: { tag: 'bg-amber-50/80 text-amber-800/90', value: '' },
  blue: { tag: 'bg-blue-50/70 text-blue-700/90', value: '' },
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
