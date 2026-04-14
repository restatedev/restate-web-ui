import { Button } from '@restate/ui/button';
import { PropsWithChildren, useEffect, useRef } from 'react';
import { FerrofluidCanvas, type FerrofluidHandle } from './Ferrofluid';
import { tv } from '@restate/util/styles';
import type { FerrofluidStatus } from './ferrofluid-engine';
import { useServerAura, ServerRings } from './ServerAura';

export type { FerrofluidStatus };

export type AuraIntensity = 'subtle' | 'prominent';
export type ServerAppearance = 'ghost' | 'solid';

const containerStyles = tv({
  base: 'group/server relative h-[150px] min-w-[150px]',
});

const buttonStyles = tv({
  base: 'group flex h-[142px] w-[142px] border-none bg-none px-0 py-0 shadow-none drop-shadow-none transition-all duration-300 hover:scale-105 hover:bg-transparent focus:outline-hidden pressed:scale-95 pressed:bg-transparent [&:hover:has([data-status=active])_.server]:filter-[drop-shadow(0_4px_3px_--theme(--color-zinc-800/6%))_drop-shadow(0_10px_8px_--theme(--color-blue-400/12%))_drop-shadow(0_24px_18px_--theme(--color-blue-400/8%))]',
  variants: {
    isEmpty: {
      true: 'relative m-[4px]',
      false: 'absolute inset-1',
    },
  },
});

const overlayStyles = tv({
  base: '',
  variants: {
    appearance: {
      ghost:
        'opacity-0 transition-opacity duration-300 group-hover/server:opacity-100',
      solid: '',
    },
  },
  defaultVariants: { appearance: 'ghost' },
});

const serverIconStyles = tv({
  base: 'server absolute inset-0 group-pressed:[filter:drop-shadow(0_2px_2px_theme(colors.zinc.800/3%))_drop-shadow(0_1px_1px_theme(colors.zinc.800/5%))]',
  variants: {
    appearance: {
      ghost:
        'filter-none transition-[filter] duration-300 group-hover/server:filter-[drop-shadow(0_4px_3px_--theme(--color-zinc-800/3%))_drop-shadow(0_2px_2px_--theme(--color-zinc-800/5%))]',
      solid:
        'filter-[drop-shadow(0_10px_8px_--theme(--color-zinc-800/5%))_drop-shadow(0_4px_3px_--theme(--color-zinc-800/10%))]',
    },
  },
  defaultVariants: { appearance: 'ghost' },
});

const borderFillStyles = tv({
  base: '',
  variants: {
    appearance: {
      ghost: 'fill-white/40 stroke-gray-300/25',
      solid:
        'border fill-gray-100/60 stroke-gray-300/60 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]',
    },
  },
  defaultVariants: { appearance: 'ghost' },
});

const serverFillStyles = tv({
  base: '',
  variants: {
    appearance: {
      ghost:
        'fill-gray-100/85 transition-[fill] duration-300 group-hover/server:fill-white/70',
      solid: 'fill-white/70 backdrop-blur-3xl backdrop-saturate-200',
    },
  },
  defaultVariants: { appearance: 'ghost' },
});

export function RestateServer({
  className,
  children,
  status,
  isEmpty = false,
  onPress,
  aura,
  appearance = 'ghost',
}: PropsWithChildren<{
  className?: string;
  status: FerrofluidStatus;
  isEmpty?: boolean;
  onPress?: () => void;
  aura?: AuraIntensity;
  appearance?: ServerAppearance;
}>) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const ferrofluidRef = useRef<FerrofluidHandle>(null);
  const auraRef = useRef<HTMLDivElement>(null);
  useServerAura(auraRef, status, aura);

  useEffect(() => {
    const button = buttonRef.current;
    const handler = (e: MouseEvent) => {
      if (!button) return;
      const rect = button.getBoundingClientRect();
      if (rect.width === 0) return;
      ferrofluidRef.current?.mouseMove(
        (e.clientX - rect.left) / rect.width,
        (e.clientY - rect.top) / rect.height,
      );
    };
    button?.addEventListener('mousemove', handler);
    return () => {
      button?.removeEventListener('mousemove', handler);
    };
  }, []);

  return (
    <div className={containerStyles({ className })}>
      {aura && (
        <div
          ref={auraRef}
          className={overlayStyles({
            appearance,
            class: 'pointer-events-none absolute inset-0 overflow-visible',
          })}
        >
          <ServerRings status={status} intensity={aura} />
        </div>
      )}
      {!isEmpty && (
        <svg
          viewBox="0 0 120 120"
          fill="none"
          className={overlayStyles({ appearance, class: 'absolute inset-0' })}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M60 0C10.59 0 0 10.59 0 60C0 109.41 10.59 120 60 120C109.41 120 120 109.41 120 60C120 10.59 109.41 0 60 0Z"
            className={borderFillStyles({ appearance })}
          />
        </svg>
      )}
      <Button
        onClick={(e) => {
          const rect = buttonRef.current?.getBoundingClientRect();
          if (rect && rect.width > 0) {
            ferrofluidRef.current?.click(
              (e.x - rect.left) / rect.width,
              (e.y - rect.top) / rect.height,
            );
          }
          onPress?.();
        }}
        ref={buttonRef}
        className={buttonStyles({ isEmpty })}
      >
        <FerrofluidCanvas
          ref={ferrofluidRef}
          status={status}
          className="absolute inset-0"
        />
        <svg
          viewBox="0 0 120 120"
          fill="none"
          className={overlayStyles({ appearance, class: 'absolute inset-0' })}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M60 0C10.59 0 0 10.59 0 60C0 109.41 10.59 120 60 120C109.41 120 120 109.41 120 60C120 10.59 109.41 0 60 0Z"
            className="background fill-white/20 backdrop-blur-lg backdrop-saturate-200"
          />
        </svg>
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={serverIconStyles({ appearance })}
        >
          <mask id="restate-logo-mask">
            <rect width="120" height="120" fill="white" />
            <g>
              <path
                d="M43.6831 47.9347C43.238 48.6013 43 49.3889 43 50.195V73.0429C43 73.8188 43.86 74.2711 44.4811 73.8219L46.7463 72.1839C47.3731 71.7306 47.7455 70.9963 47.7455 70.2134V53.2027C47.7455 52.7307 48.2679 52.4546 48.6468 52.7265L58.6944 59.9365C59.0214 60.1711 59.0169 60.6664 58.6857 60.895L55.473 63.1117C54.3788 63.8667 54.1068 65.3898 54.8699 66.489C55.6175 67.5658 57.0775 67.8278 58.1415 67.076L63.0318 63.6206C64.0796 62.8803 64.7046 61.6639 64.7046 60.3651C64.7046 59.0915 64.1035 57.8956 63.0892 57.1509L48.6051 46.5165C47.0324 45.5379 44.9824 45.9886 43.946 47.5408L43.6831 47.9347Z"
                fill="black"
              />
              <path
                d="M58.7713 47.0291C58.019 48.1128 58.2649 49.6116 59.3223 50.3872L72.1304 59.7826C72.4408 60.0103 72.4485 60.4781 72.1458 60.7163L61.4445 69.1358C60.4247 69.9382 60.2184 71.422 60.9793 72.4811C61.7666 73.5769 63.2846 73.799 64.3429 72.9733L76.3875 63.5753C77.404 62.7822 78 61.5524 78 60.2483C78 58.8988 77.362 57.6318 76.2859 56.8444L62.0949 46.4613C61.0244 45.6781 59.5324 45.9329 58.7713 47.0291Z"
                fill="black"
              />
            </g>
          </mask>
          <path
            d="M60 0C10.59 0 0 10.59 0 60C0 109.41 10.59 120 60 120C109.41 120 120 109.41 120 60C120 10.59 109.41 0 60 0Z"
            className={serverFillStyles({ appearance })}
            mask="url(#restate-logo-mask)"
          />
        </svg>
      </Button>
      {children}
    </div>
  );
}
