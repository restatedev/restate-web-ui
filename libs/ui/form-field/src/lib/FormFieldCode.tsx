import { focusRing } from '@restate/ui/focus';
import { useCallback, useRef, useState } from 'react';
import { tv } from '@restate/util/styles';
import type { editor } from 'monaco-editor';
import { Editor } from '@restate/ui/editor';

const inputStyles = tv({
  extend: focusRing,
  base: 'mt-0 block w-full min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm text-gray-900 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] placeholder:text-gray-500/70 invalid:border-red-600 invalid:bg-red-100/70 focus:border-gray-200 focus:shadow-none focus:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] focus:outline focus:outline-blue-600 disabled:border-gray-100 disabled:bg-gray-100 disabled:text-gray-500/80 disabled:shadow-none disabled:placeholder:text-gray-300',
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
