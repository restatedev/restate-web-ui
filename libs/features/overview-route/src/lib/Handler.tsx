import { Handler as HandlerType } from '@restate/data-access/admin-api';
import { HandlerTypeExplainer } from '@restate/features/explainers';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from 'tailwind-variants';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopover,
} from '@restate/ui/popover';
import { ServicePlaygroundTrigger } from './ServicePlayground';
import { ComponentProps } from 'react';
import { JsonSchemaViewer } from '@restate/ui/api';

const styles = tv({
  base: 'flex flex-col gap-0.5 relative',
});

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
      <div className="flex flex-row items-center gap-2">
        <div className="shrink-0 h-6 w-6 bg-white border shadow-sm rounded-md">
          <Icon
            name={IconName.Function}
            className="w-full h-full text-zinc-400"
          />
        </div>
        <div className="text-code text-zinc-600 italic font-medium">
          {handler.name}
        </div>
        {handler.ty && (
          <div className="ml-auto text-2xs font-medium leading-5 bg-white text-zinc-500 ring-zinc-500/20 inline-flex gap-1 items-center rounded-md px-2 py-0 ring-1 ring-inset">
            <HandlerTypeExplainer type={handler.ty} variant="indicator-button">
              {handler.ty}
            </HandlerTypeExplainer>
          </div>
        )}
      </div>
      <div className="absolute w-5 border-l border-b  border-black/20 border-dashed left-3 top-6 bottom-[0.65rem] rounded-b">
        <div className="absolute height-[1px] border-b border-black/20 border-dashed left-0 right-0.5 top-3" />
      </div>
      <div className="pl-7 flex flex-col flex-wrap gap-y-1 gap-x-4 ">
        <HandlerInputOutput
          schema={handler.input_json_schema}
          contentType={handler.input_description}
          label="Req"
          service={service}
          withPlayground={withPlayground}
          handler={handler.name}
        />
        <HandlerInputOutput
          schema={handler.output_json_schema}
          contentType={handler.output_description}
          label="Res"
          service={service}
          withPlayground={withPlayground}
          handler={handler.name}
        />
      </div>
    </div>
  );
}

const inputOutputStyles = tv({
  base: 'text-2xs flex gap-1 rounded-md pl-1 py-0 pr-0 items-center text-gray-700',
  slots: {
    value: 'text-gray-500 font-semibold shrink-0 ml-auto font-mono leading-5',
    label: 'uppercase leading-5 text-gray-500 font-sans ',
    line: 'border-b border-dashed border-black/20 height-[1px] flex-auto',
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
  const { base, value, label, line } = inputOutputStyles({
    className,
    hasSchema,
  });

  return (
    <div className={base()}>
      <span className={label()}>{labelProp}</span>
      <div className={line()} />
      <span className={value()}>
        {hasSchema ? (
          <Popover>
            <PopoverTrigger>
              <Button
                variant="secondary"
                className="py-0 text-gray-500 px-1.5 flex rounded-md items-center gap-1 text-2xs font-mono"
              >
                {schema.title}{' '}
                <Icon
                  name={IconName.ChevronsUpDown}
                  className="h-3 w-3 text-gray-500"
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="[&_header]:font-mono [&_header]:text-code">
              <DropdownSection
                className="min-w-80 overflow-auto max-w-[min(90vw,600px)] px-4 mb-1"
                title={
                  <div className="flex items-center">
                    <span>{schema.title}</span>
                    {withPlayground && (
                      <div className="ml-auto">
                        <ServicePlaygroundTriggerWithClosePopover
                          service={service}
                          handler={handler}
                        />
                      </div>
                    )}
                  </div>
                }
              >
                <JsonSchemaViewer
                  className="font-mono [&>*>[aria-haspopup]]:mt-2 [&>*[data-test='property-description']]:mt-2"
                  schema={schema}
                />
              </DropdownSection>
            </PopoverContent>
          </Popover>
        ) : (
          <span className="inline-block">{contentType}</span>
        )}
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
