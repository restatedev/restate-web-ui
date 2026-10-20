import { RefObject, useCallback, useEffect } from 'react';
import { useFocusShortcut } from '@restate/ui-keyboard';
import { tv } from '@restate/util-styles';
import * as monaco from '@restate/ui-editor/monaco';
import {
  AGG_APPROXIMATE_FUNCTIONS,
  AGG_GENERAL_FUNCTIONS,
  AGG_STATISTICAL_FUNCTIONS,
  ARRAY_FUNCTIONS,
  BINARY_STRING_FUNCTIONS,
  CONDITIONAL_FUNCTIONS,
  EXPANSION_FUNCTIONS,
  HASHING_FUNCTIONS,
  KEYWORDS,
  MAP_FUNCTIONS,
  MATH_FUNCTIONS,
  OTHER_FUNCTIONS,
  REG_EXPRESSION_FUNCTIONS,
  STRING_FUNCTIONS,
  STRUCT_FUNCTIONS,
  TABLES,
  TIME_FUNCTIONS,
  UNION_FUNCTIONS,
  WINDOWS_ANALYTICAL_FUNCTIONS,
  WINDOWS_RANKING_FUNCTIONS,
} from './constants';
import { getQueryHistory } from '../queryHistory';
import { getSqlCompletionContext } from '../sqlCompletionContext';

const SQL_LANGUAGE_ID = 'sql';

const styles = tv({
  base: '[&_.monaco-editor]:[--vscode-editor-background:transparent]! [&_.monaco-editor]:[--vscode-editor-foreground:var(--text-color-inverse)]! [&_.monaco-editor]:[--vscode-focusBorder:transparent]! [&_.monaco-editor_.bracket-highlighting-0]:text-accent-subtle! [&_.monaco-editor_.bracket-highlighting-1]:text-accent-subtle! [&_.monaco-editor_.bracket-highlighting-2]:text-accent-subtle! [&_.monaco-editor_.bracket-highlighting-3]:text-accent-subtle! [&_.monaco-editor_.bracket-highlighting-4]:text-accent-subtle! [&_.monaco-editor_.bracket-highlighting-5]:text-accent-subtle! [&_.monaco-editor_.native-edit-context]:caret-transparent! [&_.monaco-editor_.sql-comment]:text-inverse-muted! [&_.monaco-editor_.sql-keyword]:text-accent-subtle! [&_.monaco-editor_.sql-literal]:text-inverse-secondary! [&_.monaco-editor_.sql-text]:text-inverse!',
});

const SQL_TOKEN_CLASSES = [
  ['delimiter.parenthesis', 'sql-keyword'],
  ['keyword', 'sql-keyword'],
  ['string', 'sql-literal'],
  ['number', 'sql-literal'],
  ['comment', 'sql-comment'],
] as const;

function getSqlDecorations(
  model: monaco.editor.ITextModel,
): monaco.editor.IModelDeltaDecoration[] {
  return monaco.editor
    .tokenize(model.getValue(), SQL_LANGUAGE_ID)
    .flatMap((tokens, line) =>
      tokens.map((token, index) => ({
        range: new monaco.Range(
          line + 1,
          token.offset + 1,
          line + 1,
          (tokens[index + 1]?.offset ?? model.getLineLength(line + 1)) + 1,
        ),
        options: {
          inlineClassName:
            SQL_TOKEN_CLASSES.find(([type]) =>
              token.type.startsWith(type),
            )?.[1] ?? 'sql-text',
        },
      })),
    );
}

type CompletionItem = Omit<monaco.languages.CompletionItem, 'range'>;

const COLUMNS: CompletionItem[] = [
  ...Array.from(
    new Set(TABLES.map((table) => table.columns.map((col) => col.name)).flat()),
  ).map((col) => ({
    kind: monaco.languages.CompletionItemKind.Variable,
    label: `${col}`,
    insertText: `${col}`,
    sortText: `1$${col}`,
    detail: 'Column',
  })),
  ...TABLES.map((table) => ({
    kind: monaco.languages.CompletionItemKind.Struct,
    label: `${table.name}`,
    insertText: `${table.name}`,
    sortText: `2${table.name}`,
    detail: table.description,
  })),
];

function getColumns(table?: string): CompletionItem[] {
  if (!table) {
    return COLUMNS;
  }
  return (
    TABLES.find(({ name }) => name === table)?.columns.map((col) => ({
      kind: monaco.languages.CompletionItemKind.Variable,
      label: `${col.name}`,
      insertText: `${col.name}`,
      sortText: `1$${col.name}`,
      detail: col.description,
    })) ?? COLUMNS
  );
}

const TABLE_ITEMS: CompletionItem[] = TABLES.map((table) => ({
  kind: monaco.languages.CompletionItemKind.Struct,
  label: table.name,
  insertText: table.name,
  sortText: `2${table.name}`,
  detail: table.description,
}));

const KEYWORD_ITEMS: CompletionItem[] = [...KEYWORDS].map((kw) => ({
  label: kw,
  insertText: kw,
  kind: monaco.languages.CompletionItemKind.Keyword,
  detail: 'keyword',
  sortText: '3' + kw,
}));

const FUNCTION_ITEMS: CompletionItem[] = [
  ...AGG_GENERAL_FUNCTIONS,
  ...AGG_STATISTICAL_FUNCTIONS,
  ...AGG_APPROXIMATE_FUNCTIONS,
  ...WINDOWS_RANKING_FUNCTIONS,
  ...WINDOWS_ANALYTICAL_FUNCTIONS,
  ...STRING_FUNCTIONS,
  ...BINARY_STRING_FUNCTIONS,
  ...REG_EXPRESSION_FUNCTIONS,
  ...MATH_FUNCTIONS,
  ...TIME_FUNCTIONS,
  ...CONDITIONAL_FUNCTIONS,
  ...ARRAY_FUNCTIONS,
  ...STRUCT_FUNCTIONS,
  ...MAP_FUNCTIONS,
  ...HASHING_FUNCTIONS,
  ...UNION_FUNCTIONS,
  ...OTHER_FUNCTIONS,
  ...EXPANSION_FUNCTIONS,
].map((kw) => ({
  label: kw + '()',
  insertText: kw,
  kind: monaco.languages.CompletionItemKind.Function,
  detail: 'Function',
  sortText: '3' + kw,
}));

function getContextCompletions(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
): CompletionItem[] {
  const textBeforeCursor = model.getValueInRange({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });
  const context = getSqlCompletionContext(textBeforeCursor, model.getValue());

  switch (context.type) {
    case 'none':
      return [];
    case 'keyword':
      return KEYWORD_ITEMS;
    case 'table':
      return [...TABLE_ITEMS, ...KEYWORD_ITEMS];
    case 'column':
      return context.isQualified
        ? getColumns(context.table)
        : [...getColumns(), ...FUNCTION_ITEMS, ...KEYWORD_ITEMS];
  }
}

function provideCompletionItems(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
): monaco.languages.CompletionList {
  const word = model.getWordUntilPosition(position);
  const range: monaco.IRange = {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  };

  return {
    suggestions: [
      ...buildHistoryCompletions(model, position),
      ...getContextCompletions(model, position).map((item) => ({
        ...item,
        range,
      })),
    ],
    incomplete: true,
  };
}

function toSingleLine(query: string) {
  return query.replace(/\s+/g, ' ').trim();
}

function buildHistoryCompletions(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
): monaco.languages.CompletionItem[] {
  const history = getQueryHistory();
  if (history.length === 0 || position.lineNumber > 1) {
    return [];
  }

  const textUntilPosition = model.getValueInRange({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });
  const prefix = textUntilPosition.replace(/^\s+/, '');
  const lowerPrefix = prefix.toLowerCase();
  const lastLine = model.getLineCount();
  const range: monaco.IRange = {
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: lastLine,
    endColumn: model.getLineMaxColumn(lastLine),
  };

  return history
    .filter(
      (query) =>
        query.toLowerCase().startsWith(lowerPrefix) &&
        toSingleLine(query) !== toSingleLine(prefix),
    )
    .map((query, index) => ({
      label: { label: toSingleLine(query), description: 'History' },
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: query,
      filterText: query,
      sortText: '0' + String(index).padStart(4, '0'),
      range,
      detail: 'Query history',
      documentation: { value: '```sql\n' + query + '\n```' },
    }));
}

export function SQLEditor({
  setQuery,
  isPending,
  initialQuery,
  containerRef,
  placeholderRef,
  className,
  ref: hostRef,
  editorRef,
}: {
  isPending: boolean;
  setQuery: (value: string) => void;
  initialQuery?: string;
  containerRef: RefObject<HTMLDivElement | null>;
  placeholderRef: RefObject<HTMLDivElement | null>;
  editorRef: RefObject<monaco.editor.IStandaloneCodeEditor | null>;
  ref?: RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  useEffect(() => {
    const placeholderEl = placeholderRef.current;
    if (hostRef?.current && !editorRef.current) {
      const completionProvider =
        monaco.languages.registerCompletionItemProvider(SQL_LANGUAGE_ID, {
          triggerCharacters: [' ', '.'],
          provideCompletionItems,
        });
      editorRef.current = monaco.editor.create(hostRef.current, {
        value: initialQuery,
        language: SQL_LANGUAGE_ID,
        lineNumbers: 'off',
        lineDecorationsWidth: 0,
        folding: false,
        theme: 'vs-dark',
        renderLineHighlight: 'none',
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: 'mono',
        suggest: {
          showInlineDetails: true,
          snippetsPreventQuickSuggestions: false,
        },
        quickSuggestions: { other: true, comments: false, strings: false },
        stickyScroll: {
          enabled: false,
        },
        lineHeight: 28,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        scrollbar: {
          useShadows: false,
          vertical: 'auto',
          horizontal: 'hidden',
        },
        overviewRulerLanes: 0,
        cursorStyle: 'line',
        bracketPairColorization: {
          independentColorPoolPerBracketType: true,
          enabled: true,
        },
        contextmenu: false,
        hover: {
          enabled: 'off',
        },
        wordWrap: 'on',
        scrollBeyondLastColumn: 0,
      });

      function updateStyles() {
        if (placeholderEl) {
          if (editorRef.current?.getValue().length === 0) {
            placeholderEl.style.display = 'flex';
          } else {
            placeholderEl.style.display = 'none';
          }
        }

        if (containerRef.current) {
          const padding = 2;

          containerRef.current.style.height = `${
            Math.min(Number(editorRef.current?.getContentHeight()), 112) +
            padding
          }px`;
          editorRef.current?.layout();
        }
      }

      updateStyles();

      const decorations = editorRef.current.createDecorationsCollection();
      const highlight = () => {
        const model = editorRef.current?.getModel();
        if (model) {
          decorations.set(getSqlDecorations(model));
        }
      };
      highlight();

      editorRef.current.onDidDispose(() => {
        completionProvider.dispose();
      });

      editorRef.current.onDidChangeModelContent(() => {
        updateStyles();
        highlight();
      });

      editorRef.current.addCommand(
        monaco.KeyCode.Enter | monaco.KeyMod.WinCtrl,
        function () {
          setQuery(editorRef.current?.getValue() ?? '');
        },
      );
      editorRef.current.addCommand(
        monaco.KeyCode.Enter | monaco.KeyMod.CtrlCmd,
        function () {
          setQuery(editorRef.current?.getValue() ?? '');
        },
      );

      editorRef.current.onDidFocusEditorText(() => {
        const value = editorRef.current?.getValue() ?? '';
        if (value.trim() === '' && getQueryHistory().length > 0) {
          editorRef.current?.trigger(
            'history',
            'editor.action.triggerSuggest',
            {},
          );
        }
      });

      window.addEventListener('resize', updateStyles);

      return () => {
        window.removeEventListener('resize', updateStyles);
      };
    }
  }, [
    containerRef,
    editorRef,
    hostRef,
    initialQuery,
    placeholderRef,
    setQuery,
  ]);

  useEffect(() => {
    return () => {
      editorRef.current?.dispose();
      editorRef.current = null;
    };
  }, [editorRef]);

  const focusEditor = useCallback(() => {
    editorRef.current?.focus();
    const model = editorRef.current?.getModel();
    const lineCount = model?.getLineCount() ?? 0;
    const lastLineLength = model?.getLineContent(lineCount).length ?? 0;

    editorRef.current?.setPosition({
      lineNumber: lineCount,
      column: lastLineLength + 1,
    });
  }, [editorRef]);

  useFocusShortcut({ onFocus: focusEditor });

  return <div ref={hostRef} className={styles({ className })} />;
}
