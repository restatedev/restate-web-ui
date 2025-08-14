import { useRef } from 'react';
import type { editor } from 'monaco-editor';
import { Editor } from '@restate/ui/editor';
import { useQuery } from '@tanstack/react-query';
import { useRestateContext } from '@restate/features/restate-context';
import { Spinner } from '@restate/ui/loading';

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
  const { decoder } = useRestateContext();

  const { data: decodedValue, isFetching } = useQuery({
    queryKey: [value, 'decrypt'],
    queryFn: ({ queryKey }) => {
      const [value] = queryKey;
      return decoder(value);
    },
    staleTime: Infinity,
    refetchOnMount: false,
    placeholderData: value,
  });

  if (typeof decodedValue === 'undefined') {
    return null;
  }

  return (
    <div className="flex min-h-12 items-center">
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
