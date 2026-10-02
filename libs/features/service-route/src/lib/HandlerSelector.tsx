import type { Handler } from '@restate/data-access/admin-api-spec';
import { Button } from '@restate/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { HANDLER_QUERY_PARAM } from '@restate/util/panel';
import { tv } from '@restate/util/styles';
import { useSearchParams } from 'react-router';

const ALL_HANDLERS = '__all__';

const styles = tv({
  slots: {
    trigger:
      '-mx-1.5 flex h-full min-w-0 items-center gap-1 rounded-sm px-1.5 py-0 text-inherit shadow-none hover:bg-black/4 pressed:bg-black/8',
    label: 'min-w-0 truncate italic',
    icon: 'h-4 w-4 shrink-0 text-zinc-400',
    chevron: 'h-3.5 w-3.5 shrink-0 text-zinc-400',
  },
  variants: {
    hasSelection: {
      true: { label: 'font-medium text-zinc-600' },
      false: { label: 'font-normal text-zinc-400' },
    },
  },
});

export function HandlerSelector({
  handlers,
  selected,
}: {
  handlers: Handler[];
  selected?: string;
}) {
  const [, setSearchParams] = useSearchParams();
  const { trigger, label, icon, chevron } = styles({
    hasSelection: Boolean(selected),
  });

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant="icon"
          className={trigger()}
          aria-label={
            selected
              ? `Handler ${selected}, change handler`
              : 'Select a handler'
          }
        >
          <Icon name={IconName.Function} className={icon()} />
          <span className={label()}>
            {selected ? `${selected}()` : 'handler'}
          </span>
          <Icon name={IconName.ChevronsUpDown} className={chevron()} />
        </Button>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownSection title="Handlers">
          <DropdownMenu
            selectable
            selectedItems={[selected ?? ALL_HANDLERS]}
            onSelect={(value) => {
              setSearchParams(
                (old) => {
                  if (value === ALL_HANDLERS) {
                    old.delete(HANDLER_QUERY_PARAM);
                  } else {
                    old.set(HANDLER_QUERY_PARAM, value);
                  }
                  return old;
                },
                { preventScrollReset: true },
              );
            }}
          >
            <DropdownItem value={ALL_HANDLERS}>All handlers</DropdownItem>
            {handlers.map((handler) => (
              <DropdownItem key={handler.name} value={handler.name}>
                <span className="italic">{handler.name}()</span>
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}
