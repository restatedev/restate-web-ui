import { renderHook } from '@testing-library/react';
import { useWorktreeTitle } from './useWorktreeTitle';

describe('useWorktreeTitle', () => {
  beforeEach(() => {
    document.title = 'Restate';
  });

  it('adds the branch to the title', () => {
    renderHook(() => useWorktreeTitle('feature'));
    expect(document.title).toBe('feature · Restate');
  });

  it('adds it again when a route changes the title', async () => {
    renderHook(() => useWorktreeTitle('feature'));
    document.title = 'Restate - Rules';
    await vi.waitFor(() =>
      expect(document.title).toBe('feature · Restate - Rules'),
    );
  });

  it('leaves the title alone without a branch', () => {
    renderHook(() => useWorktreeTitle(''));
    expect(document.title).toBe('Restate');
  });
});
