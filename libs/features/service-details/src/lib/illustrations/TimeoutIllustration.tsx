import { Fragment, type ReactNode } from 'react';
import { explanationItemStyles } from './primitives';
import {
  InvocationCard,
  Section,
  TickChip,
  columnCenter,
  displayValue,
  timelineStyles,
} from './timeline';

interface TimeoutColumn {
  label?: string;
}

interface Segment {
  from: number;
  to: number;
  style?: 'dashed' | 'warning';
}

interface Interval {
  from: number;
  to: number;
  tone: 'info' | 'warning';
  name: string;
  value: string;
}

function midpoint(from: number, to: number, columnCount: number) {
  return `calc((${columnCenter(from, columnCount)} + ${columnCenter(to, columnCount)}) / 2)`;
}

function TimeoutStory({
  label,
  columns,
  cards,
  segments,
  intervals,
}: {
  label: string;
  columns: TimeoutColumn[];
  cards: ReactNode[];
  segments: Segment[];
  intervals: Interval[];
}) {
  const s = timelineStyles();
  const columnCount = columns.length;
  const gridTemplateColumns = `repeat(${columnCount}, minmax(0, 8.75rem)) minmax(1.75rem, 1fr)`;
  const cardsColumn = `1 / ${1 + columnCount}`;

  return (
    <div
      className={s.story()}
      style={{ gridTemplateColumns }}
      role="img"
      aria-label={label}
    >
      <div
        className={s.axisHeader()}
        style={{ gridColumn: '1 / -1', gridRow: '1 / 3' }}
      >
        <span className={s.axisArrow()} />
      </div>
      {columns.map((column, index) => (
        <div
          key={index}
          className={s.axisEventLabel()}
          style={{ gridColumnStart: 1 + index, gridRowStart: 1 }}
        >
          {column.label && (
            <span className={s.axisEvent()}>{column.label}</span>
          )}
        </div>
      ))}
      <div
        className={s.axisIntervals()}
        style={{ gridColumn: cardsColumn, gridRowStart: 2 }}
      >
        {intervals.map((interval) => (
          <span
            key={`bar-${interval.from}-${interval.to}`}
            className={s.axisInterval({
              className:
                interval.tone === 'warning'
                  ? s.axisIntervalWarning()
                  : s.axisIntervalInfo(),
            })}
            style={{
              left: columnCenter(interval.from, columnCount),
              right: `calc(100% - ${columnCenter(interval.to, columnCount)})`,
            }}
          />
        ))}
        {columns.map((_, index) => (
          <span
            key={`tick-${index}`}
            className={s.axisTickMark()}
            style={{ left: columnCenter(index, columnCount) }}
          />
        ))}
        {intervals.map((interval) => (
          <span
            key={`chip-${interval.from}-${interval.to}`}
            className={s.axisIntervalChip()}
            style={{ left: midpoint(interval.from, interval.to, columnCount) }}
          >
            <TickChip
              rows={[
                {
                  name: interval.name,
                  value: interval.value,
                  tone: interval.tone === 'warning' ? 'amber' : 'gray',
                },
              ]}
            />
          </span>
        ))}
      </div>
      {columns.map((_, index) => (
        <div
          key={index}
          className={s.guide()}
          style={{ gridColumnStart: 1 + index, gridRowStart: 3 }}
        />
      ))}
      <div
        className={s.cardsRow()}
        style={{ gridColumn: cardsColumn, gridRowStart: 3 }}
      >
        <div className={s.cardsLane()}>
          {segments.map((segment) => (
            <span
              key={`${segment.from}-${segment.to}`}
              className={s.cardsLaneSegment({
                className: [
                  segment.style === 'dashed' && s.cardsLaneSegmentDashed(),
                  segment.style === 'warning' && s.cardsLaneSegmentWarning(),
                ]
                  .filter(Boolean)
                  .join(' '),
              })}
              style={{
                left: columnCenter(segment.from, columnCount),
                right: `calc(100% - ${columnCenter(segment.to, columnCount)})`,
              }}
            />
          ))}
        </div>
      </div>
      {cards.map((card, index) => (
        <div
          key={index}
          className={s.cell()}
          style={{ gridColumnStart: 1 + index, gridRowStart: 3 }}
        >
          {card}
        </div>
      ))}
    </div>
  );
}

export function InactivityTimeoutExplanation({
  className,
}: {
  className?: string;
}) {
  return (
    <p className={explanationItemStyles({ surface: 'light', className })}>
      <strong className="font-medium">Inactivity:</strong> once a handler has
      produced no new journal entry for this long, Restate asks it to suspend.
      Progress is preserved and the invocation resumes when the awaited result
      arrives.
    </p>
  );
}

export function AbortTimeoutExplanation({ className }: { className?: string }) {
  return (
    <p className={explanationItemStyles({ surface: 'light', className })}>
      <strong className="font-medium">Abort:</strong> a grace period that starts
      when the inactivity timeout fires. A handler that cannot suspend, such as
      one inside <code>run()</code>, is aborted and retried once it expires.
    </p>
  );
}

export function InactivityTimeoutIllustration({
  inactivity,
  explanation = false,
  className,
}: {
  inactivity?: string | null;
  explanation?: boolean;
  className?: string;
}) {
  const s = timelineStyles();
  return (
    <div className={s.root({ className })}>
      <Section title="Inactivity timeout">
        <TimeoutStory
          label="Inactivity timeout timeline"
          columns={[
            { label: 'entry logged' },
            { label: 'suspended' },
            { label: 'result arrives' },
          ]}
          cards={[
            <InvocationCard
              status="running"
              journal="solid"
              rows={1}
              entry="ctx.sleep()"
            />,
            <InvocationCard
              status="suspended"
              journal="solid"
              rows={1}
              entry="ctx.sleep()"
            />,
            <InvocationCard
              status="running"
              journal="solid"
              rows={1}
              entry="ctx.sleep()"
              trailingRows={1}
            />,
          ]}
          segments={[
            { from: 0, to: 1 },
            { from: 1, to: 2, style: 'dashed' },
          ]}
          intervals={[
            {
              from: 0,
              to: 1,
              tone: 'info',
              name: 'inactivity',
              value: displayValue(inactivity),
            },
          ]}
        />
      </Section>
      {explanation && (
        <InactivityTimeoutExplanation className={s.sectionExplanation()} />
      )}
    </div>
  );
}

export function AbortTimeoutIllustration({
  inactivity,
  abort,
  explanation = false,
  className,
}: {
  inactivity?: string | null;
  abort?: string | null;
  explanation?: boolean;
  className?: string;
}) {
  const s = timelineStyles();
  return (
    <div className={s.root({ className })}>
      <Section title="Abort timeout">
        <TimeoutStory
          label="Abort timeout timeline"
          columns={[{ label: 'entry logged' }, {}, { label: 'aborted' }]}
          cards={[
            <InvocationCard
              status="running"
              journal="solid"
              rows={1}
              entry="ctx.run()"
            />,
            <Fragment key="inactivity">
              <InvocationCard
                status="running"
                journal="solid"
                rows={1}
                entry="ctx.run()"
              />
              <span className={s.cardNote()}>can't suspend</span>
            </Fragment>,
            <InvocationCard
              status="retrying"
              journal="solid"
              rows={1}
              entry="ctx.run()"
            />,
          ]}
          segments={[
            { from: 0, to: 1 },
            { from: 1, to: 2, style: 'warning' },
          ]}
          intervals={[
            {
              from: 0,
              to: 1,
              tone: 'info',
              name: 'inactivity',
              value: displayValue(inactivity),
            },
            {
              from: 1,
              to: 2,
              tone: 'warning',
              name: 'abort',
              value: displayValue(abort),
            },
          ]}
        />
      </Section>
      {explanation && (
        <AbortTimeoutExplanation className={s.sectionExplanation()} />
      )}
    </div>
  );
}
