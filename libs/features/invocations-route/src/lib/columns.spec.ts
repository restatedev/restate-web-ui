import { getDefaultInvocationColumns, setDefaultColumns } from './columns';

describe('invocation columns', () => {
  it('includes Limit key by default when VQueues are enabled', () => {
    expect(getDefaultInvocationColumns(true)).toContain('limit_key');
    expect(getDefaultInvocationColumns(false)).not.toContain('limit_key');
  });

  it('keeps Limit key in the canonical defaults for client feature gating', () => {
    const searchParams = setDefaultColumns(new URLSearchParams());

    expect(searchParams.getAll('column')).toContain('limit_key');
  });
});
