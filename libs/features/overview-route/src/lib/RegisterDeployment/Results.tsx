import * as adminApi from '@restate/data-access/admin-api/spec';
import { Icon, IconName } from '@restate/ui/icons';
import { useRegisterDeploymentContext } from './Context';
import {
  UNSTABLE_Disclosure as Disclosure,
  UNSTABLE_DisclosurePanel as DisclosurePanel,
} from 'react-aria-components';
import { Button } from '@restate/ui/button';
import { ServiceTypeExplainer } from '@restate/features/explainers';
import { Handler } from '../Handler';
import { ServiceType } from '../ServiceType';

export function RegisterDeploymentResults() {
  const { services = [] } = useRegisterDeploymentContext();
  if (services.length === 0) {
    return (
      <div className="p-4 flex flex-col gap-2 items-center relative w-full text-center mt-6 justify-center rounded-xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
        <h3 className="text-sm font-semibold text-gray-600">No services</h3>
        <p className="text-sm text-gray-500 px-4 max-w-md">
          This deployment does not expose any services.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 items-start w-full mt-6">
      {services.map((service) => (
        <Service
          service={service}
          key={service.name}
          defaultExpanded={services.length < 5}
        />
      ))}
    </div>
  );
}

function Service({
  service,
  defaultExpanded,
}: {
  service: adminApi.components['schemas']['ServiceMetadata'];
  defaultExpanded?: boolean;
}) {
  return (
    <div className="w-full rounded-xl p-0.5 border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
      <Disclosure
        defaultExpanded={defaultExpanded}
        className={({ isExpanded }) =>
          isExpanded ? '[&_.disclosure-icon]:rotate-180' : ''
        }
      >
        <div className="relative w-full rounded-[calc(0.75rem-0.125rem)] bg-white border shadow-sm flex items-center flex-row p-0 pr-2 text-sm">
          <Button
            variant="icon"
            slot="trigger"
            className="p-2 text-zinc-400 text-sm inset-0 absolute justify-end rounded-[calc(0.75rem-0.175rem)] hover:bg-black/[0.03] pressed:bg-black/5"
          >
            <Icon name={IconName.ChevronDown} className="disclosure-icon" />
          </Button>
          <div className="h-12 aspect-square p-1">
            <div className="rounded-lg text-blue-400 h-full w-full flex items-center justify-center">
              <div className="p-1 w-8 h-8">
                <Icon
                  name={IconName.Box}
                  className="w-full h-full fill-blue-50 text-blue-400 drop-shadow-md"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 items-start">
            <div className="flex items-center gap-2">
              <div className="font-medium">{service.name}</div>
              <ServiceType type={service.ty} className="ml-auto" />
            </div>
          </div>
          <div className="ml-auto mr-7 uppercase font-semibold text-2xs font-mono items-center rounded-xl px-2 leading-4 bg-gray-50 ring-1 ring-inset ring-zinc-500/20 text-zinc-500">
            rev. {service.revision}
          </div>
        </div>
        <DisclosurePanel>
          {service.handlers.length > 0 && (
            <div className="flex flex-col mt-2 mx-1.5 mb-1.5">
              <div className="ml-2 uppercase text-xs font-semibold text-gray-400 mt-2 mb-1 flex gap-2 items-center">
                Handlers
              </div>
              <div className="flex flex-col gap-2 pl-1.5 mt-2">
                {service.handlers.map((handler) => (
                  <Handler handler={handler} key={handler.name} />
                ))}
              </div>
            </div>
          )}
        </DisclosurePanel>
      </Disclosure>
    </div>
  );
}
