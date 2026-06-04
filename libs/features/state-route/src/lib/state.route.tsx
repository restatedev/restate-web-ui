import {
  useListDeployments,
  useListServices,
} from '@restate/data-access/admin-api-hooks';
import { IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { Cell, PanelTable, PanelTableColumn } from '@restate/ui/table';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
} from '@restate/ui/content-panel';
import { EmptyState } from '@restate/ui/empty-state';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

const LOADING_COLUMNS: PanelTableColumn[] = [
  { id: 'c0', name: '', isRowHeader: true },
  { id: 'c1', name: '' },
  { id: 'c2', name: '' },
  { id: 'c3', name: '' },
  { id: 'c4', name: '' },
];

function getDefaultVirtualObjectOrWorkflow(services: string[]) {
  if (typeof window !== 'undefined') {
    const previousSelectedState = localStorage.getItem('state_last_service');
    return previousSelectedState && services.includes(previousSelectedState)
      ? previousSelectedState
      : services.at(0);
  }
  return services.at(0);
}

function Component() {
  const { data: deployments } = useListDeployments();
  const services = Array.from(deployments?.services.keys() ?? []);
  const { data, isPending } = useListServices(services);
  const virtualObjectsOrWorkflows = Array.from(data.entries())
    .filter(([service, data]) =>
      ['VirtualObject', 'Workflow'].includes(data.ty),
    )
    .map(([service, data]) => service);
  const defaultService = getDefaultVirtualObjectOrWorkflow(
    virtualObjectsOrWorkflows,
  );
  const navigate = useNavigate();

  useEffect(() => {
    defaultService &&
      navigate(`./${defaultService}${window.location.search}`, {
        relative: 'path',
        replace: true,
      });
  }, [navigate, defaultService]);

  if (defaultService) {
    return null;
  }

  if (isPending) {
    return (
      <ContentPanel>
        <ContentPanelBody>
          <ContentPanelSection flush>
            <PanelTable
              aria-label="State"
              columns={LOADING_COLUMNS}
              items={[]}
              isLoading
              renderCell={() => <Cell />}
            />
          </ContentPanelSection>
        </ContentPanelBody>
      </ContentPanel>
    );
  }

  if (!isPending && !defaultService) {
    return (
      <EmptyState
        icon={IconName.Database}
        title="No Virtual Object or Workflow"
        description={
          <>
            <Link
              href="https://docs.restate.dev/foundations/services#virtual-object"
              variant="secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more
            </Link>{' '}
            how you can use State in Restate.
          </>
        }
      />
    );
  }

  return null;
}

export const state = { Component };
