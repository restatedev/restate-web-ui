import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NoDeploymentPlaceholder } from './NoDeploymentPlaceholder';

const context = vi.hoisted(() => ({
  tunnel: undefined as
    | { isEnabled?: boolean; configureSdkHref?: string }
    | undefined,
}));

vi.mock('@restate/features-restate-context', () => ({
  useRestateContext: () => ({ tunnel: context.tunnel }),
}));

vi.mock('@restate/features-explainers', () => ({
  ServiceDeploymentExplainer: ({ children }: { children: ReactNode }) =>
    children,
  ServiceExplainer: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@restate/features-register-deployment', () => ({
  TriggerRegisterDeploymentDialog: ({
    children = 'Register deployment',
    endpoint = 'true',
  }: {
    children?: ReactNode;
    endpoint?: string;
  }) => <a href={`?registerDeployment=${endpoint}`}>{children}</a>,
}));

vi.mock('@restate/ui-icons', () => ({
  Icon: () => null,
  IconName: { Connect: 'connect' },
}));

vi.mock('@restate/ui-link', () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@restate/ui-loading', () => ({
  Spinner: () => null,
}));

vi.mock('./ErrorPopoverPill', () => ({
  ErrorPopoverPill: () => null,
}));

function connectLink() {
  return screen.queryByRole('link', { name: 'Connect your service' });
}

describe('NoDeploymentPlaceholder', () => {
  it('opens the connect guide when the host has one', () => {
    context.tunnel = {
      isEnabled: true,
      configureSdkHref: '/env/overview/register-services#configure-sdk',
    };
    render(<NoDeploymentPlaceholder />);

    expect(connectLink()?.getAttribute('href')).toBe(
      '/env/overview/register-services#configure-sdk',
    );
    expect(
      screen
        .getByRole('link', { name: 'Register deployment' })
        .getAttribute('href'),
    ).toBe('?registerDeployment=true');
  });

  it('registers a connect:// deployment when there is no guide', () => {
    context.tunnel = { isEnabled: true };
    render(<NoDeploymentPlaceholder />);

    expect(connectLink()?.getAttribute('href')).toBe(
      '?registerDeployment=connect://',
    );
  });

  it('offers only registration without a tunnel', () => {
    context.tunnel = undefined;
    render(<NoDeploymentPlaceholder />);

    expect(connectLink()).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Register deployment' }),
    ).toBeTruthy();
  });
});
