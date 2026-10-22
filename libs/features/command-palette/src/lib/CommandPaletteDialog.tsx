import { type ReactNode, useEffect, useRef, useState } from 'react';
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
import { Icon, IconName } from '@restate/ui-icons';
import { tv } from '@restate/util-styles';
import type {
  Command,
  CommandPaletteExtension,
  CommandPaletteExtensionComponent,
} from './types';
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
    more: 'cursor-default py-1 pr-2 pl-12 text-xs text-subtle outline-0 select-none',
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

function CommandItem({ command }: { command: Command }) {
  return (
    <MenuItem
      id={command.id}
      textValue={command.label}
      href={command.href}
      target={command.target}
      className={({ isFocused }) =>
        itemStyles({
          isFocused,
          isDestructive: command.destructive,
        }).item()
      }
    >
      {({ isFocused }) => {
        const s = itemStyles({
          isFocused,
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
            {command.step && (
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

const TYPING_INPUT_TYPES = new Set([
  'insertText',
  'insertCompositionText',
  'insertFromComposition',
]);

const NO_EXTENSION: CommandPaletteExtension = {};

function NoExtension({
  children,
}: {
  children: (extension: CommandPaletteExtension) => ReactNode;
}) {
  return children(NO_EXTENSION);
}

function CommandPaletteContent({
  onClose,
  extension,
}: {
  onClose: VoidFunction;
  extension: CommandPaletteExtension;
}) {
  const [query, setQuery] = useState('');
  const [stepId, setStepId] = useState<string>();
  const { sections, step } = useCommandSections(query, stepId, extension);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }
    const keepFocusOnFirstItem = (event: Event) => {
      if (
        event instanceof InputEvent &&
        event.target === inputRef.current &&
        !TYPING_INPUT_TYPES.has(event.inputType)
      ) {
        event.stopPropagation();
      }
    };
    panel.addEventListener('beforeinput', keepFocusOnFirstItem, {
      capture: true,
    });
    return () =>
      panel.removeEventListener('beforeinput', keepFocusOnFirstItem, {
        capture: true,
      });
  }, []);

  const focusFirstItem = () => {
    menuRef.current?.dispatchEvent(
      new CustomEvent('react-aria-focus', {
        cancelable: true,
        bubbles: true,
        detail: { focusStrategy: 'first' },
      }),
    );
  };

  const changeQuery = (value: string) => {
    focusFirstItem();
    setQuery(value);
  };

  const openStep = (next: string | undefined) => {
    focusFirstItem();
    setStepId(next);
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <Autocomplete inputValue={query} onInputChange={changeQuery}>
      <div
        ref={panelRef}
        className={styles.panel()}
        onKeyDownCapture={(event) => {
          if (step && event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            openStep(undefined);
          }
        }}
      >
        <SearchField
          aria-label="Search commands"
          autoFocus
          className={styles.searchField()}
        >
          <Icon name={IconName.Search} className={styles.searchIcon()} />
          {step && <span className={styles.pageChip()}>{step.label}</span>}
          <Input
            ref={inputRef}
            placeholder={
              step?.placeholder ?? 'Search, or paste an ID, endpoint or SQL…'
            }
            className={styles.input()}
            onKeyDown={(event) => {
              if (
                step &&
                !event.currentTarget.value &&
                event.key === 'Backspace'
              ) {
                event.preventDefault();
                event.stopPropagation();
                openStep(undefined);
              }
            }}
          />
          <span className={styles.escape()}>
            <Kbd>esc</Kbd>
          </span>
        </SearchField>
        <Menu
          ref={menuRef}
          aria-label="Commands"
          items={sections}
          autoFocus="first"
          className={styles.menu()}
          renderEmptyState={() => <EmptyState />}
          onAction={(key) => {
            const command = sections
              .flatMap((section) => section.items)
              .find((item) => item.id === key);
            if (command?.step) {
              openStep(command.step);
              return;
            }
            if (command?.onAction && command.runImmediately) {
              command.onAction();
            }
            onClose();
            if (command?.onAction && !command.runImmediately) {
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
              <Collection items={section.items}>
                {(command) => <CommandItem command={command} />}
              </Collection>
              {section.hiddenCount ? (
                <MenuItem
                  id={`${section.id}:more`}
                  isDisabled
                  textValue={`${section.hiddenCount} more`}
                  className={styles.more()}
                >
                  {section.hiddenCount} more, type to narrow
                </MenuItem>
              ) : null}
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
        {step && (
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
  Extension = NoExtension,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  Extension?: CommandPaletteExtensionComponent;
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
          <Extension>
            {(extension) => (
              <CommandPaletteContent
                onClose={() => onOpenChange(false)}
                extension={extension}
              />
            )}
          </Extension>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
