import {
  ServicePlaygroundTrigger,
  ServiceType,
} from '@restate/features/service';
import { Info } from './Info';

export function ServiceHeader({
  type,
  service,
  handler,
  info,
}: {
  service: string;
  handler?: string;
  type?: 'Service' | 'VirtualObject' | 'Workflow';
  info?: {
    code?: string | null;
    message: string;
  }[];
}) {
  return (
    <div className="flex w-full items-center gap-2">
      <ServiceType type={type} className="" />
      <ServicePlaygroundTrigger
        service={service}
        className=""
        variant="button"
        handler={handler}
      />

      <Info info={info} />
    </div>
  );
}
