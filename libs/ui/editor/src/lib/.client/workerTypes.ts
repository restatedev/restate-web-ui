declare module 'monaco-editor/esm/vs/editor/editor.worker?worker' {
  const EditorWorkerFactory: {
    new (): Worker;
  };

  export default EditorWorkerFactory;
}

declare module 'monaco-editor/esm/vs/language/json/json.worker?worker' {
  const JsonWorkerFactory: {
    new (): Worker;
  };

  export default JsonWorkerFactory;
}
