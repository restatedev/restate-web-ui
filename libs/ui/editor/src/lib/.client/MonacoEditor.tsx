import { RefObject, useEffect, useState } from 'react';
import { tv } from '@restate/util-styles';
import * as monaco from './monaco';
import { showFoldedArrayLengths } from './foldedArrayLengths';

const MAX_EDITOR_FORMAT_LENGTH = 10_000_000;

function isFormattableJson(value?: string) {
  try {
    JSON.parse(value ?? '');
    return true;
  } catch {
    return false;
  }
}

const styles = tv({
  base: 'h-full min-h-4 w-full max-w-full min-w-24 transform transition-all [&_.monaco-editor]:outline-hidden!',
  variants: {
    applyTheme: {
      true: '[&_.monaco-editor]:[--vscode-editor-background:transparent]! [&_.monaco-editor]:[--vscode-editorGutter-background:transparent]! [&_.monaco-editor]:[--vscode-editorLineNumber-activeForeground:var(--text-color-muted)]! [&_.monaco-editor]:[--vscode-editorLineNumber-foreground:var(--text-color-muted)]! [&_.monaco-editor]:[--vscode-focusBorder:transparent]!',
      false: '',
    },
  },
});

export function MonacoEditor({
  value,
  editorRef,
  readonly,
  onInput,
  applyTheme = true,
}: {
  value?: string;
  editorRef: RefObject<monaco.editor.IStandaloneCodeEditor | null>;
  readonly?: boolean;
  onInput?: (value: string) => void;
  applyTheme?: boolean;
}) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!el || editorRef.current) {
      return;
    }

    const isLargeValue = (value?.length ?? 0) > MAX_EDITOR_FORMAT_LENGTH;
    const shouldFormat = !isLargeValue && isFormattableJson(value);

    const editor = monaco.editor.create(el, {
      value,
      language: 'json',
      folding: true,
      ...(applyTheme && { theme: 'vs' }),
      formatOnPaste: shouldFormat,
      formatOnType: shouldFormat,
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
        alwaysConsumeMouseWheel: false,
      },
      overviewRulerBorder: false,
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      contextmenu: false,
      hover: {
        enabled: 'off',
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
      renderValidationDecorations: 'off',
      ...(readonly && {
        readOnly: true,
        domReadOnly: true,
      }),
    });
    editorRef.current = editor;

    const updateStyles = () => {
      const contentWidth = editor.getContentWidth();
      const contentHeight = editor.getContentHeight();

      if (contentWidth && !isLargeValue) {
        el.style.width = `${Math.max(contentWidth, 300)}ch`;
      }

      if (contentHeight) {
        el.style.height = `clamp(2.625rem, ${contentHeight}px, 45vh)`;
      }

      editor.layout();
    };

    const formatEditor = async () => {
      editor.updateOptions({
        readOnly: false,
        domReadOnly: false,
      });

      await Promise.resolve(
        editor.getAction('editor.action.formatDocument')?.run(),
      ).catch(() => undefined);

      editor.updateOptions({
        ...(readonly && {
          readOnly: true,
          domReadOnly: true,
        }),
      });

      updateStyles();
    };

    const disposables = [
      editor.onDidChangeModelLanguageConfiguration(updateStyles),
      editor.onDidChangeModelContent(() => {
        onInput?.(editor.getValue());
      }),
      editor.onDidContentSizeChange(updateStyles),
      showFoldedArrayLengths(editor),
    ];

    if (shouldFormat) {
      void formatEditor();
    } else {
      updateStyles();
    }

    return () => {
      disposables.forEach((d) => d.dispose());
      editor.dispose();
      editorRef.current = null;
    };
  }, [value, el, editorRef, readonly, onInput, applyTheme]);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    editor.updateOptions({
      ...(readonly && {
        readOnly: true,
        domReadOnly: true,
      }),
    });

    if (typeof value !== 'undefined' && editor.getValue() !== value) {
      editor.setValue(value);
    }
  }, [editorRef, readonly, value]);

  if (typeof value === 'undefined') {
    return null;
  }
  return (
    <div
      ref={setEl}
      style={{ height: `clamp(2.625rem, ${value.length / 100}px, 45vh)` }}
      className={styles({ applyTheme })}
    />
  );
}
