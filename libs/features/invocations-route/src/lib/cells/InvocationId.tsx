import { CellProps } from './types';
import { InvocationId } from '@restate/features/invocation-route';

export function InvocationIdCell({ invocation }: CellProps) {
  return <InvocationId id={invocation.id} />;
}
