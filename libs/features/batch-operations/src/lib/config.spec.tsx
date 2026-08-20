import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OPERATION_CONFIG } from './config';

describe('batch operation count', () => {
  it('keeps the confirmation copy visible while only the count is loading', () => {
    render(
      <>
        {OPERATION_CONFIG['retry-now'].description(
          undefined,
          false,
          'just now',
          {
            filters: [
              {
                field: 'status',
                type: 'STRING',
                operation: 'EQUALS',
                value: 'backing-off',
              },
            ],
          },
        )}
      </>,
    );

    expect(screen.getByText(/Are you sure you want to retry/)).toBeTruthy();
    expect(
      screen
        .getByRole('status', { name: 'Loading invocation count' })
        .classList.contains('animate-pulse'),
    ).toBe(true);
    expect(
      screen.getByText(/matching the following criteria now/),
    ).toBeTruthy();
  });
});
