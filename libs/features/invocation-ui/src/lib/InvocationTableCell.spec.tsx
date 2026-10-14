import { act, render, screen } from '@testing-library/react';
import {
  Column,
  Row,
  Table,
  TableBody,
  TableHeader,
} from 'react-aria-components';
import { MemoryRouter } from 'react-router';
import { InvocationTableCell } from './InvocationTableCell';

const resizeObservers: ResizeObserverMock[] = [];

class ResizeObserverMock implements ResizeObserver {
  constructor(private callback: ResizeObserverCallback) {
    resizeObservers.push(this);
  }

  target?: Element;

  disconnect = vi.fn();
  observe = vi.fn((target: Element) => {
    this.target = target;
  });
  unobserve = vi.fn();

  notify() {
    this.callback([], this);
  }
}

describe('InvocationTableCell', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resizeObservers.length = 0;
  });

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

  it('middle-truncates an invocation ID only while it overflows', () => {
    const id = 'inv_1234567890abcdefghijklmnopqrstuv';
    const { container } = render(
      <MemoryRouter>
        <Table aria-label="Invocations">
          <TableHeader>
            <Column isRowHeader>ID</Column>
          </TableHeader>
          <TableBody>
            <Row>
              <InvocationTableCell column="id" row={{ id }} />
            </Row>
          </TableBody>
        </Table>
      </MemoryRouter>,
    );

    const measurementContainer = container.querySelector<HTMLElement>(
      '[data-invocation-table-id]',
    );
    const invocationId = measurementContainer?.firstElementChild;
    const renderedIdText = screen.getByText(id);
    expect(measurementContainer).toBeTruthy();
    expect(invocationId).toBeTruthy();
    if (
      !measurementContainer ||
      !(invocationId instanceof HTMLElement) ||
      !(renderedIdText instanceof HTMLElement)
    ) {
      throw new Error('Invocation ID measurement elements are missing');
    }

    let availableWidth = 160;
    vi.spyOn(measurementContainer, 'getBoundingClientRect').mockImplementation(
      () => ({ width: availableWidth }) as DOMRect,
    );
    vi.spyOn(invocationId, 'getBoundingClientRect').mockImplementation(
      () => ({ width: Math.min(availableWidth, 240) }) as DOMRect,
    );
    vi.spyOn(renderedIdText, 'scrollWidth', 'get').mockReturnValue(180);
    vi.spyOn(renderedIdText, 'clientWidth', 'get').mockImplementation(() =>
      Math.min(availableWidth - 60, 180),
    );

    const getIdObserver = () =>
      resizeObservers.findLast(
        (observer) => observer.target === measurementContainer,
      );
    expect(getIdObserver()).toBeTruthy();
    act(() => getIdObserver()?.notify());
    expect(screen.getByText('inv_1234…rstuv')).toBeTruthy();

    availableWidth = 260;
    act(() => getIdObserver()?.notify());
    expect(screen.getByText(id)).toBeTruthy();

    availableWidth = 160;
    act(() => getIdObserver()?.notify());
    expect(screen.getByText('inv_1234…rstuv')).toBeTruthy();
  });
});
