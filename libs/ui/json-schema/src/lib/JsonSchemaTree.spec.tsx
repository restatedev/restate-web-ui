import { fireEvent, render, screen } from '@testing-library/react';
import { JsonSchemaTree } from './JsonSchemaTree';

const schema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid', description: 'Order id' },
    status: { type: 'string', enum: ['draft', 'paid'], default: 'draft' },
    address: {
      type: 'object',
      properties: {
        city: { type: 'string' },
        geo: {
          type: 'object',
          properties: { lat: { type: 'number', minimum: -90 } },
        },
      },
    },
    item: {
      oneOf: [
        {
          type: 'object',
          properties: { kind: { const: 'book' }, isbn: { type: 'string' } },
        },
        {
          type: 'object',
          properties: { kind: { const: 'film' }, minutes: { type: 'integer' } },
        },
      ],
    },
  },
};

describe('JsonSchemaTree', () => {
  it('shows properties with types, badges and values', () => {
    render(<JsonSchemaTree schema={schema} />);

    expect(screen.getByText('id')).toBeTruthy();
    expect(screen.getByText('string<uuid>')).toBeTruthy();
    expect(screen.getByText('required')).toBeTruthy();
    expect(screen.getByText('Order id')).toBeTruthy();
    expect(screen.getByText('Allowed values:')).toBeTruthy();
    expect(screen.getAllByText('"draft"')).toHaveLength(2);
  });

  it('expands one level by default and more on click', () => {
    render(<JsonSchemaTree schema={schema} />);

    expect(screen.getByText('city')).toBeTruthy();
    expect(screen.queryByText('lat')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expand geo' }));
    expect(screen.getByText('lat')).toBeTruthy();
    expect(screen.getByText('>= -90')).toBeTruthy();
  });

  it('switches between union variants', () => {
    render(<JsonSchemaTree schema={schema} />);

    expect(screen.getByRole('button', { name: 'Collapse item' })).toBeTruthy();
    expect(screen.getByText('isbn')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'film' }));
    expect(screen.queryByText('isbn')).toBeNull();
    expect(screen.getByText('minutes')).toBeTruthy();
  });

  it('says when anything is accepted', () => {
    render(<JsonSchemaTree schema={{}} emptyText="Any JSON value" />);

    expect(screen.getByText('Any JSON value')).toBeTruthy();
  });
});
