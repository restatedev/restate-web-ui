import { getDefaultInvocationColumns, setDefaultColumns } from './columns';

describe('invocation columns', () => {
  it('does not include Limit key by default', () => {
    expect(getDefaultInvocationColumns()).not.toContain('limit_key');
  });

  it('does not write Limit key into the default column query', () => {
    const searchParams = setDefaultColumns(new URLSearchParams());

    expect(searchParams.getAll('column')).not.toContain('limit_key');
  });
});
