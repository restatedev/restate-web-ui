import { useRef } from 'react';
import type { editor } from 'monaco-editor';
import { Editor } from '@restate/ui/editor';
import { tv } from '@restate/util/styles';
import { Copy } from '@restate/ui/copy';
import { InPortal } from '@restate/ui/portal';
import { ErrorBanner } from '@restate/ui/error';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import {
  Popover,
  PopoverContent,
  PopoverHoverTrigger,
} from '@restate/ui/popover';
import { useDecode } from '@restate/data-access/admin-api-hooks';
import { useCodec } from '@restate/features/codec';

const styles = tv({
  slots: {
    editor:
      'max-w-full [&_.monaco-editor]:w-[100vw]! [&_.monaco-editor]:max-w-full!',
  },
  variants: {
    state: {
      ready: {},
      pending: {
        editor:
          '[&_.view-line>span]:[background-image:linear-gradient(90deg,--theme(--color-zinc-700)_0%,--theme(--color-zinc-700)_42%,--theme(--color-zinc-400)_50%,--theme(--color-zinc-700)_58%,--theme(--color-zinc-700)_100%)] [&_.view-line>span]:bg-no-repeat [&_.view-line>span]:[background-size:250%_100%] [&_.view-line>span]:[background-position:100%_0] [&_.view-line>span]:bg-clip-text [&_.view-line>span]:[-webkit-text-fill-color:transparent] [&_.view-line>span]:animate-scanlineSweep',
      },
    },
  },
  defaultVariants: {
    state: 'ready',
  },
});

export function Value({
  value,
  className,
  isBase64,
  showCopyButton,
  portalId,
}: {
  value?: string;
  className?: string;
  isBase64?: boolean;
  showCopyButton?: boolean;
  portalId?: string;
}) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const codecOptions = useCodec();
  const { data, error, isPending, isFetching } = useDecode(
    value,
    isBase64,
    codecOptions,
  );
  const displayValue = data ?? value;
  const { editor: editorClassName } = styles({
    state: !error && (isPending || isFetching) ? 'pending' : 'ready',
  });

  if (typeof displayValue === 'undefined') {
    return null;
  }

  return (
    <div className="flex w-full items-center">
      <div className="relative min-w-0 flex-auto">
        <Editor
          value={displayValue}
          editorRef={editorRef}
          readonly
          key={displayValue}
          className={editorClassName({ className })}
        />
        {error && (
          <Popover>
            <PopoverHoverTrigger>
              <Button
                variant="icon"
                aria-label="Decoding error"
                className="absolute top-2.5 right-1.5 z-10 h-5.5 w-5.5 rounded-lg border border-amber-200/80 bg-amber-50 p-1 text-amber-700 shadow-xs hover:bg-amber-100"
              >
                <Icon name={IconName.TriangleAlert} className="h-full w-full" />
              </Button>
            </PopoverHoverTrigger>
            <PopoverContent>
              <ErrorBanner error={error} className="max-w-md" />
            </PopoverContent>
          </Popover>
        )}
      </div>
      {showCopyButton && (
        <InPortal id={String(portalId)}>
          <Copy
            copyText={displayValue}
            className="ml-3 h-5.5 w-5.5 rounded-lg border bg-white p-1 text-gray-800 shadow-xs"
          />
        </InPortal>
      )}
    </div>
  );
}

const decodedValueStyles = tv({
  base: '',
  variants: {
    state: {
      ready: '',
      pending:
        '[background-image:linear-gradient(90deg,--theme(--color-zinc-700)_0%,--theme(--color-zinc-700)_42%,--theme(--color-zinc-400)_50%,--theme(--color-zinc-700)_58%,--theme(--color-zinc-700)_100%)] bg-no-repeat [background-size:250%_100%] [background-position:100%_0] bg-clip-text [-webkit-text-fill-color:transparent] animate-scanlineSweep',
    },
  },
  defaultVariants: {
    state: 'ready',
  },
});

const MAX_VALUE_LENGTH = 1000;
export function DecodedValue({
  value,
  className,
  isBase64,
}: {
  value?: string;
  className?: string;
  isBase64?: boolean;
}) {
  const codecOptions = useCodec();
  const { data, error, isPending, isFetching } = useDecode(
    value,
    isBase64,
    codecOptions,
  );
  const displayValue = data ?? value;

  if (typeof displayValue === 'undefined') {
    return null;
  }

  const truncatedValue =
    displayValue.length > MAX_VALUE_LENGTH
      ? displayValue.substring(0, MAX_VALUE_LENGTH)
      : displayValue;

  return (
    <span
      className={decodedValueStyles({
        state: !error && (isPending || isFetching) ? 'pending' : 'ready',
        className,
      })}
    >
      {truncatedValue}
    </span>
  );
}
