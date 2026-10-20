import type { editor } from 'monaco-editor/editor';

const SYNTAX_ROLES = [
  'text',
  'background',
  'key',
  'string',
  'number',
  'keyword',
  'punctuation',
  'comment',
] as const;

const color = (role: (typeof SYNTAX_ROLES)[number]) =>
  (SYNTAX_ROLES.indexOf(role) + 1).toString(16).padStart(6, '0');

export const MONACO_THEME = 'restate';

export const MONACO_THEME_DATA: editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: false,
  encodedTokensColors: SYNTAX_ROLES.map((role) => `#${color(role)}`),
  colors: {},
  rules: [
    { token: '', foreground: color('text'), background: color('background') },
    { token: 'string', foreground: color('string') },
    { token: 'string.key', foreground: color('key') },
    { token: 'number', foreground: color('number') },
    { token: 'keyword', foreground: color('keyword') },
    { token: 'delimiter', foreground: color('punctuation') },
    { token: 'delimiter.parenthesis', foreground: color('keyword') },
    { token: 'comment', foreground: color('comment') },
  ],
};
