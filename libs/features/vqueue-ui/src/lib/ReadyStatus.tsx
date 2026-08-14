import { Badge } from '@restate/ui/badge';
import { tv } from '@restate/util/styles';

const styles = tv({
  base: 'relative inline-flex max-w-full gap-2 border-dashed border-zinc-300 bg-transparent text-zinc-500',
});

export interface ReadyStatusProps {
  className?: string;
}

export function ReadyStatus({ className }: ReadyStatusProps) {
  return <Badge className={styles({ className })}>Ready</Badge>;
}
