import { type RefObject, useCallback } from 'react';

function createRing(parent: HTMLElement, delay: number) {
  const ring = document.createElement('div');
  ring.style.position = 'absolute';
  ring.style.inset = '0';
  ring.style.borderRadius = '50%';
  ring.style.pointerEvents = 'none';
  ring.style.border = '3px solid rgba(255,255,255,0.6)';
  ring.style.zIndex = '-1';
  parent.appendChild(ring);

  ring.animate(
    [
      { transform: 'scale(0.5)', opacity: '0.6' },
      { transform: 'scale(4)', opacity: '0' },
    ],
    { duration: 1800, delay, easing: 'ease-out', fill: 'forwards' },
  ).onfinish = () => ring.remove();
}

function createSweep(card: HTMLElement, delay: number) {
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.inset = '0';
  overlay.style.zIndex = '50';
  overlay.style.overflow = 'hidden';
  overlay.style.borderRadius = 'inherit';
  overlay.style.pointerEvents = 'none';
  card.appendChild(overlay);

  const sweep = document.createElement('div');
  sweep.style.position = 'absolute';
  sweep.style.left = '-20%';
  sweep.style.right = '-20%';
  sweep.style.height = '120%';
  sweep.style.background =
    'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.25) 45%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.25) 55%, rgba(255,255,255,0.08) 80%, transparent 100%)';
  overlay.appendChild(sweep);

  sweep.animate(
    [{ transform: 'translateY(-120%)' }, { transform: 'translateY(120%)' }],
    { duration: 700, delay, easing: 'ease-in-out', fill: 'both' },
  ).onfinish = () => overlay.remove();
}

function bounceCard(card: HTMLElement, delay: number) {
  card.animate(
    [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-4px)' },
      { transform: 'translateY(2px)' },
      { transform: 'translateY(0)' },
    ],
    { duration: 600, delay, easing: 'ease-out' },
  );
}

export function useWaveAnimation() {
  const triggerWave = useCallback(
    (originRef: RefObject<HTMLElement | null>, targetSelector: string) => {
      const originEl = originRef.current;
      if (!originEl) return;

      const originRect = originEl.getBoundingClientRect();
      const originCenterY = originRect.top + originRect.height / 2;

      requestAnimationFrame(() => {
        const el = originRef.current;
        if (el) {
          for (let i = 0; i < 2; i++) {
            createRing(el, i * 300);
          }
        }

        const cards = document.querySelectorAll<HTMLElement>(targetSelector);
        cards.forEach((card) => {
          const cardRect = card.getBoundingClientRect();
          const distance = cardRect.top - originCenterY;
          const delay = Math.max(0, (distance / 1500) * 1000);
          createSweep(card, delay);
          bounceCard(card, delay + 300);
        });
      });
    },
    [],
  );

  return { triggerWave };
}
