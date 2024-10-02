import type { Deployment } from '@restate/data-access/admin-api';
import { Icon, IconName } from '@restate/ui/icons';

export function Service({
  service,
}: {
  service: Deployment['services'][number];
}) {
  return (
    <div className="flex flex-row items-center gap-2 pr-4 bg-gray-50 shadow-sm border rounded-[calc(0.75rem-1px)]">
      <div className="h-9 aspect-square p-[2px]">
        <div className="rounded-[calc(0.75rem-2px)] bg-gray-200/40 h-full w-full flex items-center justify-center text-gray-400">
          <Icon name={IconName.Box} className="w-5 h-5" />
        </div>
      </div>
      <div className="text-code">{service.name}</div>
      <div className="rounded-full text-xs bg-white border px-2 py-0.5 ring-1 ring-inset ring-gray-100 text-gray-500">
        rev. {service.revision}
      </div>
    </div>
  );
}
