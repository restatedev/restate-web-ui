import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { SegmentedControl } from './SegmentedControl';

function Example({ onChange }: { onChange: (value: string) => void }) {
  const [value, setValue] = useState<'text' | 'file'>('text');
  return (
    <SegmentedControl
      label="Input source"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
      options={[
        { value: 'text', label: 'Text' },
        { value: 'file', label: 'File' },
      ]}
    />
  );
}

describe('SegmentedControl', () => {
  it('is a radio group with the selected option checked', () => {
    render(<Example onChange={vi.fn()} />);
    expect(
      screen.getByRole('radiogroup', { name: 'Input source' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('radio', { name: 'Text' }).getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('moves the selection with a click and keeps it on a second click', async () => {
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'File' }));
    await userEvent.click(screen.getByRole('radio', { name: 'File' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('file');
  });

  it('takes one Tab stop and moves focus with the arrow keys', async () => {
    render(<Example onChange={vi.fn()} />);
    await userEvent.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('radio', { name: 'Text' }),
    );
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(
      screen.getByRole('radio', { name: 'File' }),
    );
  });
});
