import * as adminApi from '@restate/data-access/admin-api/spec';
import { Icon, IconName } from '@restate/ui/icons';
import { useRegisterDeploymentContext } from './Context';
import {
  UNSTABLE_Disclosure as Disclosure,
  UNSTABLE_DisclosurePanel as DisclosurePanel,
} from 'react-aria-components';
import { Button } from '@restate/ui/button';
import { ServiceTypeExplainer } from '@restate/features/explainers';

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
        <Button
          variant="secondary"
          slot="trigger"
          className="w-full rounded-[calc(0.75rem-0.125rem)] bg-white border shadow-sm flex items-center flex-row p-0 pr-2 text-sm"
        >
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
              <div className="ml-auto text-xs bg-blue-50 text-blue-800 ring-blue-600/20 inline-flex gap-1 items-center rounded-md px-2 py-0.5 font-medium ring-1 ring-inset">
                <ServiceTypeExplainer
                  type={service.ty}
                  variant="indicator-button"
                >
                  {service.ty}
                </ServiceTypeExplainer>
              </div>
            </div>
          </div>
          <div className="ml-auto uppercase font-semibold text-2xs font-mono items-center rounded-xl px-2 leading-4 bg-gray-50 ring-1 ring-inset ring-zinc-500/20 text-zinc-500">
            rev. {service.revision}
          </div>

          <Icon
            name={IconName.ChevronDown}
            className="disclosure-icon flex-shrink-0 text-zinc-400 ml-1.5 text-sm"
          />
        </Button>
        <DisclosurePanel>
          {service.handlers.length > 0 && (
            <div className="flex flex-col mt-2 mx-1.5 mb-1.5">
              <div className="ml-2 uppercase text-xs font-semibold text-gray-400 mt-2 mb-1 flex gap-2 items-center">
                Handlers
              </div>
              {service.handlers.map((handler) => (
                <ServiceHandler handler={handler} key={handler.name} />
              ))}
            </div>
          )}
        </DisclosurePanel>
      </Disclosure>
    </div>
  );
}

function ServiceHandler({
  handler,
}: {
  handler: adminApi.components['schemas']['ServiceMetadata']['handlers'][number];
}) {
  return (
    <div className="flex flex-row items-center gap-2 [&:has(+*)]:rounded-b-none [&+*]:rounded-t-none [&+*]:border-t-0 rounded-[calc(0.75rem-0.5rem)]">
      <div className="h-9 aspect-square p-1">
        <div className="rounded h-full w-full flex items-center justify-center text-gray-400">
          <div className="bg-white border shadow-sm rounded-md w-6 h-6">
            <Icon
              name={IconName.Function}
              className="w-full h-full text-zinc-400"
            />
          </div>
        </div>
      </div>

      <div className="text-code text-zinc-600">{handler.name}</div>
      <div className="ml-auto mr-1.5 text-2xs font-medium bg-white text-zinc-500 ring-zinc-500/20 inline-flex gap-1 items-center rounded-md px-2 py-0 ring-1 ring-inset">
        {handler.ty}
      </div>
    </div>
  );
}
