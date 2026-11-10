import { render, screen } from '@testing-library/react';
import { RestateError } from '@restate/util-errors';
import { vi } from 'vitest';
import { state } from './state.route';

const catalog = vi.hoisted(() => ({
  current: {} as {
    services: string[];
    isPending: boolean;
    isUsingPlaceholderServices: boolean;
    error: Error | null;
  },
}));
const restateContext = vi.hoisted(() => ({
  current: {} as { healthError?: Error },
}));

vi.mock('@restate/features-state-object-route', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/features-state-object-route')
  >()),
  useStateServiceCatalog: () => catalog.current,
}));

vi.mock('@restate/features-restate-context', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/features-restate-context')
  >()),
  useRestateContext: () => restateContext.current,
}));

describe('state route', () => {
  it('shows why the services could not load', () => {
    catalog.current = {
      services: [],
      isPending: false,
      isUsingPlaceholderServices: false,
      error: new RestateError(
        'Malformed environment id',
        undefined,
        undefined,
        undefined,
        400,
      ),
    };
    restateContext.current = {};

    render(<state.Component />);

    expect(screen.getByText('Couldn’t load state')).toBeTruthy();
    expect(screen.getByText('Request failed with status 400.')).toBeTruthy();
    expect(screen.getByText('Malformed environment id')).toBeTruthy();
    expect(screen.queryByText('No state found')).toBeNull();
  });

  it('shows the health error while the services cannot load', () => {
    catalog.current = {
      services: [],
      isPending: true,
      isUsingPlaceholderServices: false,
      error: null,
    };
    restateContext.current = {
      healthError: new Error('Cannot reach your Restate server.'),
    };

    render(<state.Component />);

    expect(screen.getByText('Couldn’t load state')).toBeTruthy();
    expect(screen.getByText('Cannot reach your Restate server.')).toBeTruthy();
  });
});
