import { useRef } from 'react';
import type { editor } from 'monaco-editor';
import { Editor } from '@restate/ui/editor';
import { Ellipsis, Spinner } from '@restate/ui/loading';
import { useDecode } from '@restate/data-access/admin-api-hooks';
import { tv } from '@restate/util/styles';
import { Copy } from '@restate/ui/copy';
import { InPortal } from '@restate/ui/portal';

const styles = tv({
  base: 'max-w-full [&_.monaco-editor]:w-[100vw]! [&_.monaco-editor]:max-w-full!',
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
  const { data: decodedValue, isFetching } = useDecode(value, isBase64);

  if (typeof decodedValue === 'undefined') {
    return null;
  }

  return (
    <div className="flex w-full items-center">
      {isFetching ? (
        <div className="flex items-center gap-1.5 font-mono text-sm text-zinc-500">
          <Spinner className="h-4 w-4" />
          Loading…
        </div>
      ) : (
        <Editor
          value={decodedValue}
          editorRef={editorRef}
          readonly
          className={styles({ className })}
        />
      )}
      {showCopyButton && (
        <InPortal id={String(portalId)}>
          <Copy
            copyText={decodedValue}
            className="ml-3 h-5.5 w-5.5 rounded-lg border bg-white p-1 text-gray-800 shadow-xs"
          />
        </InPortal>
      )}
    </div>
  );
}

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
  const { data: decodedValue, isFetching } = useDecode(value, isBase64);
  if (typeof decodedValue === 'undefined') {
    return null;
  } else if (isFetching) {
    return <Ellipsis />;
  } else {
    return decodedValue.length > MAX_VALUE_LENGTH
      ? decodedValue.substring(0, MAX_VALUE_LENGTH)
      : decodedValue;
  }
}
