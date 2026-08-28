import { fireEvent, render, screen } from '@testing-library/react';
import { FilteredResultsCaption } from './FilteredResultsCaption';

describe('FilteredResultsCaption', () => {
  it('describes filtered results and resets them', () => {
    const onClear = vi.fn();

    render(<FilteredResultsCaption noun="workflow runs" onClear={onClear} />);

    const description = screen.getByText(
      'Only matching workflow runs are shown.',
    );
    expect(description).toBeTruthy();
    expect(description.parentElement?.className).toContain('mt-11');
    expect(description.parentElement?.className).toContain('rounded-lg');
    expect(description.parentElement?.className).not.toContain('sticky');

    fireEvent.click(
      screen.getByRole('button', { name: 'Reset workflow runs filters' }),
    );

    expect(onClear).toHaveBeenCalledOnce();
  });

  it('accepts layout overrides when embedded in a table toolbar', () => {
    render(
      <FilteredResultsCaption
        noun="virtual object instances"
        className="m-0 h-9 w-full rounded-xl"
        onClear={vi.fn()}
      />,
    );

    const caption = screen.getByText('Filtered results').parentElement;
    expect(caption?.className).toContain('m-0');
    expect(caption?.className).toContain('h-9');
    expect(caption?.className).toContain('w-full');
    expect(caption?.className).toContain('rounded-xl');
    expect(caption?.className).not.toContain('mt-11');
  });
});
