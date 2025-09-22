import { useOnboarding } from '@restate/util/feature-flag';
import { CellProps } from './types';
import { InvocationId } from '@restate/features/invocation-route';
import { tv } from '@restate/util/styles';

const styles = tv({
  base: 'mr-1 rounded-md [--pulse-size:2px]',
  variants: {
    isOnboarding: { true: 'animate-pulseButton', false: '' },
  },
});
export function InvocationIdCell({ invocation }: CellProps) {
  const isOnboarding = useOnboarding();
  return (
    <InvocationId
      id={invocation.id}
      className={styles({ isOnboarding })}
      isLive
    />
  );
}
