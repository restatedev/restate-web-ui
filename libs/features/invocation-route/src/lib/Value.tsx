import { useRef } from 'react';
import type { editor } from 'monaco-editor';
import { Editor } from '@restate/ui/editor';
import { Ellipsis, Spinner } from '@restate/ui/loading';
import { useDecode } from '@restate/data-access/admin-api-hooks';

export function Value({
  value,
  className,
  isBase64,
}: {
  value?: string;
  className?: string;
  isBase64?: boolean;
}) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { data: decodedValue, isFetching } = useDecode(value, isBase64);

  if (typeof decodedValue === 'undefined') {
    return null;
  }

  return (
    <div className="flex items-center">
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
          className={className}
        />
      )}
    </div>
  );
}

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
    return decodedValue;
  }
}
