import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { WorkflowRunTarget } from './WorkflowRunTarget';

describe('WorkflowRunTarget', () => {
  it('renders a non-animated chevron inside a linked Workflow ID chip', () => {
    render(
      <MemoryRouter>
        <WorkflowRunTarget
          identity={{
            scope: 'workflows',
            service: 'StatefulWorkflow',
            id: 'workflow-1352',
          }}
          href="/workflows/StatefulWorkflow/workflow-1352?scope=workflows"
          showService={false}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', {
      name: 'Workflow run Scope workflows · StatefulWorkflow / workflow-1352',
    });
    const idChip = screen.getByText('workflow-1352').closest('[data-chip]');
    const chevron = link.querySelector('.lucide-chevron-right');

    expect(chevron?.closest('[data-chip]')).toBe(idChip);
    expect(chevron?.getAttribute('class')).toContain('-mr-1');
    expect(chevron?.getAttribute('class')).not.toContain('group-hover');
  });
});
