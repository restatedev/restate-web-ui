import { Handler as HandlerType } from '@restate/data-access/admin-api';
import { HandlerTypeExplainer } from '@restate/features/explainers';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from 'tailwind-variants';
import {
  Popover,
  PopoverContent,
  PopoverHoverTrigger,
  usePopover,
} from '@restate/ui/popover';
import { ServicePlaygroundTrigger } from './ServicePlayground';
import { ComponentProps } from 'react';
import { JsonSchemaViewer } from '@restate/ui/api';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Badge } from '@restate/ui/badge';
import { Link } from '@restate/ui/link';
import { SERVICE_PLAYGROUND_QUERY_PARAM } from './constants';

const styles = tv({
  base: 'flex flex-row flex-wrap relative items-center  pr-2',
});

function getContentTypeLabel(contentType: string) {
  return contentType.split('application/').at(-1);
}

export function Handler({
  handler,
  className,
  service,
  withPlayground,
}: {
  handler: HandlerType;
  className?: string;
  service: string;
  withPlayground?: boolean;
}) {
  return (
    <div className={styles({ className })}>
      <div className="flex flex-row items-end gap-2 flex-auto min-w-0">
        <div className="shrink-0 h-6 w-6 bg-white border shadow-sm rounded-md -mb-0.5">
          <Icon
            name={IconName.Function}
            className="w-full h-full text-zinc-400"
          />
        </div>
        <div className="flex items-center flex-row gap-x-1.5 flex-wrap flex-auto justify-start min-w-0">
          {handler.ty && (
            <Badge
              size="sm"
              className="text-xs py-0 font-medium bg-transparent border-none text-zinc-500/80 px-0"
            >
              <HandlerTypeExplainer type={handler.ty} variant="inline-help">
                {handler.ty}
              </HandlerTypeExplainer>
            </Badge>
          )}
          <div className="text-code min-w-0 text-zinc-600 italic font-medium flex-auto">
            <span className="flex items-center">
              <TruncateWithTooltip copyText={handler.name}>
                {handler.name}
              </TruncateWithTooltip>

              <span className="ml-[0.5ch] shrink-0 text-zinc-400">{'('}</span>
              <HandlerInputOutput
                schema={handler.input_json_schema}
                contentType={handler.input_description}
                label="Request"
                service={service}
                withPlayground={withPlayground}
                handler={handler.name}
              />
              <span className="shrink-0 text-zinc-400">
                {')'}
                <span className="text-zinc-500 mx-[0.5ch]">→</span>
              </span>
              <HandlerInputOutput
                schema={handler.output_json_schema}
                contentType={handler.output_description}
                label="Response"
                service={service}
                withPlayground={withPlayground}
                handler={handler.name}
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputOutputStyles = tv({
  base: 'contents text-2xs gap-1 rounded-md pl-0.5 py-0  items-center text-zinc-700',
  slots: {
    value: 'contents text-zinc-500 font-semibold font-mono leading-5 mr-0.5',
  },
  variants: {
    hasSchema: {
      true: {
        base: '',
        value: '',
      },
      false: {
        base: '',
        value: '',
      },
    },
  },
});

function HandlerInputOutput({
  className,
  schema,
  contentType,
  label: labelProp,
  service,
  handler,
  withPlayground,
}: {
  className?: string;
  schema?: any;
  contentType: string;
  label: string;
  service: string;
  handler: string;
  withPlayground?: boolean;
}) {
  const hasSchema = Boolean(schema);
  const { base, value } = inputOutputStyles({
    className,
    hasSchema,
  });

  return (
    <div className={base()}>
      <span className={value()}>
        <Popover>
          <PopoverHoverTrigger>
            <Link
              className="basis-20 grow max-w-fit truncate font-mono text-inherit [font-style:inherit] [font-size:inherit] px-0.5 py-0 rounded-sm underline-offset-4 decoration-from-font decoration-dashed underline "
              variant="icon"
              href={`?${SERVICE_PLAYGROUND_QUERY_PARAM}=${service}#/operations/${handler}`}
            >
              <span className="truncate pr-0.5">
                {schema?.title ?? (
                  <span className="uppercase ">
                    {getContentTypeLabel(contentType)}
                  </span>
                )}
              </span>
            </Link>
          </PopoverHoverTrigger>
          <PopoverContent className="[&_header]:font-mono [&_header]:text-code">
            <DropdownSection
              className="min-w-80 overflow-auto max-w-[min(90vw,600px)] px-4 mb-1"
              title={
                <div className="flex items-center">
                  <span>{hasSchema ? schema.title : labelProp}</span>
                  {withPlayground && (
                    <div className="ml-auto">
                      <ServicePlaygroundTriggerWithClosePopover
                        service={service}
                        handler={handler}
                        variant="icon"
                      />
                    </div>
                  )}
                </div>
              }
            >
              {hasSchema ? (
                <JsonSchemaViewer
                  className="font-mono [&>*>[aria-haspopup]]:mt-2 [&>*[data-test='property-description']]:mt-2"
                  schema={schema}
                />
              ) : (
                <div className="font-mono text-code text-zinc-500 py-2 flex items-center gap-2">
                  Content-Type:<Badge size="sm">{contentType}</Badge>
                </div>
              )}
            </DropdownSection>
          </PopoverContent>
        </Popover>
      </span>
    </div>
  );
}

function ServicePlaygroundTriggerWithClosePopover(
  props: ComponentProps<typeof ServicePlaygroundTrigger>
) {
  const { close } = usePopover();

  return <ServicePlaygroundTrigger {...props} onClick={close} />;
}
