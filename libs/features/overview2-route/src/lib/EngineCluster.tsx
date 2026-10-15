import type { ReactNode } from 'react';
import { tv } from '@restate/util/styles';
import {
  RestateServer,
  type FerrofluidStatus,
} from '@restate/ui/restate-server';

const coreStyles = tv({
  base: 'relative flex flex-col items-center justify-center',
});

export function EngineCore({
  serverRef,
  status,
  onPress,
  className,
  belowServer,
}: {
  serverRef: React.RefObject<HTMLDivElement | null>;
  status: FerrofluidStatus;
  onPress?: () => void;
  className?: string;
  belowServer?: ReactNode;
}) {
  return (
    <div className={coreStyles({ class: className })}>
      <div
        ref={serverRef}
        className="relative z-20 h-[79px] w-[79px] @min-[64rem]/hero:h-[92px] @min-[64rem]/hero:w-[92px]"
      >
        <div className="absolute top-1/2 left-1/2 -translate-1/2 scale-[0.6] @min-[64rem]/hero:scale-[0.7]">
          <RestateServer status={status} onPress={onPress} appearance="solid" />
        </div>
      </div>
      {belowServer && (
        <div className="pointer-events-auto absolute top-full z-40 mt-6 flex justify-center">
          {belowServer}
        </div>
      )}
    </div>
  );
}
