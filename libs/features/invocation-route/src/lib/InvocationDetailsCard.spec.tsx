import type { Invocation, Service } from '@restate/data-access-admin-api-spec';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { InvocationDetailsCard } from './InvocationDetailsCard';

const services = vi.hoisted(() => ({ current: new Map<string, Service>() }));

vi.mock('@restate/data-access-admin-api-hooks', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/data-access-admin-api-hooks')
  >()),
  useListServices: () => ({ data: services.current }),
}));

beforeEach(() => {
  services.current = new Map();
});

const invocation: Invocation = {
  id: 'inv-details',
  created_at: '2026-01-01T00:00:00.000Z',
  modified_at: '2026-01-01T00:00:00.000Z',
  scheduled_at: '2026-01-01T00:00:00.000Z',
  invoked_by: 'ingress',
  status: 'pending',
  target: 'ExampleService/run',
  target_handler_name: 'run',
  target_service_name: 'ExampleService',
  target_service_ty: 'service',
  vqueue_id: 'vq-details',
};

describe('InvocationDetailsCard', () => {
  it('shows a semantic icon beside every detail label', () => {
    render(
      <MemoryRouter>
        <InvocationDetailsCard
          invocation={{
            ...invocation,
            scope: 'objects',
            target: 'StatefulCounter/increment',
            target_service_name: 'StatefulCounter',
            target_service_key: 'hot-account',
            target_service_ty: 'virtual_object',
            limit_key: 'batch/acme',
            idempotency_key: 'idempotency-key',
            trace_id: 'trace-id',
            created_using_restate_version: '1.7.3',
          }}
        />
      </MemoryRouter>,
    );

    for (const label of [
      'Virtual Object',
      'VQueue',
      'Limit key',
      'Idempotency key',
      'Trace ID',
      'Created by Restate',
    ]) {
      const icon = screen
        .getByText(label)
        .closest('span')
        ?.querySelector('svg');

      expect(icon).toBeTruthy();
      expect(icon?.parentElement?.className).toContain('h-6');
      expect(icon?.parentElement?.className).toContain('w-6');
    }

    expect(
      screen
        .getByText('Idempotency key')
        .closest('span')
        ?.querySelector('.lucide-rotate-ccw-key'),
    ).toBeTruthy();
    expect(
      screen
        .getByText('Trace ID')
        .closest('span')
        ?.querySelector('.lucide-binoculars'),
    ).toBeTruthy();
  });

  it('links directly to the VQueue details page', () => {
    render(
      <MemoryRouter>
        <InvocationDetailsCard invocation={invocation} />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', {
      name: 'Open VQueue vq-details',
    });

    expect(link.getAttribute('href')).toBe('/flow-control/vqueues/vq-details');
    expect(link.textContent).toContain('VQueue');
    expect(link.textContent).toContain('vq-details');
    expect(
      screen.queryByRole('button', { name: 'Open VQueue vq-details' }),
    ).toBeNull();
  });

  it('places the entity chevron inside the final identity chip', () => {
    render(
      <MemoryRouter>
        <InvocationDetailsCard
          invocation={{
            ...invocation,
            scope: 'workflows',
            target: 'StatefulWorkflow/run',
            target_service_name: 'StatefulWorkflow',
            target_service_key: 'workflow-816',
            target_service_ty: 'workflow',
          }}
        />
      </MemoryRouter>,
    );

    const row = screen.getByRole('link', {
      name: 'Open workflow run StatefulWorkflow / workflow-816',
    });
    const keyChip = screen.getByText('workflow-816').closest('[data-chip]');
    const chevron = row.querySelector('[data-service-target-end-content]');
    const chevronIcon = chevron?.querySelector('svg');

    expect(chevron?.closest('[data-chip]')).toBe(keyChip);
    expect(chevronIcon?.getAttribute('class')).toContain('-mr-1');
    expect(chevronIcon?.getAttribute('class')).not.toContain('group-hover');
    expect(row.querySelector(':scope > svg')).toBeNull();
  });

  it('labels a Session Object by the metadata its SDK declares', () => {
    services.current = new Map([
      [
        'notes',
        {
          name: 'notes',
          ty: 'VirtualObject',
          handlers: [],
          revision: 1,
          metadata: {
            'dev.restate.tooling.journal.hidden.names': 'sync',
            'dev.restate.tooling.journal.hidden.name.prefix': 'v22/',
          },
        } as Service,
      ],
    ]);

    render(
      <MemoryRouter>
        <InvocationDetailsCard
          invocation={{
            ...invocation,
            target: 'notes/add',
            target_service_name: 'notes',
            target_handler_name: 'add',
            target_service_key: 'alice',
            target_service_ty: 'virtual_object',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Session Object')).toBeTruthy();
    expect(screen.queryByText('Virtual Object')).toBeNull();
  });
});
