import {
  useListDeployments,
  useListServices,
} from '@restate/data-access/admin-api';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { Column, Table, TableBody, TableHeader } from '@restate/ui/table';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

function getDefaultVirtualObject(virtualObjects: string[]) {
  if (typeof window !== 'undefined') {
    const previousSelectedVirtualObject = localStorage.getItem(
      'state_virtualObject'
    );
    return previousSelectedVirtualObject &&
      virtualObjects.includes(previousSelectedVirtualObject)
      ? previousSelectedVirtualObject
      : virtualObjects.at(0);
  }
  return virtualObjects.at(0);
}

function Component() {
  const { data: deployments } = useListDeployments();
  const services = Array.from(deployments?.services.keys() ?? []);
  const { data, isPending } = useListServices(services);
  const virtualObjects = Array.from(data.entries())
    .filter(([service, data]) => data.ty === 'VirtualObject')
    .map(([service, data]) => service);
  const defaultVirtualObject = getDefaultVirtualObject(virtualObjects);
  const navigate = useNavigate();

  useEffect(() => {
    defaultVirtualObject &&
      navigate(`./${defaultVirtualObject}${window.location.search}`, {
        relative: 'path',
        replace: true,
      });
  }, [navigate, defaultVirtualObject]);

  if (defaultVirtualObject) {
    return null;
  }

  if (isPending) {
    return (
      <div className="flex flex-col flex-auto gap-2 relative">
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

  if (!isPending && !defaultVirtualObject) {
    return (
      <div className="mb-[-6rem] pb-8 pt-24 flex-auto w-full justify-center rounded-xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] flex flex-col items-center">
        <div className="flex flex-col gap-2 items-center relative w-full text-center mt-6">
          <Icon name={IconName.Database} className="w-8 h-8 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-600">
            No Virtual Object
          </h3>
          <p className="text-sm text-gray-500 px-4 max-w-md">
            <Link
              href="https://docs.restate.dev/concepts/services"
              variant="secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more
            </Link>{' '}
            how you can use Virtual Objects in Restate.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export const state = { Component };
