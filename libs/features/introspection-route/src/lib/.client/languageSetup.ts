// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { LanguageIdEnum } from 'monaco-sql-languages';
/** import contribution file */
import 'monaco-sql-languages/esm/languages/pgsql/pgsql.contribution';

/** import worker files */
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import PGSQLWorker from 'monaco-sql-languages/esm/languages/pgsql/pgsql.worker?worker';

/** define MonacoEnvironment.getWorker  */
const monacoEnvironment = globalThis as any;
const getWorker = monacoEnvironment.MonacoEnvironment?.getWorker;

monacoEnvironment.MonacoEnvironment = {
  getWorker(moduleId: any, label: string) {
    if (label === LanguageIdEnum.PG) {
      return new PGSQLWorker();
    }

    if (getWorker) {
      return getWorker(moduleId, label);
    }

    return new EditorWorker();
  },
};
