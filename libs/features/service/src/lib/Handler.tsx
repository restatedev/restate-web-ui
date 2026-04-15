import {
  Handler as HandlerType,
  ServiceType,
} from '@restate/data-access/admin-api-spec';
import { HandlerInputOutput } from '@restate/feature/handler-input-output';
import { HandlerTypeExplainer } from '@restate/features/explainers';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { ServicePlaygroundTrigger } from './ServicePlayground';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Badge } from '@restate/ui/badge';
import { Link } from '@restate/ui/link';
import {
  HANDLER_QUERY_PARAM,
  SERVICE_PLAYGROUND_QUERY_PARAM,
  SERVICE_QUERY_PARAM,
} from './constants';

const styles = tv({
  base: 'relative flex flex-row flex-wrap items-center pr-2',
});

export function Handler({
  handler,
  className,
  service,
  withPlayground,
  serviceType,
  showLink,
  showType = true,
}: {
  handler: HandlerType;
  className?: string;
  service: string;
  withPlayground?: boolean;
  serviceType?: ServiceType;
  showLink?: boolean;
  showType?: boolean;
}) {
  return (
    <div className={styles({ className })}>
      <div className="flex min-w-0 flex-auto flex-row items-end gap-2">
        <div className="flex h-[1.75rem] items-center">
          <div
            className="h-6 w-6 shrink-0 rounded-md border bg-white shadow-xs"
            data-icon
          >
            <Icon
              name={IconName.Function}
              className="h-full w-full text-zinc-400"
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-auto flex-row flex-wrap items-center justify-start gap-x-1.5">
          {handler.ty &&
            serviceType &&
            serviceType !== 'Service' &&
            showType && (
              <Badge
                size="sm"
                className="border-none bg-transparent px-0 py-0 text-xs font-medium text-zinc-500/80"
              >
                <HandlerTypeExplainer type={handler.ty} variant="inline-help">
                  {handler.ty}
                </HandlerTypeExplainer>
              </Badge>
            )}
          <div className="min-w-0 flex-auto text-0.5xs leading-[1.75rem] font-medium text-zinc-600 italic">
            <span className="flex items-center">
              <TruncateWithTooltip copyText={handler.name}>
                {withPlayground ? (
                  <Link
                    className="relative z-[2] mx-1 text-inherit no-underline"
                    variant="secondary"
                    href={`?${SERVICE_PLAYGROUND_QUERY_PARAM}=${service}#/operations/${handler.name}`}
                  >
                    {handler.name}
                  </Link>
                ) : (
                  handler.name
                )}
              </TruncateWithTooltip>
              <span className="shrink-0 text-zinc-400">{'('}</span>
              <HandlerInputOutput
                jsonSchema={handler.input_json_schema}
                contentType={handler.input_description}
                label="Request"
                metadata={handler.metadata}
                renderHeaderAction={
                  withPlayground
                    ? (close) => (
                        <ServicePlaygroundTrigger
                          service={service}
                          handler={handler.name}
                          variant="icon"
                          onClick={close}
                        />
                      )
                    : undefined
                }
                className="[&_a]:z-[2] [&_button]:text-zinc-500/80"
              />
              <span className="shrink-0 text-zinc-400">
                {')'}
                <span className="mx-[0.5ch] text-zinc-500">→</span>
              </span>
              <HandlerInputOutput
                jsonSchema={handler.output_json_schema}
                contentType={handler.output_description}
                label="Response"
                metadata={handler.metadata}
                renderHeaderAction={
                  withPlayground
                    ? (close) => (
                        <ServicePlaygroundTrigger
                          service={service}
                          handler={handler.name}
                          variant="icon"
                          onClick={close}
                        />
                      )
                    : undefined
                }
                className="[&_a]:z-[2] [&_button]:text-zinc-500/80"
              />
              {showLink && (
                <Link
                  variant="icon"
                  href={`?${SERVICE_QUERY_PARAM}=${service}&${HANDLER_QUERY_PARAM}=${handler.name}`}
                  className="my-0.5 ml-auto shrink-0 rounded-full before:absolute before:-top-0.5 before:-right-1 before:-bottom-0.5 before:-left-1 before:z-[0] before:rounded-lg before:content-[''] hover:before:bg-black/3"
                >
                  <Icon
                    name={IconName.ChevronRight}
                    className="h-4 w-4 text-gray-400/80"
                  />
                </Link>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
