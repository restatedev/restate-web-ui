import { useRef } from 'react';
import type { editor } from 'monaco-editor';
import { Editor } from './Editor';

export function MonacoWarmup() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 -left-[9999px] h-px w-px overflow-hidden opacity-0"
    >
      <Editor value="{}" editorRef={editorRef} readonly applyTheme={false} />
    </div>
  );
}
