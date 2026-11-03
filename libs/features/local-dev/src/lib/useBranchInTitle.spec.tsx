import { renderHook } from '@testing-library/react';
import { useBranchInTitle } from './useBranchInTitle';

describe('useBranchInTitle', () => {
  beforeEach(() => {
    document.title = 'Restate';
  });

  it('adds the branch to the title', () => {
    renderHook(() => useBranchInTitle('feature'));
    expect(document.title).toBe('feature · Restate');
  });

  it('adds it again when a route changes the title', async () => {
    renderHook(() => useBranchInTitle('feature'));
    document.title = 'Restate - Rules';
    await vi.waitFor(() =>
      expect(document.title).toBe('feature · Restate - Rules'),
    );
  });

  it('leaves the title alone without a branch', () => {
    renderHook(() => useBranchInTitle(''));
    expect(document.title).toBe('Restate');
  });
});
