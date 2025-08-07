import * as adminApi from '@restate/data-access/admin-api/spec';
import { Icon, IconName } from '@restate/ui/icons';
import { useRegisterDeploymentContext } from './Context';
import { Disclosure, DisclosurePanel } from 'react-aria-components';
import { Button } from '@restate/ui/button';
import { Handler } from '../Handler';
import { ServiceType } from '../ServiceType';
import { Link } from '@restate/ui/link';

export function DeploymentProtocolCheck() {
  const { max_protocol_version } = useRegisterDeploymentContext();

  if (max_protocol_version && max_protocol_version <= 4) {
    return (
      <p className="mt-2 flex gap-2 rounded-xl bg-orange-50 p-3 text-code text-orange-600">
        <Icon
          className="h-5 w-5 shrink-0 fill-orange-600 text-orange-100"
          name={IconName.TriangleAlert}
        />
        <span className="inline-block">
          The registered endpoint is using{' '}
          <span className="font-semibold">
            service protocol {max_protocol_version}
          </span>{' '}
          that will be <span className="font-semibold">removed</span> in the
          future releases. Please update the SDK to the latest release and
          re-register the deployment. For more information, refer to the{' '}
          <Link
            href="https://docs.restate.dev/operate/versioning#deploying-new-service-versions"
            target="_blank"
            rel="noopener noreferrer"
          >
            documentation.
          </Link>
        </span>
      </p>
    );
  }

  return null;
}

export function RegisterDeploymentResults() {
  const { services = [] } = useRegisterDeploymentContext();
  if (services.length === 0) {
    return (
      <div className="relative mt-6 flex w-full flex-col items-center justify-center gap-2 rounded-xl border bg-gray-200/50 p-4 text-center shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
        <h3 className="text-sm font-semibold text-gray-600">No services</h3>
        <p className="max-w-md px-4 text-sm text-gray-500">
          This deployment does not expose any services.
        </p>
      </div>
    );
  }
  return (
    <div className="mt-6 flex w-full flex-col items-start gap-2">
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
    <div className="w-full rounded-xl border bg-gray-200/50 p-0.5 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
      <Disclosure
        defaultExpanded={defaultExpanded}
        className={({ isExpanded }) =>
          isExpanded ? '[&_.disclosure-icon]:rotate-180' : ''
        }
      >
        <div className="relative flex w-full flex-row items-center rounded-[calc(0.75rem-0.125rem)] border bg-white p-0 pr-2 text-sm shadow-xs">
          <Button
            variant="icon"
            slot="trigger"
            className="absolute inset-0 justify-end rounded-[calc(0.75rem-0.175rem)] p-2 text-sm text-zinc-400 hover:bg-black/3 pressed:bg-black/5"
          >
            <Icon name={IconName.ChevronDown} className="disclosure-icon" />
          </Button>
          <div className="aspect-square h-12 p-1">
            <div className="flex h-full w-full items-center justify-center rounded-lg text-blue-400">
              <div className="h-8 w-8 p-1">
                <Icon
                  name={IconName.Box}
                  className="h-full w-full fill-blue-50 text-blue-400 drop-shadow-md"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-2">
              <div className="font-medium">{service.name}</div>
              <ServiceType type={service.ty} className="ml-auto" />
            </div>
          </div>
          <div className="mr-7 ml-auto items-center rounded-xl bg-gray-50 px-2 font-mono text-2xs leading-4 font-semibold text-zinc-500 uppercase ring-1 ring-zinc-500/20 ring-inset">
            rev. {service.revision}
          </div>
        </div>
        <DisclosurePanel>
          {(service.handlers ?? []).length > 0 && (
            <div className="mx-1.5 mt-2 mb-1.5 flex flex-col">
              <div className="mt-2 mb-1 ml-2 flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase">
                Handlers
              </div>
              <div className="mt-2 flex flex-col gap-2 pl-1.5">
                {service.handlers.map((handler) => (
                  <Handler
                    handler={handler}
                    key={handler.name}
                    service={service.name}
                    serviceType={service.ty}
                  />
                ))}
              </div>
            </div>
          )}
        </DisclosurePanel>
      </Disclosure>
    </div>
  );
}
