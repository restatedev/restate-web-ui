import {
  Handler as HandlerType,
  ServiceType,
} from '@restate/data-access/admin-api';
import { HandlerTypeExplainer } from '@restate/features/explainers';
import { DropdownSection } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import {
  Popover,
  PopoverContent,
  PopoverHoverTrigger,
  PopoverTrigger,
  usePopover,
} from '@restate/ui/popover';
import { ServicePlaygroundTrigger } from './ServicePlayground';
import { ComponentProps } from 'react';
import { JsonSchemaViewer } from '@restate/ui/api';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Badge } from '@restate/ui/badge';
import { Link } from '@restate/ui/link';
import {
  HANDLER_QUERY_PARAM,
  SERVICE_PLAYGROUND_QUERY_PARAM,
  SERVICE_QUERY_PARAM,
} from './constants';
import { Button } from '@restate/ui/button';

const styles = tv({
  base: 'relative flex flex-row flex-wrap items-center pr-2',
});

function getContentTypeLabel(contentType: string) {
  if (
    contentType.startsWith('one of [') ||
    contentType.startsWith('value of content-type') ||
    contentType.startsWith('JSON value of content-type')
  ) {
    try {
      let parsedContentType = contentType;
      if (contentType.startsWith('one of [')) {
        parsedContentType = JSON.parse(contentType.replace('one of ', '')).at(
          1,
        );
      }
      return (
        parsedContentType
          ?.match(/'.*'/)
          ?.at(0)
          ?.split('application/')
          .at(-1)
          ?.replace(/'/g, '') || contentType
      );
    } catch (error) {
      return contentType;
    }
  }
  return contentType.split('application/').at(-1);
}

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
          <div className="h-6 w-6 shrink-0 rounded-md border bg-white shadow-xs">
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
                schema={handler.input_json_schema}
                contentType={handler.input_description}
                label="Request"
                service={service}
                withPlayground={withPlayground}
                handler={handler.name}
                className="[&_a]:z-[2]"
              />
              <span className="shrink-0 text-zinc-400">
                {')'}
                <span className="mx-[0.5ch] text-zinc-500">→</span>
              </span>
              <HandlerInputOutput
                schema={handler.output_json_schema}
                contentType={handler.output_description}
                label="Response"
                service={service}
                withPlayground={withPlayground}
                handler={handler.name}
                className="[&_a]:z-[2]"
              />
              {showLink && (
                <Link
                  variant="icon"
                  href={`?${SERVICE_QUERY_PARAM}=${service}&${HANDLER_QUERY_PARAM}=${handler.name}`}
                  className="my-0.5 ml-auto shrink-0 rounded-full before:absolute before:-top-0.5 before:-right-1 before:-bottom-0.5 before:-left-1 before:z-[0] before:rounded-lg before:content-[''] hover:before:bg-black/3"
                >
                  <Icon
                    name={IconName.ChevronRight}
                    className="h-4 w-4 text-gray-400"
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

const inputOutputStyles = tv({
  base: 'contents items-center gap-1 rounded-md py-0 pl-0.5 text-2xs text-zinc-700',
  slots: {
    value: 'mr-0.5 contents font-mono leading-5 font-semibold text-zinc-500',
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
  const hasMultipleType = Array.isArray(schema?.type);
  const isObjectSchema =
    hasSchema &&
    (schema.type === 'object' ||
      schema.anyOf ||
      (hasMultipleType && schema.type.includes('object')));
  const { base, value } = inputOutputStyles({
    hasSchema,
  });

  if (!isObjectSchema && hasSchema) {
    return (
      <span className="max-w-fit grow basis-20 truncate rounded-xs px-0.5 py-0 font-mono text-2xs text-inherit">
        {schema.type ?? getContentTypeLabel(contentType)}
      </span>
    );
  }

  if (!hasSchema && contentType === 'none') {
    return labelProp === 'Request' ? null : (
      <span className="max-w-fit grow basis-20 truncate rounded-xs px-0.5 py-0 font-mono text-2xs text-inherit">
        void
      </span>
    );
  }
  return (
    <div className={base({ className })}>
      <span className={value()}>
        <Popover>
          <PopoverTrigger>
            <Button
              className="z-[2] max-w-fit grow basis-20 truncate rounded-xs px-0.5 py-0.5 font-mono [font-size:inherit] text-inherit [font-style:inherit] underline decoration-dashed decoration-from-font underline-offset-4 [&:not([href])]:cursor-default"
              variant="icon"
            >
              <span className="truncate pr-0.5">
                {schema?.title ?? schema?.type ?? (
                  <span className="uppercase">
                    {getContentTypeLabel(contentType)}
                  </span>
                )}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="[&_header]:font-mono [&_header]:text-0.5xs">
            <DropdownSection
              className="mb-1 max-w-[min(90vw,600px)] min-w-80 overflow-auto px-4"
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
              {isObjectSchema ? (
                <JsonSchemaViewer
                  className="font-mono [&:has([aria-haspopup])]:min-h-32 [&>*>[aria-haspopup]]:mt-2 [&>*[data-test='property-description']]:mt-2"
                  schema={schema}
                />
              ) : (
                <div className="flex items-center gap-2 py-2 font-mono text-0.5xs text-zinc-500">
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
  props: ComponentProps<typeof ServicePlaygroundTrigger>,
) {
  const { close } = usePopover();

  return <ServicePlaygroundTrigger {...props} onClick={close} />;
}
