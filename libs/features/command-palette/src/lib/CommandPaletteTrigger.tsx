import { Button } from 'react-aria-components';
import { Icon, IconName } from '@restate/ui-icons';
import { useSidebar } from '@restate/ui-layout';
import { HoverTooltip } from '@restate/ui-tooltip';
import { tv } from '@restate/util-styles';
import { useCommandPalette } from './CommandPaletteProvider';

const styles = tv({
  slots: {
    row: 'mb-1.5 flex flex-col',
    button:
      'flex w-full min-w-0 items-center gap-2 rounded-xl border border-tint-subtle bg-surface/70 p-0.5 text-sm text-muted shadow-xs outline-offset-2 outline-focus transition-all duration-300 group-data-[collapsed=false]/sidebar:w-full group-data-[collapsed=false]/sidebar:translate-x-0 group-data-[collapsed=true]/sidebar:w-fit group-data-[collapsed=true]/sidebar:translate-x-[5px] hover:bg-surface hover:text-secondary focus-visible:outline-2 pressed:bg-muted',
    iconBox: 'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
    icon: 'h-4 w-4 shrink-0 text-subtle',
    label:
      'max-w-full min-w-0 flex-auto truncate overflow-hidden text-left opacity-100 transition-[max-width,opacity] duration-300 group-data-[collapsed=true]/sidebar:max-w-0 group-data-[collapsed=true]/sidebar:opacity-0',
    kbd: 'mr-1 shrink-0 rounded-md border bg-surface px-1 font-sans text-2xs leading-5 text-subtle transition-opacity duration-300 group-data-[collapsed=true]/sidebar:hidden',
  },
})();

export function CommandPaletteTrigger() {
  const { open, shortcut } = useCommandPalette();
  const { isCollapsed } = useSidebar();
  return (
    <li className={styles.row()}>
      <HoverTooltip
        content={`Search ${shortcut}`}
        placement="right"
        disabled={!isCollapsed}
        offset={12}
      >
        <Button onPress={open} className={styles.button()}>
          <span className={styles.iconBox()}>
            <Icon name={IconName.Search} className={styles.icon()} />
          </span>
          <span className={styles.label()}>Search</span>
          <kbd className={styles.kbd()}>{shortcut}</kbd>
        </Button>
      </HoverTooltip>
    </li>
  );
}
