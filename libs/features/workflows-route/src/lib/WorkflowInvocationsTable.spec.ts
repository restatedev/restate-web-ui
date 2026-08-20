import { WORKFLOW_INTERACTION_COLUMNS } from './WorkflowInvocationsTable';

describe('WorkflowInvocationsTable', () => {
  it('shows interaction columns without Limit key', () => {
    expect(WORKFLOW_INTERACTION_COLUMNS.map(({ id }) => id)).toEqual([
      'id',
      'created_at',
      'target_handler_name',
      'status',
    ]);
  });
});
