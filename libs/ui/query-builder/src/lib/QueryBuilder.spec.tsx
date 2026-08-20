import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { AddQueryTrigger, QueryBuilder, useQueryBuilder } from './QueryBuilder';
import {
  QueryClause,
  type QueryClauseSchema,
  type QueryClauseType,
} from './Query';

function customSchema(source: string) {
  return {
    id: 'custom',
    label: 'Custom',
    operations: [{ value: 'EQUALS', label: 'is' }],
    type: 'CUSTOM_STRING',
    metadata: { source },
  } satisfies QueryClauseSchema<'CUSTOM_STRING'>;
}

function SelectedClause({ item }: { item: QueryClause<QueryClauseType> }) {
  return (
    <span>
      {String(item.schema.metadata?.source)}:{item.fieldValue}
    </span>
  );
}

function Harness() {
  const [schema, setSchema] = useState<QueryClauseSchema<QueryClauseType>[]>([
    customSchema('initial'),
  ]);
  const query = useQueryBuilder();

  return (
    <>
      <button onClick={() => setSchema([customSchema('resolved')])}>
        Resolve schema
      </button>
      <QueryBuilder query={query} schema={schema} multiple>
        <AddQueryTrigger
          placeholder="Filter…"
          title="Filters"
          showSectionTitle={false}
        >
          {SelectedClause}
        </AddQueryTrigger>
      </QueryBuilder>
    </>
  );
}

describe('AddQueryTrigger', () => {
  it('uses the latest schema from a stable add handler', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Resolve schema' }));
    const combobox = screen.getByRole('combobox', { name: 'Filters' });
    await user.click(combobox);
    await user.type(combobox, 'tenant{Enter}');

    expect(screen.getByText('resolved:tenant')).toBeTruthy();
  });
});
