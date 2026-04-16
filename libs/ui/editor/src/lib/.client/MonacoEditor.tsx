import { RefObject, useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';
import './languageSetup';

export function MonacoEditor({
  value,
  editorRef,
  readonly,
  language = 'json',
  options,
  fitContentHeight,
  fitContentWidth,
  formatOnMount = true,
  onInput,
}: {
  value?: string;
  editorRef: RefObject<monaco.editor.IStandaloneCodeEditor | null>;
  readonly?: boolean;
  language?: string;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  fitContentHeight?: boolean;
  fitContentWidth?: boolean;
  formatOnMount?: boolean;
  onInput?: (value: string) => void;
}) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!el || editorRef.current) {
      return;
    }

    monaco.editor.defineTheme('restate', {
      base: 'vs',
      colors: {
        'editor.background': '#00000000',
        'editorGutter.background': '#00000000',
        'editorLineNumber.foreground': '#00000080',
        'editorLineNumber.activeForeground': '#00000080',
      },
      rules: [],
      inherit: true,
    });
    const editor = monaco.editor.create(el, {
      value,
      language,
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
      ...options,
      ...(readonly && {
        readOnly: true,
        domReadOnly: true,
      }),
    });
    editorRef.current = editor;

    const updateStyles = () => {
      const contentWidth = editor.getContentWidth();
      const contentHeight = editor.getContentHeight();

      if (fitContentWidth) {
        const parentWidth = el.parentElement?.clientWidth ?? 0;
        el.style.width = `${Math.max(contentWidth, parentWidth, 96)}px`;
      } else {
        el.style.width = '';
      }

      if (fitContentHeight) {
        el.style.height = `${Math.max(contentHeight, 42)}px`;
      } else {
        el.style.height = `clamp(2.625rem, ${contentHeight}px, 45vh)`;
      }

      editor.layout();
    };

    const formatEditor = async () => {
      if (!formatOnMount) {
        updateStyles();
        return;
      }

      editor.updateOptions({
        readOnly: false,
        domReadOnly: false,
      });

      await Promise.resolve(
        editor.getAction('editor.action.formatDocument')?.run(),
      ).catch(() => undefined);

      editor.updateOptions({
        ...options,
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
    ];

    void formatEditor();

    return () => {
      disposables.forEach((d) => d.dispose());
      editor.dispose();
      editorRef.current = null;
    };
  }, [
    value,
    el,
    editorRef,
    readonly,
    language,
    options,
    fitContentHeight,
    fitContentWidth,
    formatOnMount,
    onInput,
  ]);

  useEffect(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();

    if (!editor || !model) {
      return;
    }

    editor.updateOptions({
      ...options,
      ...(readonly && {
        readOnly: true,
        domReadOnly: true,
      }),
    });
    monaco.editor.setModelLanguage(model, language);

    if (typeof value !== 'undefined' && editor.getValue() !== value) {
      editor.setValue(value);
    }
  }, [editorRef, readonly, language, options, value]);

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
