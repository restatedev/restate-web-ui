import { useRef, useState } from 'react';
import type { editor } from 'monaco-editor';
import { Editor } from '@restate/ui/editor';
import { base64ToUtf8 } from '@restate/features/service-protocol';

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
  const [decodedValue] = useState(() => {
    console.log(value, typeof value);
    if (isBase64) {
      try {
        return base64ToUtf8(value || '');
      } catch (error) {
        return value;
      }
    } else {
      return value;
    }
  });

  if (typeof decodedValue === 'undefined') {
    return null;
  }

  return (
    <Editor
      value={decodedValue}
      editorRef={editorRef}
      readonly
      className={className}
    />
  );
}
