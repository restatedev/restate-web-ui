import { useEffect, useRef, useState } from 'react';
import {
  Autocomplete,
  Collection,
  Dialog,
  Header,
  Input,
  Menu,
  MenuItem,
  MenuSection,
  Modal,
  ModalOverlay,
  SearchField,
  Text,
} from 'react-aria-components';
import { useNavigate } from 'react-router';
import { Icon, IconName } from '@restate/ui-icons';
import { tv } from '@restate/util-styles';
import type { Command, PalettePage } from './types';
import { useCommandSections } from './useCommandSections';

const overlayStyles = tv({
  base: 'fixed top-0 left-0 isolate z-100 flex h-screen w-full items-start justify-center bg-backdrop p-4 pt-[12vh] backdrop-blur-[0.5px]',
  variants: {
    isEntering: { true: 'duration-150 ease-out animate-in fade-in' },
    isExiting: { true: 'duration-150 ease-in animate-out fade-out' },
  },
});

const modalStyles = tv({
  base: 'w-full max-w-xl',
  variants: {
    isEntering: { true: 'duration-150 ease-out animate-in zoom-in-[0.98]' },
    isExiting: { true: 'duration-150 ease-in animate-out zoom-out-[0.98]' },
  },
});

const styles = tv({
  slots: {
    frame:
      'flex max-h-[min(36rem,76vh)] flex-col rounded-[1.125rem] border border-tint-subtle bg-overlay p-1.5 shadow-lg outline-0',
    panel:
      'flex min-h-0 flex-auto flex-col overflow-hidden rounded-xl border bg-surface',
    searchField: 'flex shrink-0 items-center gap-2.5 border-b px-3.5',
    searchIcon: 'h-4.5 w-4.5 shrink-0 text-subtle',
    pageChip:
      'shrink-0 rounded-md border bg-subtle px-1.5 py-0.5 text-xs font-medium text-secondary',
    input:
      'h-12 min-w-0 flex-auto border-0! bg-transparent px-0! text-base text-primary shadow-none! ring-0! outline-none! placeholder:text-subtle [&::-webkit-search-cancel-button]:hidden',
    escape: 'shrink-0',
    menu: 'min-h-0 flex-auto overflow-auto p-1.5 outline-0',
    section: 'not-first:mt-1.5',
    sectionHeader: 'px-2 pt-1 pb-1 text-xs font-medium text-muted',
    empty: 'flex flex-col items-center gap-1 px-6 py-10 text-center',
    emptyTitle: 'text-sm font-medium text-secondary',
    emptyDescription: 'text-xs text-muted',
    footer:
      'flex shrink-0 items-center gap-4 px-3 pt-2 pb-1 text-xs text-muted',
    footerHint: 'flex items-center gap-1.5',
    kbd: 'inline-flex min-w-5 items-center justify-center rounded-md border bg-surface px-1 font-sans text-2xs leading-5 text-tertiary shadow-xs',
  },
})();

const itemStyles = tv({
  slots: {
    item: 'flex cursor-default items-center gap-3 rounded-lg px-2 py-1.5 outline-0 select-none',
    iconBox:
      'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border',
    icon: 'h-4 w-4 shrink-0',
    text: 'flex min-w-0 flex-auto flex-col',
    label: 'truncate text-sm',
    description: 'truncate text-xs',
    hint: 'shrink-0 text-xs',
    chevron: 'h-4 w-4 shrink-0',
  },
  variants: {
    isFocused: {
      true: {
        item: 'bg-accent text-inverse',
        iconBox: 'border-transparent bg-highlight/20',
        icon: 'text-inverse',
        description: 'text-inverse',
        hint: 'text-inverse',
        chevron: 'text-inverse',
      },
      false: {
        item: 'text-primary',
        iconBox: 'border-default bg-subtle',
        icon: 'text-muted',
        description: 'text-muted',
        hint: 'text-subtle',
        chevron: 'text-subtle',
      },
    },
    isIconRotated: {
      true: { icon: 'rotate-90' },
    },
    isDestructive: {
      true: {},
    },
    isMonospace: {
      true: { label: 'font-mono text-0.5xs' },
    },
  },
  compoundVariants: [
    {
      isFocused: true,
      isDestructive: true,
      className: { item: 'bg-danger' },
    },
    {
      isFocused: false,
      isDestructive: true,
      className: { icon: 'text-danger' },
    },
  ],
});

function Kbd({ children }: { children: string }) {
  return <kbd className={styles.kbd()}>{children}</kbd>;
}

function CommandItem({
  command,
  isDefault,
}: {
  command: Command;
  isDefault: boolean;
}) {
  return (
    <MenuItem
      id={command.id}
      textValue={command.label}
      href={command.href}
      target={command.target}
      className={({ isFocused }) =>
        itemStyles({
          isFocused: isFocused || isDefault,
          isDestructive: command.destructive,
        }).item()
      }
    >
      {({ isFocused }) => {
        const s = itemStyles({
          isFocused: isFocused || isDefault,
          isDestructive: command.destructive,
          isMonospace: command.monospace,
          isIconRotated: command.rotateIcon,
        });
        return (
          <>
            <span className={s.iconBox()}>
              <Icon name={command.icon} className={s.icon()} />
            </span>
            <span className={s.text()}>
              <Text slot="label" className={s.label()}>
                {command.label}
              </Text>
              {command.description && (
                <Text slot="description" className={s.description()}>
                  {command.description}
                </Text>
              )}
            </span>
            {command.hint && <span className={s.hint()}>{command.hint}</span>}
            {command.page && (
              <Icon name={IconName.ChevronRight} className={s.chevron()} />
            )}
          </>
        );
      }}
    </MenuItem>
  );
}

function EmptyState() {
  return (
    <div className={styles.empty()}>
      <span className={styles.emptyTitle()}>No matches</span>
      <span className={styles.emptyDescription()}>
        Try a page, a service or handler name, or paste an ID, endpoint, error
        code or SQL query.
      </span>
    </div>
  );
}

const PAGES: Record<
  Exclude<PalettePage, 'root'>,
  { label: string; placeholder: string }
> = {
  playground: {
    label: 'Playground',
    placeholder: 'Pick a service or handler…',
  },
  queries: { label: 'Queries', placeholder: 'Pick a query…' },
};

function CommandPaletteContent({ onClose }: { onClose: VoidFunction }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState<PalettePage>('root');
  const sections = useCommandSections(query, page);
  const subPage = page === 'root' ? undefined : PAGES[page];
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasActiveItem, setHasActiveItem] = useState(false);
  const firstCommand = sections[0]?.items[0];

  useEffect(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }
    const observer = new MutationObserver(() =>
      setHasActiveItem(input.hasAttribute('aria-activedescendant')),
    );
    observer.observe(input, {
      attributes: true,
      attributeFilter: ['aria-activedescendant'],
    });
    return () => observer.disconnect();
  }, []);

  const openPage = (next: PalettePage) => {
    setPage(next);
    setQuery('');
    setHasActiveItem(false);
    inputRef.current?.focus();
  };

  const runCommand = (command: Command) => {
    if (command.page) {
      openPage(command.page);
      return;
    }
    onClose();
    if (command.onAction) {
      setTimeout(command.onAction, 200);
    } else if (command.href && command.target === '_blank') {
      window.open(command.href, '_blank', 'noopener,noreferrer');
    } else if (command.href) {
      navigate(command.href);
    }
  };

  return (
    <Autocomplete inputValue={query} onInputChange={setQuery}>
      <div
        className={styles.panel()}
        onKeyDownCapture={(event) => {
          if (page !== 'root' && event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            openPage('root');
          }
        }}
      >
        <SearchField
          aria-label="Search commands"
          autoFocus
          className={styles.searchField()}
        >
          <Icon name={IconName.Search} className={styles.searchIcon()} />
          {subPage && (
            <span className={styles.pageChip()}>{subPage.label}</span>
          )}
          <Input
            ref={inputRef}
            placeholder={
              subPage?.placeholder ?? 'Search, or paste an ID, endpoint or SQL…'
            }
            className={styles.input()}
            onKeyDown={(event) => {
              if (
                page !== 'root' &&
                !event.currentTarget.value &&
                event.key === 'Backspace'
              ) {
                event.preventDefault();
                event.stopPropagation();
                openPage('root');
                return;
              }
              if (
                event.key === 'Enter' &&
                !event.nativeEvent.isComposing &&
                !event.currentTarget.hasAttribute('aria-activedescendant') &&
                firstCommand
              ) {
                event.preventDefault();
                runCommand(firstCommand);
              }
            }}
          />
          <span className={styles.escape()}>
            <Kbd>esc</Kbd>
          </span>
        </SearchField>
        <Menu
          aria-label="Commands"
          items={sections}
          dependencies={[hasActiveItem, firstCommand]}
          className={styles.menu()}
          renderEmptyState={() => <EmptyState />}
          onAction={(key) => {
            const command = sections
              .flatMap((section) => section.items)
              .find((item) => item.id === key);
            if (command?.page) {
              openPage(command.page);
              return;
            }
            onClose();
            if (command?.onAction) {
              const run = command.onAction;
              setTimeout(run, 200);
            }
          }}
        >
          {(section) => (
            <MenuSection id={section.id} className={styles.section()}>
              <Header className={styles.sectionHeader()}>
                {section.title}
              </Header>
              <Collection
                items={section.items}
                dependencies={[hasActiveItem, firstCommand]}
              >
                {(command) => (
                  <CommandItem
                    command={command}
                    isDefault={!hasActiveItem && command === firstCommand}
                  />
                )}
              </Collection>
            </MenuSection>
          )}
        </Menu>
      </div>
      <div className={styles.footer()}>
        <span className={styles.footerHint()}>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          to move
        </span>
        <span className={styles.footerHint()}>
          <Kbd>↵</Kbd>
          to open
        </span>
        {subPage && (
          <span className={styles.footerHint()}>
            <Kbd>⌫</Kbd>
            to go back
          </span>
        )}
      </div>
    </Autocomplete>
  );
}

export default function CommandPaletteDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className={({ isEntering, isExiting }) =>
        overlayStyles({ isEntering, isExiting })
      }
    >
      <Modal
        className={({ isEntering, isExiting }) =>
          modalStyles({ isEntering, isExiting })
        }
      >
        <Dialog
          aria-label="Command palette"
          data-ignore-shortcut="true"
          className={styles.frame()}
        >
          <CommandPaletteContent onClose={() => onOpenChange(false)} />
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
