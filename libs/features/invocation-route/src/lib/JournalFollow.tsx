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
const RETRY_MS = 500;
const SPRING_RATE = 7;
const UP_KEYS = new Set(['ArrowUp', 'PageUp', 'Home']);

function distanceBelowViewport(element: HTMLElement) {
  return element.getBoundingClientRect().bottom - window.innerHeight;
}

function pageTop(element: HTMLElement) {
  return element.getBoundingClientRect().top + window.scrollY;
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

function isBusy(journal: HTMLElement) {
  return hasSelectionIn(journal) || hasOpenOverlay();
}

function canGlide(distance: number) {
  return (
    distance <= window.innerHeight / 2 &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function JournalFollow({
  journalRef,
  onFollowingChange,
  isEnabled,
  isComplete,
  contentSize,
  entryCount,
}: {
  journalRef: RefObject<HTMLElement | null>;
  onFollowingChange: (isFollowing: boolean) => void;
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
  const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const glideFrame = useRef<number>(undefined);
  const velocity = useRef(0);
  const entryCountRef = useRef(entryCount);

  const stopGlide = useCallback(() => {
    velocity.current = 0;
    clearTimeout(retryTimer.current);
    if (glideFrame.current !== undefined) {
      cancelAnimationFrame(glideFrame.current);
      glideFrame.current = undefined;
    }
  }, []);

  const setFollowing = useCallback(
    (value: boolean) => {
      isFollowingRef.current = value;
      setIsFollowing(value);
      onFollowingChange(value);
      if (!value) {
        stopGlide();
      }
    },
    [onFollowingChange, stopGlide],
  );

  const scrollToEnd = useCallback(
    (shouldGlide: boolean) => {
      const journal = journalRef.current;
      if (!journal) {
        return;
      }
      const below = distanceBelowViewport(journal);
      if (shouldGlide && glideFrame.current !== undefined && canGlide(below)) {
        return;
      }
      stopGlide();
      if (below <= 0) {
        return;
      }
      if (!shouldGlide || !canGlide(below)) {
        window.scrollTo({ top: window.scrollY + below, behavior: 'instant' });
        return;
      }
      let last = 0;
      const glide = () => {
        if (isBusy(journal)) {
          velocity.current = 0;
          last = 0;
          glideFrame.current = undefined;
          retryTimer.current = setTimeout(() => {
            glideFrame.current = requestAnimationFrame(glide);
          }, RETRY_MS);
          return;
        }
        const now = performance.now();
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
        last = now;
        const remaining = distanceBelowViewport(journal);
        if (remaining <= 0.5) {
          if (remaining > 0) {
            window.scrollTo({
              top: window.scrollY + remaining,
              behavior: 'instant',
            });
          }
          velocity.current = 0;
          glideFrame.current = undefined;
          return;
        }
        const decay = Math.exp(-SPRING_RATE * dt);
        const pull = velocity.current - SPRING_RATE * remaining;
        const offset = (pull * dt - remaining) * decay;
        velocity.current = (velocity.current - SPRING_RATE * pull * dt) * decay;
        window.scrollTo({
          top: window.scrollY + offset + remaining,
          behavior: 'instant',
        });
        glideFrame.current = requestAnimationFrame(glide);
      };
      glideFrame.current = requestAnimationFrame(glide);
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
      if (isBusy(journal)) {
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
      setFollowing(false);
      if (!isBusy(journal)) {
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
    setFollowing,
  ]);

  useEffect(() => {
    const journal = journalRef.current;
    if (!isEnabled || !journal) {
      return;
    }
    let lastY = window.scrollY;
    let lastTop = pageTop(journal);
    const onScroll = () => {
      const y = window.scrollY;
      const top = pageTop(journal);
      const moved = y - lastY;
      const shifted = top - lastTop;
      const scrolled = moved - shifted;
      lastY = y;
      lastTop = top;
      const isAtEnd = distanceBelowViewport(journal) <= END_SLACK_PX;
      setIsEndInView(isAtEnd);
      if (isAtEnd) {
        setSeenCount(entryCountRef.current);
      }
      if (isFollowingRef.current) {
        if (
          moved < -1 &&
          scrolled < -1 &&
          performance.now() >= ignoreScrollUntil.current
        ) {
          setFollowing(false);
        }
      } else if (isAtEnd && moved > 0 && scrolled > 0) {
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
        !event.defaultPrevented &&
        !isTyping(event.target) &&
        (UP_KEYS.has(event.key) || (event.key === ' ' && event.shiftKey))
      ) {
        setFollowing(false);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      setFollowing(false);
      clearTimeout(retryTimer.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isEnabled, journalRef, setFollowing]);

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
