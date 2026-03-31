import { useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { tv } from '@restate/util/styles';
import { FerrofluidEngine, type FerrofluidStatus } from './ferrofluid-engine';

export type { FerrofluidStatus };

export interface FerrofluidHandle {
  mouseMove(nx: number, ny: number): void;
  click(nx: number, ny: number): void;
}

const styles = tv({
  base: '[clip-path:inset(4px_round_28%)]',
});

const canvasStyles = 'absolute inset-0 h-full w-full';

export function FerrofluidCanvas({
  status,
  size = 142,
  className,
  ref,
}: {
  status: FerrofluidStatus;
  size?: number;
  className?: string;
  ref?: React.Ref<FerrofluidHandle>;
}) {
  const shapeRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef<HTMLCanvasElement>(null);
  const [engine] = useState(() => new FerrofluidEngine());
  const rawId = useId();
  const filterId = `goo${rawId.replace(/:/g, '')}`;
  const blur = Math.max(3, Math.round(size * 0.03));

  engine.status = status;

  useImperativeHandle(
    ref,
    () => ({
      mouseMove(nx: number, ny: number) {
        engine.mouseMove(nx, ny);
      },
      click(nx: number, ny: number) {
        engine.click(nx, ny);
      },
    }),
    [engine],
  );

  useEffect(() => {
    const shape = shapeRef.current;
    const color = colorRef.current;
    if (!shape || !color) return;

    engine.init(shape, color);

    return () => {
      engine.cleanup();
    };
  }, [engine]);

  return (
    <div className={styles({ className })}>
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation={blur}
              result="blur"
            />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            />
          </filter>
        </defs>
      </svg>
      <canvas
        ref={shapeRef}
        className={canvasStyles}
        style={{ filter: `url(#${filterId})` }}
      />
      <canvas
        ref={colorRef}
        className={canvasStyles}
        onMouseLeave={() => engine.mouseLeave()}
      />
    </div>
  );
}
