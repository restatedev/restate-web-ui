import { useEffect, useImperativeHandle, useRef, useState } from 'react';
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
  className,
  ref,
}: {
  status: FerrofluidStatus;
  className?: string;
  ref?: React.Ref<FerrofluidHandle>;
}) {
  const shapeRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef<HTMLCanvasElement>(null);
  const [engine] = useState(() => new FerrofluidEngine());

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
      <canvas ref={shapeRef} className={canvasStyles} />
      <canvas
        ref={colorRef}
        className={canvasStyles}
        onMouseLeave={() => engine.mouseLeave()}
      />
    </div>
  );
}
