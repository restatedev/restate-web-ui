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

  it('omits a zero lower-bound estimate when the sample finds no matches', () => {
    render(
      <>
        {OPERATION_CONFIG['retry-now'].description(0, true, 'just now', {
          filters: [
            {
              field: 'status',
              type: 'STRING',
              operation: 'EQUALS',
              value: 'backing-off',
            },
          ],
        })}
      </>,
    );

    const description = screen.getByText(/Are you sure you want to retry/);
    expect(description.textContent?.replace(/\s+/g, ' ')).toContain(
      'Are you sure you want to retry invocations matching the following criteria now?',
    );
    expect(description.textContent).not.toContain('0+');
  });
});
