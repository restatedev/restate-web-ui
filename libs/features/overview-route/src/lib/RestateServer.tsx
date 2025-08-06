import { Button } from '@restate/ui/button';
import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { Blob } from './canvas';
import { tv } from 'tailwind-variants';
import { useRestateContext } from '@restate/features/restate-context';
import {
  useIsFetching,
  useIsMutating,
  useQueryClient,
} from '@tanstack/react-query';

const styles = tv({
  base: 'min-w-[150px] h-[150px] relative',
});
const buttonStyles = tv({
  base: 'flex w-[142px] h-[142px]  focus:outline-none bg-none group hover:bg-transparent pressed:bg-transparent shadow-none py-0 px-0 border-none hover:scale-105 pressed:scale-95 [&:not(:hover):has([data-status=active])]:scale-[1.025] [&:has([data-status=pause])_canvas]:hue-rotate-180 [&:has([data-status=active])_.server]:filter-[drop-shadow(0_6px_3px_--theme(--color-zinc-800/5%))_drop-shadow(0_10px_8px_--theme(--color-blue-500/20%))]',
  variants: {
    isEmpty: {
      true: 'm-[4px] relative',
      false: 'absolute inset-1',
    },
  },
});
export function RestateServer({
  className,
  children,
  isError = false,
  isEmpty = false,
}: PropsWithChildren<{
  className?: string;
  isError?: boolean;
  isEmpty?: boolean;
}>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [blob] = useState(new Blob());
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const isAnimating = useRef(false);

  const isFetching =
    useIsFetching({
      predicate(query) {
        return Boolean(query.meta?.isAdmin);
      },
    }) > 0;
  const isMutating =
    useIsMutating({
      predicate(query) {
        return Boolean(query.meta?.isAdmin);
      },
    }) > 0;

  const queryClient = useQueryClient();

  const { status } = useRestateContext();

  const isHealthy = status === 'HEALTHY';
  const isActive = isFetching || isMutating;

  if ((!isHealthy || isError) && blob.status !== 'pause') {
    blob.status = 'pause';
    timeoutRef.current && clearTimeout(timeoutRef.current);
  }

  if (isHealthy && isActive && blob.status !== 'active') {
    blob.status = 'active';
  }

  if (isHealthy && !isActive && blob.status !== 'idle' && !timeoutRef.current) {
    timeoutRef.current = setTimeout(() => {
      blob.status = !isHealthy || isError ? 'pause' : 'idle';
      timeoutRef.current = null;
    }, 2000);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const button = buttonRef.current;
    const handler = (e: MouseEvent) => {
      blob.mouseMove(e);
    };
    const resizeHandler = () => {
      if (canvas && window.innerWidth > 1024 && !blob.isInitialized) {
        blob.init(canvas);
      }

      if (window.innerWidth <= 1024) {
        blob.cleanup();
      }
    };

    resizeHandler();

    button?.addEventListener('mousemove', handler);
    window?.addEventListener('resize', resizeHandler);

    return () => {
      window?.removeEventListener('resize', resizeHandler);
      button?.removeEventListener('mousemove', handler);
      blob.cleanup();
    };
  }, [blob]);

  return (
    <div className={styles({ className })}>
      {!isEmpty && (
        <svg
          viewBox="0 0 120 120"
          fill="none"
          className="absolute inset-0"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M60 0C10.59 0 0 10.59 0 60C0 109.41 10.59 120 60 120C109.41 120 120 109.41 120 60C120 10.59 109.41 0 60 0Z"
            className="fill-gray-200/50 stroke-gray-200 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] border"
          />
        </svg>
      )}
      <Button
        onClick={(e) => {
          blob.click({ x: e.x, y: e.y });
          queryClient.refetchQueries(
            {
              predicate(query) {
                return Boolean(query.meta?.isAdmin);
              },
            },
            { cancelRefetch: true }
          );
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              blob.status = 'idle';
              timeoutRef.current = null;
            }, 2000);
          }
          if (isAnimating.current) {
            return;
          }
          isAnimating.current = true;
          try {
            const elements = Array.from(
              document.querySelectorAll('[data-anchor]')
            )
              .filter((el) => el instanceof HTMLElement)
              .filter((el) => {
                const rect = el.getBoundingClientRect();
                return rect.bottom >= 0 && rect.bottom <= window.innerHeight;
              });

            elements.filter(async (el) => {
              const rect = el.getBoundingClientRect();

              let { x } = rect;
              const { y } = rect;
              const beamEl = document.createElement('div');
              beamEl.style.position = 'absolute';
              beamEl.style.width = '2px';
              beamEl.style.height = '2px';
              beamEl.style.left = '50%';
              beamEl.style.top = '50%';
              beamEl.style.zIndex = '-100000';
              beamEl.style.borderRadius = '2px';
              beamEl.style.opacity = '30%';
              beamEl.style.background =
                'linear-gradient(to right, rgba(69, 82, 204, 1) 0%, rgba(69, 82, 204, 0) 100%)';

              buttonRef.current?.appendChild(beamEl);
              const beamElPosition = beamEl.getBoundingClientRect();
              if (beamElPosition.x < x) {
                x -= 30;
              } else {
                x += 10;
              }
              let angle =
                Math.PI / 2 -
                Math.atan((beamElPosition.x - x) / (beamElPosition.y - y));

              if (beamElPosition.y < y) {
                angle = angle + Math.PI;
              }

              beamEl.style.transform = `rotate(${angle}rad)`;

              const animation = beamEl.animate(
                [
                  {
                    transform: `translateY(0px) translateX(0px) rotate(${angle}rad)`,
                    width: '2px',
                  },
                  {
                    transform: `translateY(${
                      y - beamElPosition.y
                    }px) translateX(${
                      x - beamElPosition.x
                    }px) rotate(${angle}rad)`,
                    width: '30px',
                  },
                ],
                { duration: 1000, easing: 'ease-in' }
              );
              await animation.finished;
              animation.cancel();

              beamEl.remove();
              const isSelected = el.parentElement?.dataset.selected === 'true';
              const originalScale = isSelected ? 1.05 : 1;
              const targetAnimation = el.parentElement?.animate(
                [
                  { transform: `scale(${originalScale})` },
                  { transform: `scale(${originalScale * 1.02})` },
                ],
                { duration: 300, fill: 'both', easing: 'ease-in' }
              );
              el.style.backgroundColor = 'rgb(69, 82, 204)';
              const ripple = el.animate(
                [
                  {
                    width: '0px',
                    opacity: 0,
                    height: '200%',
                    transform: 'translateY(-50%)',
                  },
                  {
                    width: '100%',
                    opacity: 0.03,
                    height: '200%',
                    transform: 'translateY(-50%)',
                  },
                  {
                    width: '150%',
                    opacity: 0.0,
                    height: '200%',
                    transform: 'translateY(-50%)',
                  },
                  {
                    width: '150%',
                    opacity: 0.0,
                    height: '0',
                    transform: 'translateY(0)',
                  },
                ],
                { duration: 1000, easing: 'ease-in' }
              );
              await Promise.all([
                ripple.finished,
                targetAnimation?.finished.then(() => {
                  targetAnimation.reverse();
                  return targetAnimation.finished;
                }),
              ]);
              targetAnimation?.cancel();
              ripple.cancel();
              isAnimating.current = false;
            });
          } catch (_) {
            isAnimating.current = false;
          }
        }}
        ref={buttonRef}
        className={buttonStyles({ isEmpty })}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 rounded-full"
          width={142}
          height={142}
        />
        <svg
          viewBox="0 0 120 120"
          fill="none"
          className="absolute inset-0"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M60 0C10.59 0 0 10.59 0 60C0 109.41 10.59 120 60 120C109.41 120 120 109.41 120 60C120 10.59 109.41 0 60 0Z"
            className="background backdrop-blur-3xl backdrop-saturate-200 fill-gray-50/70"
          />
        </svg>
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="server absolute inset-0 filter-[drop-shadow(0_10px_8px_--theme(--color-zinc-800/5%))_drop-shadow(0_4px_3px_--theme(--color-zinc-800/10%))] group-pressed:[filter:drop-shadow(0_6px_3px_theme(colors.zinc.800/5%))_drop-shadow(0_4px_3px_theme(colors.zinc.800/10%))]"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M60 0C10.59 0 0 10.59 0 60C0 109.41 10.59 120 60 120C109.41 120 120 109.41 120 60C120 10.59 109.41 0 60 0ZM43.6831 47.9347C43.238 48.6013 43 49.3889 43 50.195V73.0429C43 73.8188 43.86 74.2711 44.4811 73.8219L46.7463 72.1839C47.3731 71.7306 47.7455 70.9963 47.7455 70.2134V53.2027C47.7455 52.7307 48.2679 52.4546 48.6468 52.7265L58.6944 59.9365C59.0214 60.1711 59.0169 60.6664 58.6857 60.895L55.473 63.1117C54.3788 63.8667 54.1068 65.3898 54.8699 66.489C55.6175 67.5658 57.0775 67.8278 58.1415 67.076L63.0318 63.6206C64.0796 62.8803 64.7046 61.6639 64.7046 60.3651C64.7046 59.0915 64.1035 57.8956 63.0892 57.1509L48.6051 46.5165C47.0324 45.5379 44.9824 45.9886 43.946 47.5408L43.6831 47.9347ZM58.7713 47.0291C58.019 48.1128 58.2649 49.6116 59.3223 50.3872L72.1304 59.7826C72.4408 60.0103 72.4485 60.4781 72.1458 60.7163L61.4445 69.1358C60.4247 69.9382 60.2184 71.422 60.9793 72.4811C61.7666 73.5769 63.2846 73.799 64.3429 72.9733L76.3875 63.5753C77.404 62.7822 78 61.5524 78 60.2483C78 58.8988 77.362 57.6318 76.2859 56.8444L62.0949 46.4613C61.0244 45.6781 59.5324 45.9329 58.7713 47.0291Z"
            className="fill-white/70 backdrop-blur-3xl backdrop-saturate-200"
          />
        </svg>
      </Button>
      {children}
    </div>
  );
}
