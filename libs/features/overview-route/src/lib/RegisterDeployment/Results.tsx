import * as adminApi from '@restate/data-access/admin-api/spec';
import { Icon, IconName } from '@restate/ui/icons';

export function RegisterDeploymentResults({
  services,
}: {
  services: adminApi.components['schemas']['ServiceMetadata'][];
}) {
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
        <Service service={service} key={service.name} />
      ))}
    </div>
  );
}

function Service({
  service,
}: {
  service: adminApi.components['schemas']['ServiceMetadata'];
}) {
  return (
    <div className="w-full rounded-xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
      <div className="rounded-[calc(0.75rem-1px)] bg-white shadow-lg shadow-zinc-800/5 border flex gap-2 items-center flex-row m-[1px] pr-4 text-sm">
        <div className="h-10 aspect-square p-[2px]">
          <div className="rounded-[calc(0.75rem-2px)] bg-blue-50 h-full w-full flex items-center justify-center text-blue-500">
            <Icon name={IconName.Box} className="w-5 h-5" />
          </div>
        </div>
        <div className="font-medium">{service.name}</div>
        <div className="rounded-full text-xs bg-gray-50 border px-2 py-0.5 ring-1 ring-inset ring-gray-100">
          rev. {service.revision}
        </div>
        <div className="ml-auto text-xs bg-blue-50 text-blue-800 ring-blue-600/20 inline-flex gap-1 items-center rounded-lg px-2 py-0.5 text-sm font-medium ring-1 ring-inset">
          {service.ty}
        </div>
      </div>
      <div className="flex flex-col mt-2">
        <div className="ml-4 uppercase text-xs font-semibold text-gray-400 mt-2">
          Handlers
        </div>
        {service.handlers.map((handler) => (
          <ServiceHandler handler={handler} key={handler.name} />
        ))}
      </div>
    </div>
  );
}

function ServiceHandler({
  handler,
}: {
  handler: adminApi.components['schemas']['ServiceMetadata']['handlers'][number];
}) {
  return (
    <div className="flex flex-row items-center gap-2 pr-4 bg-gray-50 shadow-sm border rounded-[calc(0.75rem-1px)]">
      <div className="h-9 aspect-square p-[2px]">
        <div className="rounded-[calc(0.75rem-2px)] bg-gray-200/40 h-full w-full flex items-center justify-center text-gray-400">
          <Icon name={IconName.Function} className="w-5 h-5" />
        </div>
      </div>
      <div className="text-code">{handler.name}</div>
      <div className="ml-auto text-xs bg-gray-100 text-gray-500 ring-gray-500/20 inline-flex gap-1 items-center rounded-lg px-2 py-0.5 text-sm font-medium ring-1 ring-inset">
        {handler.ty}
      </div>
    </div>
  );
}
