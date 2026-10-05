import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { UnauthorizedError } from '@restate/util/errors';
import { vi } from 'vitest';
import { CrashError } from './CrashError';

function renderCrash(error: Error, supportHref?: string) {
  const router = createMemoryRouter([
    {
      path: '/',
      Component: () => {
        throw error;
      },
      ErrorBoundary: () => <CrashError supportHref={supportHref} />,
    },
  ]);
  return render(<RouterProvider router={router} />);
}

describe('CrashError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('links to GitHub issues by default', () => {
    renderCrash(new Error('Boom'));

    expect(screen.getByRole('heading').textContent).toBe(
      'This page couldn’t be displayed',
    );
    expect(screen.getByText(/not affected/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'let us know' }).getAttribute('href'),
    ).toBe('https://github.com/restatedev/restate/issues/new');
  });

  it('uses the given support link', () => {
    renderCrash(new Error('Boom'), 'mailto:cloud@restate.dev');

    expect(
      screen.getByRole('link', { name: 'let us know' }).getAttribute('href'),
    ).toBe('mailto:cloud@restate.dev');
  });

  it('renders nothing for unauthorized errors', () => {
    const { container } = renderCrash(new UnauthorizedError());

    expect(container.textContent).toBe('');
  });
});
