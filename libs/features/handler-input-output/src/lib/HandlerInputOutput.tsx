import { JsonSchemaViewer } from '@restate/ui/api';
import { Badge } from '@restate/ui/badge';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopover,
} from '@restate/ui/popover';
import { tv } from '@restate/util/styles';
import type { ReactNode } from 'react';
import type {
  HandlerInputOutputView,
  HandlerInputOutputLabel,
} from './schema-metadata';
import { getHandlerInputOutputView } from './schema-metadata';

type HandlerInputOutputJsonSchemaPopoverView = Extract<
  HandlerInputOutputView,
  { kind: 'json-schema-popover' }
>;

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

function HandlerInputOutputHidden() {
  return null;
}

function HandlerInputOutputText({ text }: { text: string }) {
  return (
    <span className="max-w-fit grow basis-20 truncate rounded-xs px-0.5 py-0 font-mono text-2xs text-inherit">
      {text}
    </span>
  );
}

function HandlerInputOutputPopoverShell({
  className,
  triggerLabel,
  title,
  renderHeaderAction,
  children,
}: {
  className?: string;
  triggerLabel: string;
  title: string;
  renderHeaderAction?: (close: () => void) => ReactNode;
  children: ReactNode;
}) {
  const { base, value } = inputOutputStyles({
    hasSchema: true,
  });

  return (
    <div className={base({ className })}>
      <span className={value()}>
        <Popover>
          <PopoverTrigger>
            <Button
              className="z-[2] max-w-fit grow basis-20 truncate rounded-xs px-0.5 py-0.5 font-mono [font-size:inherit] text-inherit [font-style:inherit] underline decoration-dashed decoration-from-font underline-offset-4 [&:not([href])]:cursor-default"
              variant="icon"
            >
              <span className="truncate pr-0.5">{triggerLabel}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="[&_header]:font-mono [&_header]:text-0.5xs">
            <DropdownSection
              className="mb-1 max-w-[min(90vw,600px)] min-w-80 overflow-auto px-4"
              title={
                <div className="flex items-center">
                  <span>{title}</span>
                  <div className="ml-auto">
                    <PopoverHeaderAction
                      renderHeaderAction={renderHeaderAction}
                    />
                  </div>
                </div>
              }
            >
              {children}
            </DropdownSection>
          </PopoverContent>
        </Popover>
      </span>
    </div>
  );
}

function HandlerInputOutputJsonSchemaPopoverContent({
  schema,
}: {
  schema: HandlerInputOutputJsonSchemaPopoverView['jsonSchema'];
}) {
  return (
    <JsonSchemaViewer
      className="font-mono [&:has([aria-haspopup])]:min-h-32 [&>*>[aria-haspopup]]:mt-2 [&>*[data-test='property-description']]:mt-2"
      schema={schema}
    />
  );
}

function HandlerInputOutputContentTypePopoverContent({
  contentType,
}: {
  contentType: string;
}) {
  return (
    <div className="flex items-center gap-2 py-2 font-mono text-0.5xs text-zinc-500">
      Content-Type:<Badge size="sm">{contentType}</Badge>
    </div>
  );
}

function PopoverHeaderAction({
  renderHeaderAction,
}: {
  renderHeaderAction?: (close: () => void) => ReactNode;
}) {
  const { close } = usePopover();

  if (!renderHeaderAction) {
    return null;
  }

  return <>{renderHeaderAction(() => close?.())}</>;
}

export function HandlerInputOutput({
  className,
  jsonSchema,
  contentType,
  label,
  renderHeaderAction,
}: {
  className?: string;
  jsonSchema?: unknown;
  contentType: string;
  label: HandlerInputOutputLabel;
  renderHeaderAction?: (close: () => void) => ReactNode;
}) {
  const view: HandlerInputOutputView = getHandlerInputOutputView({
    jsonSchema,
    contentType,
    label,
  });

  switch (view.kind) {
    case 'hidden':
      return <HandlerInputOutputHidden />;
    case 'text':
      return <HandlerInputOutputText text={view.text} />;
    case 'json-schema-popover':
      return (
        <HandlerInputOutputPopoverShell
          className={className}
          triggerLabel={view.triggerLabel}
          title={view.title}
          renderHeaderAction={renderHeaderAction}
        >
          <HandlerInputOutputJsonSchemaPopoverContent
            schema={view.jsonSchema}
          />
        </HandlerInputOutputPopoverShell>
      );
    case 'content-type-popover':
      return (
        <HandlerInputOutputPopoverShell
          className={className}
          triggerLabel={view.triggerLabel}
          title={view.title}
          renderHeaderAction={renderHeaderAction}
        >
          <HandlerInputOutputContentTypePopoverContent
            contentType={view.contentType}
          />
        </HandlerInputOutputPopoverShell>
      );
  }
}
