import {
  getDefaultStateService,
  useStateServiceCatalog,
} from '@restate/features-state-object-route';
import { IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { Cell, PanelTable, PanelTableColumn } from '@restate/ui-table';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
} from '@restate/ui-content-panel';
import { EmptyState } from '@restate/ui-empty-state';
import { ErrorBanner } from '@restate/ui-error';
import { useRestateContext } from '@restate/features-restate-context';
import { Navigate } from 'react-router';

const LOADING_COLUMNS: PanelTableColumn[] = [
  { id: 'c0', name: '', isRowHeader: true },
  { id: 'c1', name: '' },
  { id: 'c2', name: '' },
  { id: 'c3', name: '' },
  { id: 'c4', name: '' },
];

function Component() {
  const { services, isPending, isUsingPlaceholderServices, error } =
    useStateServiceCatalog();
  const { healthError } = useRestateContext();
  const defaultService = getDefaultStateService(services);
  const loadError = error ?? healthError;

  if (defaultService) {
    return (
      <Navigate
        to={`./${encodeURIComponent(defaultService)}${window.location.search}`}
        relative="path"
        replace
      />
    );
  }

  if (loadError) {
    return (
      <EmptyState
        icon={IconName.TriangleAlert}
        intent="danger"
        title="Couldn’t load state"
      >
        <ErrorBanner
          error={loadError}
          className="w-full rounded-xl text-left"
        />
      </EmptyState>
    );
  }

  if (isPending || isUsingPlaceholderServices) {
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

  if (!defaultService) {
    return (
      <EmptyState
        icon={IconName.Database}
        title="No state found"
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
