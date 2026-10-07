import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import { FormFieldCombobox } from './FormFieldCombobox';

vi.hoisted(() => {
  Object.defineProperty(performance, 'measure', {
    configurable: true,
    value: vi.fn(),
  });
  console.timeStamp = vi.fn();
});

class ResizeObserverMock implements ResizeObserver {
  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
}

function MetadataField() {
  const [value, setValue] = useState('');
  return (
    <FormFieldCombobox
      placeholder="Metadata key"
      name="key"
      options={[
        { id: 'github.repository' },
        { id: 'github.commit.sha' },
        { id: 'github.actions.run.id' },
      ]}
      value={value}
      onChange={setValue}
      allowsCustomValue
    />
  );
}

describe('FormFieldCombobox', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('CSS', { escape: (value: string) => value });
  });
  afterAll(() => vi.unstubAllGlobals());

  it('filters flat controlled options and accepts custom metadata keys', async () => {
    const user = userEvent.setup();
    render(
      <form aria-label="Metadata">
        <MetadataField />
      </form>,
    );
    const input = screen.getByRole('combobox', { name: 'Metadata key' });
    await user.click(input);
    expect(screen.getAllByRole('option')).toHaveLength(3);
    await user.type(input, 'commit');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await user.click(screen.getByRole('option', { name: 'github.commit.sha' }));
    expect((input as HTMLInputElement).value).toBe('github.commit.sha');
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    await user.clear(input);
    await user.type(input, 'custom.key');
    expect(
      screen.getByText('No matching options. Enter a custom value.'),
    ).toBeTruthy();
    await user.keyboard('{Escape}');
    await user.tab();
    expect(
      new FormData(screen.getByRole('form') as HTMLFormElement).get('key'),
    ).toBe('custom.key');
  });

  it('filters multiple sections, hides empty groups, and restores them on manual opening', async () => {
    const user = userEvent.setup();
    render(
      <FormFieldCombobox
        placeholder="Duration"
        options={[
          {
            id: 'minutes',
            title: 'Minutes',
            description: 'Minute examples',
            items: [{ id: '1m' }, { id: '5m' }],
          },
          {
            id: 'hours',
            title: 'Hours',
            description: 'Hour examples',
            items: [{ id: '1h' }, { id: '2h' }],
          },
        ]}
      />,
    );
    const input = screen.getByRole('combobox', { name: 'Duration' });
    await user.click(input);
    await user.type(input, '2');
    expect(screen.queryByRole('group', { name: 'Minutes' })).toBeNull();
    expect(screen.queryByText('Minute examples')).toBeNull();
    expect(
      within(screen.getByRole('group', { name: 'Hours' })).getAllByRole(
        'option',
      ),
    ).toHaveLength(1);
    await user.keyboard('{Escape}{ArrowDown}');
    expect(screen.getByRole('group', { name: 'Minutes' })).toBeTruthy();
    expect(
      within(screen.getByRole('group', { name: 'Hours' })).getAllByRole(
        'option',
      ),
    ).toHaveLength(2);
    await user.keyboard('{ArrowDown}{Enter}');
    expect((input as HTMLInputElement).value).toBe('5m');
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
  });
});
