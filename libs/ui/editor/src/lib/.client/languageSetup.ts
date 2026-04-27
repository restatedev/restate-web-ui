import './workerTypes';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

const monacoEnvironment = globalThis as typeof globalThis & {
  MonacoEnvironment?: {
    getWorker(_: unknown, label: string): Worker;
  };
};
const getWorker = monacoEnvironment.MonacoEnvironment?.getWorker;

monacoEnvironment.MonacoEnvironment = {
  getWorker(moduleId: unknown, label: string) {
    if (label === 'json') {
      return new jsonWorker();
    }

    if (getWorker) {
      return getWorker(moduleId, label);
    }

    return new EditorWorker();
  },
};
