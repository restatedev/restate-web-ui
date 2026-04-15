import './workerTypes';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import 'monaco-editor/esm/vs/basic-languages/protobuf/protobuf.contribution';

const monacoEnvironment = globalThis as typeof globalThis & {
  MonacoEnvironment?: {
    getWorker(_: unknown, label: string): Worker;
  };
};

monacoEnvironment.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'json') {
      return new jsonWorker();
    }
    return new EditorWorker();
  },
};
