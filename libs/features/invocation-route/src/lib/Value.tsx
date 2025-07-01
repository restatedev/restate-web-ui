import { useRef } from 'react';
import type { editor } from 'monaco-editor';
import { Editor } from '@restate/ui/editor';

export function Value({
  value,
  className,
}: {
  value?: string;
  className?: string;
}) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  if (typeof value === 'undefined') {
    return null;
  }

  return (
    <Editor
      value={value}
      editorRef={editorRef}
      readonly
      className={className}
    />
  );
}
