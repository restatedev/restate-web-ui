import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { VirtualObjectQuickOpen } from './VirtualObjectQuickOpen';
import type { VirtualObjectOpenDraft } from './virtual-objects.open';

function QuickOpenHarness({ onOpen }: { onOpen: VoidFunction }) {
  const [draft, setDraft] = useState<VirtualObjectOpenDraft>({
    key: '',
    scope: '',
  });

  return (
    <MemoryRouter>
      <VirtualObjectQuickOpen
        draft={draft}
        disabled={false}
        hasScopedVirtualObjects
        onChange={setDraft}
        onOpen={onOpen}
        service="Counter"
      />
    </MemoryRouter>
  );
}

describe('VirtualObjectQuickOpen', () => {
  it('opens the inline scope and key identity from the keyboard form', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<QuickOpenHarness onOpen={onOpen} />);

    const scope = screen.getByRole('textbox', { name: 'Scope (optional)' });
    const key = screen.getByRole('textbox', { name: 'Key' });
    const open = screen.getByRole('button', { name: 'Open instance' });

    expect(open.hasAttribute('disabled')).toBe(true);
    await user.type(scope, 'objects');
    await user.type(key, 'hot-account');

    expect((scope as HTMLInputElement).value).toBe('objects');
    expect((key as HTMLInputElement).value).toBe('hot-account');
    await user.type(key, '{Enter}');

    expect(onOpen).toHaveBeenCalledOnce();
  });
});
