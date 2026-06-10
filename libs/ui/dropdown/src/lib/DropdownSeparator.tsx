import { tv } from '@restate/util/styles';
import { Separator } from 'react-aria-components';

const styles = tv({
  base: '-mx-1 my-0 border-t-0 border-b',
});
export function DropdownSeparator({ className }: { className?: string }) {
  return <Separator className={styles({ className })} />;
}
