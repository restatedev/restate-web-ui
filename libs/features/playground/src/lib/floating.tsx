import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { useRestateContext } from '@restate/features-restate-context';
import { useOnboarding } from '@restate/util-feature-flag';
import { tv } from '@restate/util-styles';

const hintStyles = tv({
  slots: {
    layer: 'fixed z-200000 w-max max-w-sm',
    bubble:
      'relative rounded-xl border border-inverse bg-inverse/90 px-3 py-2 pr-8 text-0.5xs text-inverse-secondary shadow-[inset_0_0.5px_0_0_var(--box-shadow-color-inverse-edge)] drop-shadow-xl backdrop-blur-xl',
    arrow: 'absolute h-1.5 w-2.5 -translate-x-1/2',
  },
  variants: {
    side: {
      bottom: { arrow: '-top-1.5 rotate-180' },
      top: { arrow: '-bottom-1.5' },
    },
    isMeasured: {
      true: { layer: 'visible' },
      false: { layer: 'invisible' },
    },
  },
});

type HintPlacement = 'bottom start' | 'bottom end' | 'top start' | 'top end';

type HintLayout = {
  top: number;
  left: number;
  arrowLeft: number;
  side: 'top' | 'bottom';
  isMeasured: boolean;
};

const HINT_GAP = 10;
const HINT_MARGIN = 8;

function useHintLayout(
  anchorRef: RefObject<HTMLElement | null>,
  bubbleRef: RefObject<HTMLElement | null>,
  placement: HintPlacement,
) {
  const [layout, setLayout] = useState<HintLayout | null>(null);
  useEffect(() => {
    let frame: number;
    let previous = '';
    const update = () => {
      const anchor = anchorRef.current;
      const rect =
        anchor && anchor.getClientRects().length > 0
          ? anchor.getBoundingClientRect()
          : null;
      const bubble = bubbleRef.current;
      const width = bubble?.offsetWidth ?? 0;
      const height = bubble?.offsetHeight ?? 0;
      let next: HintLayout | null = null;
      if (rect) {
        const [preferred, align] = placement.split(' ') as [
          'top' | 'bottom',
          'start' | 'end',
        ];
        const fitsBelow =
          rect.bottom + HINT_GAP + height + HINT_MARGIN <= window.innerHeight;
        const fitsAbove = rect.top - HINT_GAP - height - HINT_MARGIN >= 0;
        const side =
          preferred === 'bottom'
            ? fitsBelow || !fitsAbove
              ? 'bottom'
              : 'top'
            : fitsAbove || !fitsBelow
              ? 'top'
              : 'bottom';
        const rawLeft = align === 'start' ? rect.left : rect.right - width;
        const left = Math.min(
          Math.max(rawLeft, HINT_MARGIN),
          Math.max(HINT_MARGIN, window.innerWidth - width - HINT_MARGIN),
        );
        const top =
          side === 'bottom'
            ? rect.bottom + HINT_GAP
            : rect.top - HINT_GAP - height;
        const anchorCenter = rect.left + Math.min(rect.width / 2, 24);
        const arrowLeft = Math.min(
          Math.max(anchorCenter - left, 14),
          Math.max(14, width - 14),
        );
        next = {
          top: Math.round(top),
          left: Math.round(left),
          arrowLeft: Math.round(arrowLeft),
          side,
          isMeasured: width > 0,
        };
      }
      const key = JSON.stringify(next);
      if (key !== previous) {
        previous = key;
        setLayout(next);
      }
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [anchorRef, bubbleRef, placement]);
  return layout;
}

function useTopLayer(anchorRef: RefObject<HTMLElement | null>) {
  const [container] = useState(() => {
    if (typeof document === 'undefined') {
      return null;
    }
    const element = document.createElement('div');
    element.setAttribute('data-react-aria-top-layer', 'true');
    return element;
  });
  useEffect(() => {
    if (!container) {
      return;
    }
    const host = anchorRef.current?.closest('[role=dialog]') ?? document.body;
    host.appendChild(container);
    return () => container.remove();
  }, [anchorRef, container]);
  return container;
}

function FloatingLayer({
  anchorRef,
  placement,
  className,
  arrowClassName,
  layerRef,
  id,
  role,
  ariaLabel,
  autoFocus,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  placement: HintPlacement;
  className?: string;
  arrowClassName?: string;
  layerRef?: RefObject<HTMLDivElement | null>;
  id?: string;
  role?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
  children: ReactNode;
}) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const container = useTopLayer(anchorRef);
  const layout = useHintLayout(anchorRef, bubbleRef, placement);
  const isMeasured = Boolean(layout?.isMeasured);
  useEffect(() => {
    if (autoFocus && isMeasured) {
      bubbleRef.current?.focus();
    }
  }, [autoFocus, isMeasured]);
  const styles = hintStyles({
    side: layout?.side ?? 'bottom',
    isMeasured,
  });
  if (!container || !layout) {
    return null;
  }
  return createPortal(
    <div
      ref={layerRef}
      className={styles.layer()}
      style={{ top: layout.top, left: layout.left }}
    >
      <div
        ref={bubbleRef}
        id={id}
        role={role}
        aria-label={ariaLabel}
        tabIndex={-1}
        className={className}
      >
        {arrowClassName && (
          <svg
            viewBox="0 0 10 6"
            aria-hidden
            className={styles.arrow({ className: arrowClassName })}
            style={{ left: layout.arrowLeft }}
          >
            <path d="M0 0 L5 6 L10 0" />
          </svg>
        )}
        {children}
      </div>
    </div>,
    container,
  );
}

function AnchoredHint({
  children,
  content,
  placement,
  onDismiss,
}: {
  children: ReactNode;
  content: ReactNode;
  placement: HintPlacement;
  onDismiss: () => void;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const styles = hintStyles();
  return (
    <>
      <div ref={anchorRef} className="inline-flex">
        {children}
      </div>
      <FloatingLayer
        anchorRef={anchorRef}
        placement={placement}
        className={styles.bubble()}
        arrowClassName="fill-inverse"
      >
        {content}
        <Button
          variant="icon"
          aria-label="Dismiss"
          className="absolute top-1 right-1 hover:bg-inverse-emphasis"
          onClick={onDismiss}
        >
          <Icon
            name={IconName.X}
            className="h-3.5 w-3.5 text-inverse-secondary"
          />
        </Button>
      </FloatingLayer>
    </>
  );
}

type HintStage = 'playground-run' | 'playground-result';

const dismissedStages = new Set<HintStage>();

export function Hint({
  stage,
  service,
  isShown = true,
  placement = 'bottom start',
  content,
  children,
}: {
  stage: HintStage;
  service?: string;
  isShown?: boolean;
  placement?: HintPlacement;
  content: ReactNode;
  children: ReactNode;
}) {
  const { OnboardingGuide } = useRestateContext();
  const isOnboarding = useOnboarding();
  const [isDismissed, setIsDismissed] = useState(() =>
    dismissedStages.has(stage),
  );
  if (!isShown) {
    return children;
  }
  if (OnboardingGuide) {
    return (
      <OnboardingGuide stage={stage} service={service}>
        {children}
      </OnboardingGuide>
    );
  }
  if (!isOnboarding || isDismissed) {
    return children;
  }
  return (
    <AnchoredHint
      content={content}
      placement={placement}
      onDismiss={() => {
        dismissedStages.add(stage);
        setIsDismissed(true);
      }}
    >
      {children}
    </AnchoredHint>
  );
}

function Em({ children }: { children: ReactNode }) {
  return <span className="font-medium text-inverse">{children}</span>;
}

export function runHint(label: string) {
  return (
    <>
      Press <Em>{label}</Em> to start an <Em>invocation</Em> with this input
    </>
  );
}

export const RESULT_HINT = (
  <>
    Open the <Em>invocation</Em> to see each step Restate recorded in its{' '}
    <Em>journal</Em>
  </>
);

const peekButtonStyles = tv({
  base: 'flex h-5 w-5 items-center justify-center rounded-md text-subtle outline-offset-2 outline-focus hover:bg-tint-subtle hover:text-secondary focus-visible:outline-2',
  variants: {
    isOpen: { true: 'bg-tint-subtle text-secondary' },
  },
});

const peekPanelStyles = tv({
  base: 'rounded-xl border border-tint bg-overlay p-3 shadow-lg outline-hidden',
});

export function Peek({
  label,
  panelClassName,
  children,
}: {
  label: string;
  panelClassName?: string;
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [shouldFocus, setShouldFocus] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const schedule = (open: boolean, delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setIsOpen(open), delay);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent) {
        if (event.key !== 'Escape') {
          return;
        }
        event.stopPropagation();
        event.preventDefault();
        if (layerRef.current?.contains(document.activeElement)) {
          triggerRef.current?.focus();
        }
      } else {
        const target = event.target as Node | null;
        if (
          triggerRef.current?.contains(target) ||
          layerRef.current?.contains(target)
        ) {
          return;
        }
      }
      clearTimeout(timer.current);
      setIsPinned(false);
      setIsOpen(false);
    };
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('keydown', close, true);
    return () => {
      document.removeEventListener('pointerdown', close, true);
      document.removeEventListener('keydown', close, true);
    };
  }, [isOpen]);
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        className={peekButtonStyles({ isOpen })}
        onPointerEnter={() => !isPinned && schedule(true, 600)}
        onPointerLeave={() => !isPinned && schedule(false, 120)}
        onClick={(event) => {
          clearTimeout(timer.current);
          const next = !isPinned;
          setShouldFocus(next && event.detail === 0);
          setIsPinned(next);
          setIsOpen(next);
        }}
      >
        <Icon name={IconName.Info} className="h-3.5 w-3.5" />
      </button>
      {isOpen && (
        <FloatingLayer
          anchorRef={triggerRef}
          placement="bottom start"
          layerRef={layerRef}
          id={panelId}
          role="dialog"
          ariaLabel={label}
          autoFocus={shouldFocus}
          className={peekPanelStyles({ className: panelClassName })}
        >
          <div
            onPointerEnter={() => clearTimeout(timer.current)}
            onPointerLeave={() => !isPinned && schedule(false, 120)}
          >
            {children}
          </div>
        </FloatingLayer>
      )}
    </>
  );
}

export function InfoPeek({
  label,
  href,
  children,
}: {
  label: string;
  href?: string;
  children: ReactNode;
}) {
  return (
    <Peek
      label={`About ${label}`}
      panelClassName="w-72 text-xs leading-relaxed text-secondary"
    >
      <p>{children}</p>
      {href && (
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-block text-xs"
        >
          Learn more
        </Link>
      )}
    </Peek>
  );
}
