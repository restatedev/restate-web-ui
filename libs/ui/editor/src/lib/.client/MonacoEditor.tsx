import { RefObject, useEffect, useState } from 'react';
import { tv } from '@restate/util-styles';
import { editorColors } from '../editorColors';
import * as monaco from './monaco';
import { showFoldedArrayLengths } from './foldedArrayLengths';

const MAX_EDITOR_FORMAT_LENGTH = 10_000_000;
const LINE_HEIGHT_PX = 18;
const VERTICAL_PADDING_PX = 24;
const MAX_COUNTED_LINES = 200;

function getInitialHeight(value: string) {
  let lines = 1;
  let index = value.indexOf('\n');
  while (index !== -1 && lines < MAX_COUNTED_LINES) {
    lines += 1;
    index = value.indexOf('\n', index + 1);
  }
  return Math.max(
    value.length / 100,
    lines > 1 ? lines * LINE_HEIGHT_PX + VERTICAL_PADDING_PX : 0,
  );
}

function isFormattableJson(value?: string) {
  try {
    JSON.parse(value ?? '');
    return true;
  } catch {
    return false;
  }
}

const styles = tv({
  base: 'h-full min-h-4 w-full max-w-full min-w-24 transform transition-all [&_.monaco-editor]:outline-hidden! [&_.monaco-editor_.native-edit-context]:caret-transparent!',
});

export function MonacoEditor({
  value,
  editorRef,
  readonly,
  onInput,
  applyTheme = true,
  autoFocus,
}: {
  value?: string;
  editorRef: RefObject<monaco.editor.IStandaloneCodeEditor | null>;
  readonly?: boolean;
  onInput?: (value: string) => void;
  applyTheme?: boolean;
  autoFocus?: boolean;
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
      ...(applyTheme && { theme: monaco.MONACO_THEME }),
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
      tabFocusMode: true,
      renderLineHighlight: 'none',
      renderValidationDecorations: 'off',
      ...(readonly && {
        readOnly: true,
        domReadOnly: true,
      }),
    });
    editorRef.current = editor;
    if (autoFocus) {
      editor.focus();
    }

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

    updateStyles();
    if (shouldFormat) {
      void formatEditor();
    }

    return () => {
      disposables.forEach((d) => d.dispose());
      editor.dispose();
      editorRef.current = null;
    };
  }, [value, el, editorRef, readonly, onInput, applyTheme, autoFocus]);

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
      style={{ height: `clamp(2.625rem, ${getInitialHeight(value)}px, 45vh)` }}
      className={styles({
        className: applyTheme ? editorColors() : undefined,
      })}
    />
  );
}
