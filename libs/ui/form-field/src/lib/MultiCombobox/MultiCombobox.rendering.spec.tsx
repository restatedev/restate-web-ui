import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useListData } from 'react-stately';
import { FormFieldMultiCombobox } from './MultiCombobox';

interface Item {
  id: string;
  textValue: string;
  detail?: string;
}

function Tag({ item, onRemove }: { item: Item; onRemove?: VoidFunction }) {
  useState(item.id);

  return <button onClick={onRemove}>{item.textValue}</button>;
}

function EditableTag({
  item,
  onUpdate,
}: {
  item: Item;
  onUpdate?: (item: Item) => void;
}) {
  return (
    <input
      aria-label="Edit tag"
      value={item.textValue}
      onChange={(event) =>
        onUpdate?.({ ...item, textValue: event.currentTarget.value })
      }
    />
  );
}

function Harness() {
  const selectedList = useListData<Item>({
    initialItems: [
      { id: 'alpha', textValue: 'Alpha' },
      { id: 'beta', textValue: 'Beta' },
    ],
  });

  return (
    <FormFieldMultiCombobox
      label="Items"
      items={[]}
      selectedList={selectedList}
    >
      {Tag}
    </FormFieldMultiCombobox>
  );
}

function InlineTagHarness() {
  const selectedList = useListData<Item>({
    initialItems: [{ id: 'alpha', textValue: 'Alpha' }],
  });

  return (
    <FormFieldMultiCombobox
      label="Items"
      items={[]}
      selectedList={selectedList}
    >
      {(props) => <EditableTag {...props} />}
    </FormFieldMultiCombobox>
  );
}

function RemoveTagHarness() {
  const selectedList = useListData<Item>({
    initialItems: [{ id: 'alpha', textValue: 'Alpha' }],
  });

  return (
    <FormFieldMultiCombobox
      label="Items"
      items={[{ id: 'beta', textValue: 'Beta' }]}
      selectedList={selectedList}
    >
      {Tag}
    </FormFieldMultiCombobox>
  );
}

function DynamicItemsHarness({
  onOpenChange,
}: {
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const [items, setItems] = useState<Item[]>([
    { id: 'pattern', textValue: 'Pattern', detail: 'No patterns' },
  ]);
  const selectedList = useListData<Item>({ initialItems: [] });

  return (
    <>
      <button
        onClick={() =>
          setItems([
            {
              id: 'pattern',
              textValue: 'Pattern',
              detail: 'Pattern: example/**',
            },
            { id: 'scope', textValue: 'Scope', detail: 'Scope filter' },
          ])
        }
      >
        Resolve schema
      </button>
      <FormFieldMultiCombobox
        label="Filters"
        items={items}
        selectedList={selectedList}
        renderOption={(item) => item.detail}
        showSectionTitle={false}
        onOpenChange={onOpenChange}
      />
    </>
  );
}

describe('FormFieldMultiCombobox tag rendering', () => {
  it('keeps tag hooks isolated when a tag is removed', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));

    expect(screen.queryByText('Alpha')).toBeNull();
    expect(screen.getByRole('button', { name: 'Beta' })).toBeTruthy();
  });

  it('preserves an inline tag subtree while its item is updated', async () => {
    const user = userEvent.setup();
    render(<InlineTagHarness />);
    const input = screen.getByRole('textbox', { name: 'Edit tag' });

    await user.type(input, 'x');

    expect(screen.getByRole('textbox', { name: 'Edit tag' })).toBe(input);
    expect((input as HTMLInputElement).value).toBe('Alphax');
  });

  it('opens the options when focus returns to the search field after removing a tag', async () => {
    const user = userEvent.setup();
    render(<RemoveTagHarness />);

    await user.click(screen.getByRole('button', { name: 'Alpha' }));
    const combobox = screen.getByRole('combobox', { name: 'Items' });

    expect(document.activeElement).toBe(combobox);
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('option', { name: 'Beta' })).toBeTruthy();
  });

  it('keeps the keyboard focus ring on the search control rather than the raw input', async () => {
    const user = userEvent.setup();
    render(<RemoveTagHarness />);

    const combobox = screen.getByRole('combobox', { name: 'Items' });
    await user.click(combobox);
    await user.keyboard('{Escape}{ArrowDown}');

    expect(document.activeElement).toBe(combobox);
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
    expect(combobox.className).toContain('border-0!');
    expect(combobox.className).toContain('shadow-none!');
    expect(combobox.className).toContain('ring-0!');
    expect(combobox.className).toContain('outline-none!');
  });

  it('uses updated items after an asynchronous schema change', async () => {
    const user = userEvent.setup();
    render(<DynamicItemsHarness />);

    await user.click(screen.getByRole('button', { name: 'Resolve schema' }));
    await user.click(screen.getByRole('combobox', { name: 'Filters' }));

    expect(
      await screen.findByRole('option', { name: 'Pattern: example/**' }),
    ).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Scope filter' })).toBeTruthy();
  });

  it('keeps the popover open while filtering updated items', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<DynamicItemsHarness onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: 'Resolve schema' }));
    const combobox = screen.getByRole('combobox', { name: 'Filters' });
    await user.click(combobox);
    onOpenChange.mockClear();

    await user.type(combobox, 'scope');

    expect(combobox.getAttribute('aria-expanded')).toBe('true');
    expect(onOpenChange.mock.calls.some(([isOpen]) => isOpen === false)).toBe(
      false,
    );
    expect(screen.getByRole('option', { name: 'Scope filter' })).toBeTruthy();
  });
});
