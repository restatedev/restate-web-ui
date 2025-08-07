import { RefObject, useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';
import './languageSetup';

export function ValueMonaco({
  value,
  editorRef,
}: {
  value?: string;
  editorRef: RefObject<monaco.editor.IStandaloneCodeEditor | null>;
}) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (el && !editorRef.current) {
      monaco.editor.defineTheme('restate', {
        base: 'vs',
        colors: {},
        rules: [],
        inherit: true,
      });
      editorRef.current = monaco.editor.create(el, {
        value: formatValue(value),
        language: 'json',
        folding: false,
        theme: 'restate',
        readOnly: true,
        formatOnPaste: true,
        formatOnType: true,
        minimap: { enabled: false },
        fontSize: 12,
        fontFamily: 'JetBrainsMonoVariable, mono',
        suggest: {
          showInlineDetails: false,
          snippetsPreventQuickSuggestions: false,
        },
        lineNumbersMinChars: 0,
        automaticLayout: true,
        scrollbar: {
          useShadows: false,
        },
        contextmenu: false,
        hover: {
          enabled: false,
        },
        wordWrap: 'off',
        scrollBeyondLastLine: false,
        renderLineHighlight: 'none',
        domReadOnly: true,
      });
      const updateStyles = () => {
        const contentWidth = editorRef.current?.getContentWidth();
        const contentHeight = editorRef.current?.getContentHeight();
        if (contentWidth) {
          const width = `${Math.max(contentWidth, 300)}ch`;
          el.style.width = width;
        }
        if (contentHeight) {
          el.style.height = `${Math.min(contentHeight, 400)}px`;
        }
        if (contentWidth || contentHeight) {
          editorRef.current?.layout();
        }
      };
      editorRef.current?.onDidChangeModelLanguageConfiguration(updateStyles);
      editorRef.current?.onDidLayoutChange(updateStyles);
      editorRef.current?.onDidContentSizeChange(updateStyles);
      editorRef.current.onDidChangeModelContent(updateStyles);
      updateStyles();
    }
  }, [value, el, editorRef]);

  if (typeof value === 'undefined') {
    return null;
  }
  return <div ref={setEl} className="h-full min-h-4 max-w-full min-w-24" />;
}

function formatValue(value?: string) {
  if (!value) {
    return value;
  }
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
    // eslint-disable-next-line no-empty
  } catch (_) {}
  return value;
}
