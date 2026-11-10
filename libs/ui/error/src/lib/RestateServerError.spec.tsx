import { render, screen } from '@testing-library/react';
import { RestateError } from '@restate/util-errors';
import { RestateServerError } from './RestateServerError';

describe('RestateServerError', () => {
  it('shows the status of a request error without a Restate code', () => {
    render(
      <RestateServerError
        error={
          new RestateError(
            'Malformed environment id',
            undefined,
            undefined,
            undefined,
            400,
          )
        }
      />,
    );

    expect(screen.getByText('Request failed with status 400.')).toBeTruthy();
    expect(screen.getByText('Malformed environment id')).toBeTruthy();
  });

  it('keeps the generic summary for an error without a status', () => {
    render(<RestateServerError error={new RestateError('Boom')} />);

    expect(
      screen.getByText(
        'An error has occurred! Check the details below for more information:',
      ),
    ).toBeTruthy();
  });

  it('prefers the summary of a UI error code to its status', () => {
    render(
      <RestateServerError
        error={
          new RestateError(
            'Request failed due to a network error: POST http://localhost/query',
            'UI0005',
            undefined,
            undefined,
            500,
          )
        }
      />,
    );

    expect(
      screen.getByText('Could not reach the Restate server.'),
    ).toBeTruthy();
    expect(screen.queryByText('Request failed with status 500.')).toBeNull();
  });
});
