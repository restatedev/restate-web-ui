import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { Input as AriaInput, Label, SearchField } from 'react-aria-components';
import { Button, SubmitButton } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import {
  FocusShortcutKey,
  SubmitShortcutKey,
  useFocusShortcut,
  useSubmitShortcut,
} from '@restate/ui-keyboard';
import { LayoutOutlet, LayoutProvider, LayoutZone } from '@restate/ui-layout';

const meta = {
  title: 'Actions/Keyboard',
  component: FocusShortcutKey,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof FocusShortcutKey>;

export default meta;
type Story = StoryObj<typeof meta>;

function ServicesSearch() {
  const [filter, setFilter] = useState('');
  const filterRef = useFocusShortcut<HTMLInputElement>();
  return (
    <SearchField
      aria-label="Search services and handlers"
      value={filter}
      onChange={setFilter}
      enterKeyHint="search"
      className="group flex min-h-6.5 max-w-[38ch] min-w-0 flex-[1_1_38ch] items-center rounded-lg border border-default bg-surface/70 text-primary shadow-xs hover:bg-surface has-[input[data-focused=true]]:border-accent-strong has-[input[data-focused=true]]:ring-1 has-[input[data-focused=true]]:ring-focus"
    >
      <Label className="sr-only">Search services and handlers</Label>
      <Icon name={IconName.Search} size="md" className="ml-1.5 text-subtle" />
      <AriaInput
        ref={filterRef}
        placeholder="Search services and handlers"
        className="h-6 min-h-6 w-full min-w-0 border-0 bg-transparent py-0.5 pr-1 pl-1 text-sm text-current shadow-none outline-none placeholder:text-subtle focus:border-0 focus:ring-0 focus:outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
      />
      {filter ? (
        <Button
          type="button"
          variant="icon"
          aria-label="Clear search"
          size="xs"
          className="mr-0.5 text-subtle shadow-none hover:bg-muted hover:text-tertiary pressed:bg-emphasis"
          onClick={() => setFilter('')}
        >
          <Icon name={IconName.X} size="sm" />
        </Button>
      ) : (
        <FocusShortcutKey variant="light" className="mr-1 shrink-0" />
      )}
    </SearchField>
  );
}

export const Focus: Story = {
  render: () => <ServicesSearch />,
};

function Mounted({ children }: PropsWithChildren) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  return isMounted ? children : null;
}

function QueryBar() {
  const submitRef = useSubmitShortcut();
  return (
    <LayoutOutlet zone={LayoutZone.Toolbar}>
      <form
        className="w-7xl max-w-full"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="flex items-center rounded-xl border border-transparent p-0.5 ring-1 ring-transparent has-focus:border-accent-strong has-focus:ring-focus">
          <div className="relative flex min-h-[30px] w-full items-center gap-2 p-px pl-2">
            <FocusShortcutKey />
            <div className="inline-block text-sm text-subtle">
              Type your query here…
            </div>
          </div>
        </div>
        <div className="absolute top-1 right-1 bottom-1 flex items-stretch gap-1">
          <SubmitButton
            ref={submitRef}
            className="flex items-center gap-2 rounded-lg py-0 pr-0.5 pl-4 disabled:bg-neutral disabled:text-inverse-secondary pointer-coarse:pr-4"
          >
            Query
            <SubmitShortcutKey />
          </SubmitButton>
        </div>
      </form>
    </LayoutOutlet>
  );
}

export const Toolbar: Story = {
  parameters: {
    layout: 'fullscreen',
    docs: { story: { inline: false, height: '360px' } },
  },
  render: () => (
    <LayoutProvider variant="appbar">
      <Mounted>
        <QueryBar />
      </Mounted>
    </LayoutProvider>
  ),
};
