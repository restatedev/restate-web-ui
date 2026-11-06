import { useEffect, useRef } from 'react';
import * as monaco from '@restate/ui-editor/monaco';
import { jsonDefaults } from 'monaco-editor/languages/features/json/register';

const schemasByModel = new Map<string, unknown>();
let appliedSchemas: string | undefined;

function applySchemas() {
  const schemas = Array.from(schemasByModel.entries()).map(([uri, schema]) => ({
    uri: `${uri}#schema`,
    fileMatch: [uri],
    schema,
  }));
  const serialized = JSON.stringify(schemas);
  if (serialized === appliedSchemas) {
    return;
  }
  appliedSchemas = serialized;
  jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: false,
    enableSchemaRequest: false,
    schemaValidation: 'warning',
    schemas,
  });
}

export function MonacoBodyEditor({
  modelUri,
  value,
  language,
  schemas,
  onChange,
  ariaLabel,
}: {
  modelUri: string;
  value: string;
  language: 'json' | 'plaintext';
  schemas?: { uri: string; schema: unknown }[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    const initialValue = valueRef.current;
    const uri = monaco.Uri.parse(modelUri);
    const model =
      monaco.editor.getModel(uri) ??
      monaco.editor.createModel(initialValue, language, uri);
    if (model.getValue() !== initialValue) {
      model.setValue(initialValue);
    }
    monaco.editor.setModelLanguage(model, language);

    const editor = monaco.editor.create(element, {
      model,
      theme: monaco.MONACO_THEME,
      ariaLabel,
      minimap: { enabled: false },
      fontSize: 12,
      fontFamily: 'JetBrainsMonoVariable, mono',
      lineNumbers: 'off',
      lineDecorationsWidth: 8,
      folding: false,
      glyphMargin: false,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: 2,
      contextmenu: false,
      renderLineHighlight: 'none',
      overviewRulerLanes: 0,
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      stickyScroll: { enabled: false },
      padding: { top: 8, bottom: 8 },
      scrollbar: { useShadows: false, alwaysConsumeMouseWheel: false },
      fixedOverflowWidgets: true,
      quickSuggestions: { strings: true, other: true, comments: false },
    });
    editorRef.current = editor;

    const resize = () => {
      const height = `${Math.min(Math.max(editor.getContentHeight(), 96), 420)}px`;
      if (element.style.height !== height) {
        element.style.height = height;
      }
    };
    resize();
    const contentListener = editor.onDidContentSizeChange(resize);
    const changeListener = model.onDidChangeContent(() => {
      onChangeRef.current(model.getValue());
    });

    return () => {
      contentListener.dispose();
      changeListener.dispose();
      editor.dispose();
      editorRef.current = null;
    };
  }, [modelUri, language, ariaLabel]);

  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (model && model.getValue() !== value) {
      model.setValue(value);
    }
  }, [value]);

  useEffect(() => {
    for (const { uri, schema } of schemas ?? []) {
      schemasByModel.set(uri, schema);
    }
    applySchemas();
  }, [schemas]);

  return <div ref={containerRef} className="min-h-24 w-full" />;
}
