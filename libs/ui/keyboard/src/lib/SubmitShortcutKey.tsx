import { tv } from '@restate/util/styles';
import { Icon, IconName } from '@restate/ui/icons';

const styles = tv({
  base: 'mt-0.5 flex h-5 scale-90 items-center gap-1 rounded-sm bg-black/20 px-1 font-mono text-[80%] font-medium text-white/85',
});

function getMetaKeySymbol() {
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  return isMac ? 'Cmd' : 'Ctrl';
}

export function SubmitShortcutKey({ className }: { className?: string }) {
  return (
    <kbd className={styles({ className })}>
      <div className="text-xs tracking-wider">{getMetaKeySymbol()}</div>
      <Icon name={IconName.Return} className="h-3.5 w-3.5" />
    </kbd>
  );
}
