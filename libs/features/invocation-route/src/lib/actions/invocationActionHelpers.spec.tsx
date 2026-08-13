import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import {
  getInvocationActionFormData,
  getInvocationActionId,
  InvocationActionHiddenInput,
  InvocationActionId,
} from './invocationActionHelpers';

describe('invocation action helpers', () => {
  it('creates and reads invocation form data', () => {
    const formData = getInvocationActionFormData('invocation-123');

    expect(formData.get('invocation-id')).toBe('invocation-123');
    expect(getInvocationActionId(formData, 'action')).toBe('invocation-123');
  });

  it('reads the invocation from the configured query parameter', () => {
    const searchParams = new URLSearchParams('cancel=invocation-456');

    expect(getInvocationActionId(searchParams, 'cancel')).toBe(
      'invocation-456',
    );
  });

  it('renders the query parameter as the shared hidden field', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/?cancel=invocation-789']}>
        <InvocationActionHiddenInput queryParam="cancel" />
      </MemoryRouter>,
    );

    const input = container.querySelector('input[name="invocation-id"]');
    expect(input?.getAttribute('value')).toBe('invocation-789');
  });

  it('uses the shared shortened invocation ID presentation', () => {
    render(<InvocationActionId value="inv_123456789abcdefgh" />);

    expect(screen.getByText('inv_1234…defgh')).toBeTruthy();
  });
});
