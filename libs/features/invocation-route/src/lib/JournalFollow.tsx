import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { formatPlurals } from '@restate/util-intl';

const END_SLACK_PX = 8;
const IGNORE_SCROLL_MS = 150;
const POINTER_REST_MS = 1000;
const RETRY_MS = 500;
const GLIDE_MS = 200;
const UP_KEYS = new Set(['ArrowUp', 'PageUp', 'Home']);

function distanceBelowViewport(element: HTMLElement) {
  return element.getBoundingClientRect().bottom - window.innerHeight;
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('input, textarea, select, [contenteditable]'))
  );
}

function hasSelectionIn(element: HTMLElement) {
  const selection = window.getSelection();
  return Boolean(
    selection &&
    !selection.isCollapsed &&
    selection.anchorNode &&
    element.contains(selection.anchorNode),
  );
}

function hasOpenOverlay() {
  return (
    Boolean(
      document.querySelector(
        '[data-placement]:not([role="tooltip"], [role="tooltip"] *)',
      ),
    ) || getComputedStyle(document.documentElement).overflow === 'hidden'
  );
}

function isBusy(journal: HTMLElement, lastPointerMove: number) {
  return (
    performance.now() - lastPointerMove < POINTER_REST_MS ||
    hasSelectionIn(journal) ||
    hasOpenOverlay()
  );
}

function canGlide(distance: number) {
  return (
    distance <= window.innerHeight / 2 &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function JournalFollow({
  journalRef,
  isEnabled,
  isComplete,
  contentSize,
  entryCount,
}: {
  journalRef: RefObject<HTMLElement | null>;
  isEnabled: boolean;
  isComplete: boolean;
  contentSize: number;
  entryCount: number;
}) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isEndInView, setIsEndInView] = useState(true);
  const [seenCount, setSeenCount] = useState(entryCount);
  const [wasEnabled, setWasEnabled] = useState(isEnabled);
  if (wasEnabled !== isEnabled) {
    setWasEnabled(isEnabled);
    if (!isEnabled) {
      setIsFollowing(false);
    }
  }
  const isFollowingRef = useRef(false);
  const ignoreScrollUntil = useRef(0);
  const lastScrollY = useRef(0);
  const lastPointerMove = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const glideFrame = useRef<number>(undefined);
  const entryCountRef = useRef(entryCount);

  const stopGlide = useCallback(() => {
    if (glideFrame.current !== undefined) {
      cancelAnimationFrame(glideFrame.current);
      glideFrame.current = undefined;
    }
  }, []);

  const setFollowing = useCallback(
    (value: boolean) => {
      isFollowingRef.current = value;
      setIsFollowing(value);
      if (!value) {
        stopGlide();
      }
    },
    [stopGlide],
  );

  const scrollToEnd = useCallback(
    (shouldGlide: boolean) => {
      const journal = journalRef.current;
      if (!journal) {
        return;
      }
      stopGlide();
      const below = distanceBelowViewport(journal);
      if (below <= 0) {
        return;
      }
      const from = window.scrollY;
      if (!shouldGlide || !canGlide(below)) {
        window.scrollTo({ top: from + below, behavior: 'instant' });
        return;
      }
      const start = performance.now();
      function step() {
        const progress = Math.min(1, (performance.now() - start) / GLIDE_MS);
        window.scrollTo({
          top: from + below * (1 - (1 - progress) ** 3),
          behavior: 'instant',
        });
        glideFrame.current =
          progress < 1 ? requestAnimationFrame(step) : undefined;
      }
      glideFrame.current = requestAnimationFrame(step);
    },
    [journalRef, stopGlide],
  );

  const keepUp = useCallback(
    function keepUp() {
      clearTimeout(retryTimer.current);
      const journal = journalRef.current;
      if (!journal || !isFollowingRef.current) {
        return;
      }
      if (isBusy(journal, lastPointerMove.current)) {
        retryTimer.current = setTimeout(keepUp, RETRY_MS);
        return;
      }
      scrollToEnd(true);
    },
    [journalRef, scrollToEnd],
  );

  useLayoutEffect(() => {
    entryCountRef.current = entryCount;
    const journal = journalRef.current;
    if (!journal) {
      return;
    }
    ignoreScrollUntil.current = performance.now() + IGNORE_SCROLL_MS;
    const isAtEnd = distanceBelowViewport(journal) <= END_SLACK_PX;
    setIsEndInView(isAtEnd);
    if (!isEnabled || isFollowingRef.current || isAtEnd) {
      setSeenCount(entryCount);
    }
    if (isEnabled) {
      keepUp();
    } else if (isComplete && isFollowingRef.current) {
      isFollowingRef.current = false;
      if (!isBusy(journal, lastPointerMove.current)) {
        scrollToEnd(false);
      }
    }
  }, [
    contentSize,
    entryCount,
    isComplete,
    isEnabled,
    journalRef,
    keepUp,
    scrollToEnd,
  ]);

  useEffect(() => {
    const journal = journalRef.current;
    if (!isEnabled || !journal) {
      return;
    }
    lastScrollY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const previousY = lastScrollY.current;
      lastScrollY.current = y;
      const isAtEnd = distanceBelowViewport(journal) <= END_SLACK_PX;
      setIsEndInView(isAtEnd);
      if (isAtEnd) {
        setSeenCount(entryCountRef.current);
      }
      if (isFollowingRef.current) {
        if (
          y < previousY - 1 &&
          performance.now() >= ignoreScrollUntil.current
        ) {
          setFollowing(false);
        }
      } else if (isAtEnd && y > previousY) {
        setFollowing(true);
      }
    };
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0 && isFollowingRef.current) {
        setFollowing(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        isFollowingRef.current &&
        !isTyping(event.target) &&
        (UP_KEYS.has(event.key) || (event.key === ' ' && event.shiftKey))
      ) {
        setFollowing(false);
      }
    };
    const onPointerMove = () => {
      lastPointerMove.current = performance.now();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    journal.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      isFollowingRef.current = false;
      clearTimeout(retryTimer.current);
      stopGlide();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      journal.removeEventListener('pointermove', onPointerMove);
    };
  }, [isEnabled, journalRef, setFollowing, stopGlide]);

  if (!isEnabled || isFollowing || isEndInView) {
    return null;
  }

  const newCount = Math.max(0, entryCount - seenCount);

  return (
    <div className="pointer-events-none sticky bottom-6 z-20 flex h-0 items-start justify-center">
      <Button
        variant="secondary"
        className="pointer-events-auto flex -translate-y-full items-center gap-1.5 rounded-full bg-surface/80 py-1.5 pr-4 pl-3 text-secondary shadow-lg shadow-default/5 backdrop-blur-xl backdrop-saturate-200 pressed:scale-95 pressed:shadow-xs"
        onClick={() => {
          setFollowing(true);
          setSeenCount(entryCount);
          scrollToEnd(true);
        }}
      >
        <Icon name={IconName.ArrowDown} className="h-3.5 w-3.5 shrink-0" />
        {newCount > 0
          ? `${newCount} new ${formatPlurals(newCount, {
              one: 'entry',
              other: 'entries',
            })}`
          : 'Latest entries'}
      </Button>
    </div>
  );
}
