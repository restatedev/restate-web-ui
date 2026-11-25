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

  it('explains a rate-limited invocation instead of the generic summary', () => {
    render(
      <RestateServerError
        error={
          new RestateError(
            "service is rate limited due to '503 Service Unavailable' (got retry-after header: 5 seconds)",
            'RT0023',
          )
        }
        isTransient
      />,
    );

    expect(
      screen.getByText(
        /Restate is being rate limited by the service deployment/,
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText(
        'An error has occurred! Check the details below for more information:',
      ),
    ).toBeNull();
  });

  it('names a Restate code it has no summary for', () => {
    render(
      <RestateServerError
        error={
          new RestateError(
            'Object activity changed while loading—try again.',
            'snapshot_changed',
            undefined,
            undefined,
            409,
          )
        }
      />,
    );

    expect(
      screen.getByText('Request failed with status 409 (snapshot_changed).'),
    ).toBeTruthy();
  });
});
