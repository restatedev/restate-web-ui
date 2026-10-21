import { useCallback, useEffect, useRef } from 'react';
import { tv } from '@restate/util-styles';
import type { editor } from 'monaco-editor';
import { Editor } from '@restate/ui-editor';

const inputStyles = tv({
  base: 'mt-0 block w-full min-w-0 flex-1 rounded-lg border border-default bg-muted py-0 pl-2 text-sm text-primary shadow-[inset_0_1px_0px_0px_--theme(--box-shadow-color-default/3%)] placeholder:text-subtle invalid:border-danger-strong invalid:bg-danger-muted/70 focus-within:border-default focus-within:shadow-none focus-within:[box-shadow:inset_0_1px_0px_0px_--theme(--box-shadow-color-default/3%)] focus-within:outline-2 focus-within:outline-focus disabled:border-muted disabled:bg-muted disabled:text-subtle disabled:shadow-none disabled:placeholder:text-faint',
});

export function FormFieldCode({
  name,
  value,
  autoFocus,
  className,
  onInput,
  readonly,
  mountEditor = true,
}: {
  name: string;
  value?: string;
  autoFocus?: boolean;
  readonly?: boolean;
  className?: string;
  onInput?: (value: string) => void;
  mountEditor?: boolean;
}) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = value ?? '';
    }
  }, [value]);

  return (
    <>
      {mountEditor && (
        <Editor
          value={value}
          className={inputStyles({ className })}
          editorRef={editorRef}
          onInput={onContentChange}
          readonly={readonly}
          autoFocus={autoFocus}
        />
      )}
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
