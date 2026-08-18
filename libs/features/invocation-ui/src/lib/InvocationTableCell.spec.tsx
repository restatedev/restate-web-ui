import { render, screen } from '@testing-library/react';
import {
  Column,
  Row,
  Table,
  TableBody,
  TableHeader,
} from 'react-aria-components';
import { MemoryRouter } from 'react-router';
import { InvocationTableCell } from './InvocationTableCell';

describe('InvocationTableCell', () => {
  it('renders a VQueue as a direct link', () => {
    render(
      <MemoryRouter>
        <Table aria-label="Invocations">
          <TableHeader>
            <Column isRowHeader>VQueue ID</Column>
          </TableHeader>
          <TableBody>
            <Row>
              <InvocationTableCell
                column="vqueue_id"
                row={{ id: 'inv_table', vqueue_id: 'vq_table' }}
              />
            </Row>
          </TableBody>
        </Table>
      </MemoryRouter>,
    );

    expect(
      screen
        .getByRole('link', { name: 'Open VQueue vq_table' })
        .getAttribute('href'),
    ).toBe('/flow-control/vqueues/vq_table');
    expect(
      screen.queryByRole('button', { name: 'Open VQueue vq_table' }),
    ).toBeNull();
  });
});
