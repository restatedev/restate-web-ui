import { QueryClause } from '@restate/ui/filter-builder';
import {
  createWorkflowIdFilter,
  readWorkflowFilters,
  toWorkflowFilters,
  WORKFLOW_FILTER_SCHEMA,
  workflowFilterSchema,
  writeWorkflowFilters,
} from './workflows.filters';

describe('Workflow filters', () => {
  it('creates a contains filter from direct Workflow ID input', () => {
    const clause = createWorkflowIdFilter('  order-1  ');

    expect(clause && toWorkflowFilters([clause])).toEqual([
      {
        field: 'id',
        type: 'STRING',
        operation: 'CONTAINS',
        value: 'order-1',
      },
    ]);
  });

  it('maps a scope contains clause', () => {
    const scope = WORKFLOW_FILTER_SCHEMA.find(({ id }) => id === 'scope');
    if (!scope) throw new Error('Missing scope filter schema');

    expect(
      toWorkflowFilters([
        new QueryClause(scope, {
          operation: 'CONTAINS',
          value: 'tenant',
        }),
      ]),
    ).toEqual([
      {
        field: 'scope',
        type: 'STRING',
        operation: 'CONTAINS',
        value: 'tenant',
      },
    ]);
  });

  it('hides scope when VQueues are unavailable', () => {
    expect(workflowFilterSchema(false).map(({ id }) => id)).toEqual(['id']);
  });

  it('surfaces and migrates a legacy search parameter', () => {
    const searchParams = new URLSearchParams({
      service: 'OrderWorkflow',
      q: 'order-1',
    });
    const clauses = readWorkflowFilters(searchParams, WORKFLOW_FILTER_SCHEMA);

    expect(toWorkflowFilters(clauses)).toEqual([
      {
        field: 'id',
        type: 'STRING',
        operation: 'CONTAINS',
        value: 'order-1',
      },
    ]);

    const migrated = writeWorkflowFilters(searchParams, clauses);
    expect(migrated.get('service')).toBe('OrderWorkflow');
    expect(migrated.has('q')).toBe(false);
    expect(migrated.has('filter_id')).toBe(true);
  });
});
