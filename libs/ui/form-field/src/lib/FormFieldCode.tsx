import { focusRing } from '@restate/ui/focus';
import { useCallback, useRef, useState } from 'react';
import { tv } from 'tailwind-variants';
import type { editor } from 'monaco-editor';
import { Editor } from '@restate/ui/editor';

const inputStyles = tv({
  extend: focusRing,
  base: 'flex-1 block invalid:border-red-600 invalid:bg-red-100/70 focus:outline focus:border-gray-200 disabled:text-gray-500/80 disabled:placeholder:text-gray-300 disabled:bg-gray-100 disabled:border-gray-100 disabled:shadow-none focus:shadow-none focus:outline-blue-600 focus:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] mt-0 bg-gray-100 rounded-lg border border-gray-200 py-1.5 placeholder:text-gray-500/70 px-2 w-full min-w-0 text-sm text-gray-900',
});

export function FormFieldCode({
  name,
  value,
  autoFocus,
  className,
  onInput,
}: {
  name: string;
  value?: string;
  autoFocus?: boolean;
  className?: string;
  onInput?: (value: string) => void;
}) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const [content] = useState(() => value);
  const textareaRef = useRef<HTMLInputElement | null>(null);

  const onContentChange = useCallback(
    (value: string) => {
      onInput?.(value ?? '');
      if (textareaRef.current) {
        textareaRef.current.value = value ?? '';
      }
    },
    [onInput],
  );

  return (
    <>
      <Editor
        value={content}
        className={inputStyles({ className })}
        editorRef={editorRef}
        onInput={onContentChange}
      />
      <input
        type="hidden"
        className="hidden"
        name={name}
        ref={textareaRef}
        aria-label="hidden"
      />
    </>
  );
}
