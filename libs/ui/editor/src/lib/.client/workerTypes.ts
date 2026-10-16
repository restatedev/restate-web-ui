declare module 'monaco-editor/editor/editor.worker?worker' {
  const EditorWorkerFactory: {
    new (): Worker;
  };

  export default EditorWorkerFactory;
}

declare module 'monaco-editor/language/json/json.worker?worker' {
  const JsonWorkerFactory: {
    new (): Worker;
  };

  export default JsonWorkerFactory;
}
