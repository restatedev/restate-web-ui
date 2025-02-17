import {
  useListDeployments,
  useListServices,
} from '@restate/data-access/admin-api';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

function Component() {
  const { data: deployments } = useListDeployments();
  const services = Array.from(deployments?.services.keys() ?? []);
  const { data } = useListServices(services);
  const virtualObject = Array.from(data.entries())
    .filter(([service, data]) => data.ty === 'VirtualObject')
    .at(0)?.[0];
  const navigate = useNavigate();

  useEffect(() => {
    virtualObject &&
      navigate(`/state/${virtualObject}${window.location.search}`);
  }, [navigate, virtualObject]);

  if (virtualObject) {
    return null;
  }
  if (data && deployments && !virtualObject) {
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
