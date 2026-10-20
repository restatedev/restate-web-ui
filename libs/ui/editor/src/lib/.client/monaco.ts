import './languageSetup';
import 'monaco-editor/features/register.all';
import 'monaco-editor/languages/definitions/sql/register';
import 'monaco-editor/languages/features/json/register';

import { editor } from 'monaco-editor/editor';
import { MONACO_THEME, MONACO_THEME_DATA } from '../monacoTheme';

editor.defineTheme(MONACO_THEME, MONACO_THEME_DATA);

export * from 'monaco-editor/editor';
export { MONACO_THEME };
