import { type Ref, useRef, useState } from 'react';
import { tv } from '@restate/util-styles';

const SPLIT_PROPERTY = '--journal-split';
const MIN_SPLIT_PERCENT = 20;
const MAX_SPLIT_PERCENT = 80;
const KEYBOARD_STEP_PERCENT = 5;

export const journalSplitStyles = tv({
  slots: {
    columns: 'md:grid-cols-[var(--journal-split)_minmax(0,1fr)]',
    timelineOverlay: 'ml-(--journal-split) w-[calc(100%-var(--journal-split))]',
    separator:
      'group absolute inset-y-0 left-(--journal-split) z-10 hidden w-2.5 -translate-x-1/2 cursor-col-resize touch-none outline-none md:block',
    separatorLine:
      'absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 cursor-col-resize bg-transparent group-hover:w-0.5 group-hover:bg-accent group-focus-visible:w-0.5 group-focus-visible:bg-accent',
  },
});

function clampSplit(percent: number) {
  return Math.min(MAX_SPLIT_PERCENT, Math.max(MIN_SPLIT_PERCENT, percent));
}

function getCommonAncestor(a: HTMLElement, b: HTMLElement) {
  let node: HTMLElement | null = a;
  while (node && !node.contains(b)) {
    node = node.parentElement;
  }
  return node;
}

function getKeyboardSplit(key: string, percent: number) {
  switch (key) {
    case 'ArrowLeft':
      return percent - KEYBOARD_STEP_PERCENT;
    case 'ArrowRight':
      return percent + KEYBOARD_STEP_PERCENT;
    case 'Home':
      return MIN_SPLIT_PERCENT;
    case 'End':
      return MAX_SPLIT_PERCENT;
    default:
      return undefined;
  }
}

export interface JournalSplit {
  headerRef: (element: HTMLElement | null) => void;
  bodyRef: (element: HTMLElement | null) => void;
  separatorRef: (element: HTMLElement | null) => void;
  getPercent: () => number;
  setPercent: (percent: number) => void;
}

function createJournalSplit(initialPercent: number): JournalSplit {
  let percent = initialPercent;
  let header: HTMLElement | null = null;
  let body: HTMLElement | null = null;
  let separator: HTMLElement | null = null;
  let scope: HTMLElement | null = null;

  const apply = () => {
    scope?.style.setProperty(SPLIT_PROPERTY, `${percent}%`);
    separator?.setAttribute('aria-valuenow', String(Math.round(percent)));
  };

  const updateScope = () => {
    const nextScope =
      header && body ? getCommonAncestor(header, body) : (header ?? body);
    if (nextScope !== scope) {
      scope?.style.removeProperty(SPLIT_PROPERTY);
      scope = nextScope;
    }
    apply();
  };

  return {
    headerRef: (element) => {
      header = element;
      updateScope();
    },
    bodyRef: (element) => {
      body = element;
      updateScope();
    },
    separatorRef: (element) => {
      separator = element;
      apply();
    },
    getPercent: () => percent,
    setPercent: (nextPercent) => {
      percent = clampSplit(nextPercent);
      apply();
    },
  };
}

export function useJournalSplit(entriesFraction: number) {
  const [split] = useState(() =>
    createJournalSplit(clampSplit(entriesFraction * 100)),
  );
  return split;
}

interface JournalSplitSeparatorProps {
  ref: Ref<HTMLDivElement>;
  split: JournalSplit;
  controls: string;
}

export function JournalSplitSeparator({
  ref,
  split,
  controls,
}: JournalSplitSeparatorProps) {
  const dragRef = useRef<{ left: number; width: number; offset: number }>(null);
  const { separator, separatorLine } = journalSplitStyles();

  return (
    <div
      ref={ref}
      role="separator"
      tabIndex={0}
      aria-label="Resize journal entries"
      aria-controls={controls}
      aria-orientation="vertical"
      aria-valuemin={MIN_SPLIT_PERCENT}
      aria-valuemax={MAX_SPLIT_PERCENT}
      data-separator
      className={separator()}
      onPointerDown={(event) => {
        const container = event.currentTarget.parentElement;
        const containerRect = container?.getBoundingClientRect();
        if (event.button !== 0 || !containerRect?.width) {
          return;
        }
        event.preventDefault();
        const separatorRect = event.currentTarget.getBoundingClientRect();
        dragRef.current = {
          left: containerRect.left,
          width: containerRect.width,
          offset:
            event.clientX - (separatorRect.left + separatorRect.width / 2),
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag) {
          return;
        }
        split.setPercent(
          ((event.clientX - drag.offset - drag.left) / drag.width) * 100,
        );
      }}
      onLostPointerCapture={() => {
        dragRef.current = null;
      }}
      onKeyDown={(event) => {
        const nextPercent = getKeyboardSplit(event.key, split.getPercent());
        if (nextPercent === undefined) {
          return;
        }
        event.preventDefault();
        split.setPercent(nextPercent);
      }}
    >
      <div className={separatorLine()} />
    </div>
  );
}
