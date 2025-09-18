import {
  useListDeployments,
  useListServices,
} from '@restate/data-access/admin-api-hooks';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { Column, Table, TableBody, TableHeader } from '@restate/ui/table';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

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
      <div className="relative flex flex-auto flex-col gap-2">
        <Table aria-label="State">
          <TableHeader>
            <Column isRowHeader></Column>
            <Column></Column>
            <Column></Column>
            <Column></Column>
            <Column></Column>
          </TableHeader>
          <TableBody isLoading numOfColumns={5}></TableBody>
        </Table>
      </div>
    );
  }

  if (!isPending && !defaultService) {
    return (
      <div className="-mb-24 flex w-full flex-auto flex-col items-center justify-center rounded-xl border bg-gray-200/50 pt-24 pb-8 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
        <div className="relative mt-6 flex w-full flex-col items-center gap-2 text-center">
          <Icon name={IconName.Database} className="h-8 w-8 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-600">
            No Virtual Object or Workflow
          </h3>
          <p className="max-w-md px-4 text-sm text-gray-500">
            <Link
              href="https://docs.restate.dev/foundations/services#virtual-object"
              variant="secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more
            </Link>{' '}
            how you can use State in Restate.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export const state = { Component };
