import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Button } from '@restate/ui/button';
import { CardLinkRow } from './Card';

describe('CardLinkRow', () => {
  it('keeps interactive children separate from the whole-row link', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <MemoryRouter>
        <CardLinkRow
          href="/invocations/inv_1"
          aria-label="Open invocation inv_1"
          allowsInteractiveChildren
          label="inv_1"
        >
          <Button variant="secondary" onClick={onClick}>
            after…
          </Button>
        </CardLinkRow>
      </MemoryRouter>,
    );

    const action = screen.getByRole('button', { name: 'after…' });
    expect(action.closest('a')).toBeNull();

    await user.click(action);

    expect(onClick).toHaveBeenCalledOnce();
    const link = screen.getByRole('link', {
      name: 'Open invocation inv_1',
    });
    const linkClasses = link.getAttribute('class')?.split(' ') ?? [];
    expect(link.textContent).toBe('inv_1');
    expect(linkClasses).toContain('after:absolute');
    expect(linkClasses).toContain('after:inset-0');
    expect(linkClasses).not.toContain('absolute');
  });
});
