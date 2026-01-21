import { RefObject, useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';
import './languageSetup';

export function MonacoEditor({
  value,
  editorRef,
  readonly,
  onInput,
}: {
  value?: string;
  editorRef: RefObject<monaco.editor.IStandaloneCodeEditor | null>;
  readonly?: boolean;
  onInput?: (value: string) => void;
}) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (el && !editorRef.current) {
      monaco.editor.defineTheme('restate', {
        base: 'vs',
        colors: {
          'editor.background': '#00000000',
          'editorLineNumber.foreground': '#00000080',
          'editorLineNumber.activeForeground': '#00000080',
        },
        rules: [],
        inherit: true,
      });
      editorRef.current = monaco.editor.create(el, {
        value,
        language: 'json',
        folding: true,
        theme: 'restate',
        formatOnPaste: true,
        formatOnType: true,
        minimap: { enabled: false },
        fontSize: 12,
        fontFamily: 'JetBrainsMonoVariable, mono',
        suggest: {
          showInlineDetails: false,
          snippetsPreventQuickSuggestions: false,
        },
        padding: {
          top: 12,
          bottom: 12,
        },
        lineNumbersMinChars: 0,
        automaticLayout: true,
        scrollbar: {
          useShadows: false,
        },
        overviewRulerBorder: false,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        contextmenu: false,
        hover: {
          enabled: false,
        },
        unicodeHighlight: {
          ambiguousCharacters: false,
          invisibleCharacters: false,
          nonBasicASCII: false,
        },
        wordWrap: 'on',
        stickyScroll: { enabled: false },
        scrollBeyondLastLine: false,
        scrollBeyondLastColumn: 0,
        tabSize: 2,
        renderLineHighlight: 'none',
        ...(readonly && {
          readOnly: true,
          domReadOnly: true,
        }),
      });
      const updateStyles = () => {
        // Temporarily make it writable
        editorRef.current?.updateOptions({
          readOnly: false,
          domReadOnly: false,
        });

        Promise.resolve(
          editorRef.current?.getAction('editor.action.formatDocument')?.run(),
        ).then(() => {
          const contentWidth = editorRef.current?.getContentWidth();
          const contentHeight = editorRef.current?.getContentHeight();
          if (contentWidth) {
            const width = `${Math.max(contentWidth, 300)}ch`;
            el.style.width = width;
          }
          if (contentHeight) {
            el.style.height = `clamp(2.625rem, ${contentHeight}px, 45vh)`;
          }
          if (contentWidth || contentHeight) {
            editorRef.current?.layout();
          }
          editorRef.current?.updateOptions({
            readOnly: readonly,
            domReadOnly: readonly,
          });
        });
      };
      const disposables = [
        editorRef.current.onDidChangeModelLanguageConfiguration(updateStyles),
        editorRef.current.onDidLayoutChange(updateStyles),
        editorRef.current.onDidChangeModelContent(() => {
          const value = editorRef.current?.getValue();
          onInput?.(value ?? '');
        }),
      ];

      updateStyles();

      return () => {
        disposables.forEach((d) => d.dispose());
        editorRef.current?.dispose();
        editorRef.current = null;
      };
    }
  }, [value, el, editorRef, readonly, onInput]);

  if (typeof value === 'undefined') {
    return null;
  }
  return (
    <div
      ref={setEl}
      style={{ height: `clamp(2.625rem, ${value.length / 100}px, 45vh)` }}
      className="h-full min-h-4 w-full max-w-full min-w-24 transform transition-all [&_.monaco-editor]:outline-hidden!"
    />
  );
}
