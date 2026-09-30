const FAST_SCROLL_PX_PER_MS = 3;
const FAST_SCROLL_JUMP_PX = 600;
const SETTLE_MS = 150;

let lastScrollY = 0;
let lastScrollTime = 0;
let fastUntil = 0;
let isListening = false;

function onScroll() {
  const now = performance.now();
  const y = window.scrollY;
  const elapsed = now - lastScrollTime;
  const distance = Math.abs(y - lastScrollY);
  if (
    distance > FAST_SCROLL_JUMP_PX ||
    (elapsed > 0 && elapsed < 250 && distance / elapsed > FAST_SCROLL_PX_PER_MS)
  ) {
    fastUntil = now + SETTLE_MS;
  }
  lastScrollY = y;
  lastScrollTime = now;
}

function listen() {
  if (isListening || typeof window === 'undefined') return;
  isListening = true;
  lastScrollY = window.scrollY;
  lastScrollTime = performance.now();
  window.addEventListener('scroll', onScroll, { capture: true, passive: true });
}

export function isScrollingFast() {
  listen();
  return performance.now() < fastUntil;
}

export function afterFastScroll(callback: () => void) {
  const check = () => {
    const remaining = fastUntil - performance.now();
    if (remaining > 0) {
      setTimeout(check, remaining);
      return;
    }
    callback();
  };
  setTimeout(check, Math.max(0, fastUntil - performance.now()));
}
