import { SubmitButton } from '@restate/ui/button';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { Form } from 'react-router';
import { useEffect, useRef } from 'react';
import { languages } from 'monaco-editor/esm/vs/editor/editor.api';
import * as monaco from 'monaco-editor';
import {
  setupLanguageFeatures,
  LanguageIdEnum,
  CompletionService,
  ICompletionItem,
  EntityContextType,
  SyntaxSuggestion,
  WordRange,
} from 'monaco-sql-languages';
import './languageSetup';
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
import { TokenClassConsts, postfixTokenClass } from 'monaco-sql-languages';
import { Icon, IconName } from '@restate/ui/icons';

const COLUMNS: ICompletionItem[] = [
  ...Array.from(
    new Set(TABLES.map((table) => table.columns.map((col) => col.name)).flat())
  ).map((col) => ({
    kind: languages.CompletionItemKind.Variable,
    label: `${col}`,
    sortText: `1$${col}`,
    detail: 'Column',
  })),
  ...TABLES.map((table) => ({
    kind: languages.CompletionItemKind.Struct,
    label: `${table.name}`,
    sortText: `2${table.name}`,
    detail: table.description,
  })),
];

function getColumns(item: SyntaxSuggestion<WordRange>) {
  if (item.wordRanges.length === 2) {
    return (
      TABLES.find(
        (table) => table.name === item.wordRanges?.[0]?.text
      )?.columns.map((col) => ({
        kind: languages.CompletionItemKind.Variable,
        label: `${col.name}`,
        sortText: `1$${col.name}`,
        detail: col.description,
      })) ?? COLUMNS
    );
  } else {
    return COLUMNS;
  }
}

const completionService: CompletionService = function (
  model,
  position,
  completionContext,
  suggestions, // syntax context info at caretPosition
  entities // tables, columns in the syntax context of the editor text
) {
  return new Promise((resolve, reject) => {
    if (!suggestions) {
      return Promise.resolve([]);
    }
    const keywordsCompletionItems: ICompletionItem[] = [...KEYWORDS].map(
      (kw) => ({
        label: kw,
        kind: languages.CompletionItemKind.Keyword,
        detail: 'keyword',
        sortText: '3' + kw,
      })
    );
    const { syntax } = suggestions;

    let syntaxCompletionItems: ICompletionItem[] = [];
    const isOnlyFunction =
      syntax.length === 1 &&
      syntax[0]?.syntaxContextType !== EntityContextType.COLUMN;

    syntax.forEach((item) => {
      if (item.syntaxContextType === EntityContextType.COLUMN) {
        syntaxCompletionItems = [...syntaxCompletionItems, ...getColumns(item)];
      }
      if (item.syntaxContextType === EntityContextType.FUNCTION) {
        syntaxCompletionItems = [
          ...syntaxCompletionItems,
          ...(isOnlyFunction ? getColumns(item) : []),
          ...[
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
            kind: languages.CompletionItemKind.Function,
            detail: 'Function',
            sortText: '3' + kw,
          })),
        ];
      }

      if (item.syntaxContextType === EntityContextType.TABLE) {
        const tableCompletions: ICompletionItem[] = TABLES.map((table) => ({
          kind: languages.CompletionItemKind.Struct,
          label: table.name,
          sortText: `2${table.name}`,
          detail: table.description,
        }));
        syntaxCompletionItems = [...syntaxCompletionItems, ...tableCompletions];
      }
    });

    resolve([...syntaxCompletionItems, ...keywordsCompletionItems]);
  });
};

export function SQLEditor({
  setQuery,
  isPending,
  initialQuery,
}: {
  isPending: boolean;
  setQuery: (value: string) => void;
  initialQuery?: string;
}) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const placeholderEl = placeholderRef.current;
    if (hostRef.current && !editorRef.current) {
      setupLanguageFeatures(LanguageIdEnum.PG, {
        completionItems: {
          enable: true,
          completionService,
          triggerCharacters: [' ', '.'],
        },
      });
      monaco.editor.defineTheme('restate', {
        base: 'vs-dark',
        colors: {
          'editor.background': '#00000000',
          'editor.foreground': '#ffffff',
          'editor.lineHighlightBorder': '#00000000',
          'editorBracketHighlight.foreground1': '#60a5fa',
        },
        rules: [
          {
            token: postfixTokenClass(TokenClassConsts.KEYWORD),
            foreground: '60a5fa',
          },
          {
            token: postfixTokenClass(TokenClassConsts.DELIMITER_PAREN),
            foreground: '60a5fa',
          },
          {
            token: postfixTokenClass(TokenClassConsts.IDENTIFIER),
            foreground: 'ffffff',
          },
          {
            token: TokenClassConsts.STRING,
            foreground: 'cbd5e1',
          },
          {
            token: postfixTokenClass(TokenClassConsts.STRING),
            foreground: 'cbd5e1',
          },
          {
            token: postfixTokenClass(TokenClassConsts.TYPE),
            foreground: 'cbd5e1',
          },
          {
            token: postfixTokenClass(TokenClassConsts.NUMBER),
            foreground: 'cbd5e1',
          },
          // AND
          {
            token: postfixTokenClass(TokenClassConsts.OPERATOR),
            foreground: 'ffffff',
          },
          {
            token: postfixTokenClass(TokenClassConsts.OPERATOR_KEYWORD),
            foreground: 'ffffff',
          },
          //MAX
          {
            token: postfixTokenClass(TokenClassConsts.PREDEFINED),
            foreground: 'ffffff',
          },
        ],
        inherit: true,
      });
      editorRef.current = monaco.editor.create(hostRef.current, {
        value: initialQuery,
        language: LanguageIdEnum.PG,
        lineNumbers: 'off',
        lineDecorationsWidth: 0,
        folding: false,
        theme: 'restate',
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: 'mono',
        suggest: {
          showInlineDetails: true,
          snippetsPreventQuickSuggestions: false,
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
          enabled: false,
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

      editorRef.current.onDidChangeModelContent((e) => {
        updateStyles();
      });

      editorRef.current.addCommand(
        monaco.KeyCode.Enter | monaco.KeyMod.WinCtrl,
        function () {
          setQuery(editorRef.current?.getValue() ?? '');
        }
      );
      editorRef.current.addCommand(
        monaco.KeyCode.Enter | monaco.KeyMod.CtrlCmd,
        function () {
          setQuery(editorRef.current?.getValue() ?? '');
        }
      );

      window.addEventListener('resize', updateStyles);

      return () => {
        window.removeEventListener('resize', updateStyles);
      };
    }
  }, [initialQuery, setQuery]);

  useEffect(() => {
    const keyHandler = (event: KeyboardEvent) => {
      if (
        !(event.key === 'Enter' && event.metaKey) &&
        !(
          event.key === '/' &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          !event.repeat
        )
      ) {
        return;
      }
      if (
        event.target instanceof HTMLElement &&
        (/^(?:input|textarea|select|button)$/i.test(event.target?.tagName) ||
          event.target.closest('[role=listbox]') ||
          event.target.closest('[role=dialog]') ||
          event.target.closest('[class~="monaco-editor"]'))
      ) {
        return;
      }

      event.preventDefault();
      if (event.key === 'Enter' && event.metaKey) {
        setQuery(editorRef.current?.getValue() ?? '');
      } else {
        editorRef.current?.focus();
        const model = editorRef.current?.getModel();
        const lineCount = model?.getLineCount() ?? 0;
        const lastLineLength = model?.getLineContent(lineCount).length ?? 0;

        // Set the position to the end of the last line
        editorRef.current?.setPosition({
          lineNumber: lineCount,
          column: lastLineLength + 1,
        });
      }
    };
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('keydown', keyHandler);
    };
  }, []);

  return (
    <LayoutOutlet zone={LayoutZone.Toolbar}>
      <Form
        onSubmit={async (event) => {
          event.preventDefault();
          setQuery(editorRef.current?.getValue() ?? '');
        }}
        className="w-[100vw]"
        ref={formRef}
      >
        <div className="p-0.5 flex items-center rounded-xl border-transparent ring-1 ring-transparent border has-[*:focus]:border-blue-500 has-[*:focus]:ring-blue-500">
          <div
            className="items-center flex gap-2 p-px w-full min-h-[30px] relative pl-2"
            ref={containerRef}
          >
            <div
              className="absolute left-2 top-0 bottom-0 flex items-center gap-2"
              ref={placeholderRef}
            >
              <kbd className="bg-zinc-600 px-1.5 text-zinc-400 rounded text-sm ">
                /
              </kbd>

              <div className=" text-zinc-400 text-sm inline-block">
                Type your query here…
              </div>
            </div>

            <div className="relative min-w-0 flex-auto pr-[5.5rem] h-full">
              <div
                className="[&&&_.suggest-widget_.monaco-list_.monaco-list-row:hover.string-label>.contents>.main>.right>.readMore]:visible [&&&_.suggest-widget_.monaco-list_.monaco-list-row:hover.string-label>.contents>.main>.right>.readMore]:block [&&&_.suggest-widget_.monaco-list_.monaco-list-row>.contents>.main>.right]:mr2-[28px] [&&&_.suggest-widget_.monaco-list_.monaco-list-row>.contents>.main>.right]:max-width2-full [&&&_.suggest-widget_.monaco-list_.monaco-list-row:hover>.contents>.main>.right>.details-label]:text-white [&&&_.suggest-widget_.monaco-list_.monaco-list-row:hover>.contents>.main>.right>.details-label]:block [&_.readMore:before]:[line-height:28px] [&_.codicon-symbol-struct:before]:!content-['\ebb7'] [&_.codicon-symbol-function:before]:!content-['\ec24'] [&_.suggest-widget_.monaco-list]:rounded-xl [&_.suggest-widget_.monaco-list_.monaco-list-row:hover>.contents>.main_.monaco-highlighted-label_.highlight]:!text-blue-200 [&_.suggest-widget_.monaco-list_.monaco-list-row.focused>.contents>.main_.monaco-highlighted-label_.highlight]:!text-blue-200 [&_.suggest-widget_.monaco-list_.monaco-list-row:not(.focused):not(:hover)>.contents>.main_.monaco-highlighted-label_.highlight]:!text-blue-500 [&_.suggest-widget_.monaco-list_.monaco-list-row:not(:hover):not(.focused)_.codicon]:!text-blue-500 [&_.suggest-widget_.monaco-list_.monaco-list-row:hover_.codicon]:!text-white [&_.suggest-widget_.monaco-list_.monaco-list-row.focused_.codicon]:!text-white [&_.monaco-list-row.monaco-list-row.monaco-list-row]:pl-1.5 [&_.monaco-list-row.monaco-list-row.monaco-list-row]:rounded-lg [&_.suggest-widget_.monaco-list_.monaco-list-row:not(.focused):not(:hover)>.contents>.main_.monaco-icon-label.monaco-icon-label.monaco-icon-label]:text-gray-700 [&_.monaco-list-row.monaco-list-row.monaco-list-row.focused]:bg-blue-600 [&_.monaco-list-row.monaco-list-row.monaco-list-row:hover]:!bg-blue-600  [&_.monaco-list-row.monaco-list-row.monaco-list-row.focused]:text-white [&_.monaco-list-row.monaco-list-row.monaco-list-row:hover]:text-white [&_.suggest-details.suggest-details.suggest-details]:bg-gray-100 [&_.suggest-details.suggest-details.suggest-details]:shadow-lg [&_.suggest-details.suggest-details.suggest-details]:rounded-xl [&_.suggest-details.suggest-details.suggest-details]:bg-clip-padding [&_.suggest-details.suggest-details.suggest-details]:border [&_.suggest-details.suggest-details.suggest-details]:border-black/10 [&_.suggest-details.suggest-details.suggest-details]:text-slate-700 [&_.suggest-widget.suggest-widget.suggest-widget]:bg-gray-100 [&_.suggest-widget.suggest-widget.suggest-widget]:shadow-lg [&_.suggest-widget.suggest-widget.suggest-widget]:rounded-xl [&_.suggest-widget.suggest-widget.suggest-widget]:bg-clip-padding [&_.suggest-widget.suggest-widget.suggest-widget]:border [&_.suggest-widget.suggest-widget.suggest-widget]:border-black/10 [&_.suggest-widget.suggest-widget.suggest-widget]:text-slate-700 [&_.monaco-editor]:outline-none h-full [&_textarea]:[box-shadow:none] [&_textarea]:border-none [&_textarea]:outline-none"
                ref={hostRef}
              />
            </div>
          </div>
        </div>
        <SubmitButton
          isPending={isPending}
          className="absolute pl-4 pr-1 gap-2 right-1 top-1 bottom-1 rounded-lg py-0 disabled:bg-gray-400  disabled:text-gray-200 flex items-center"
        >
          Query
          <div className="text-2xs flex items-center gap-0.5  mt-0.5">
            <kbd className="[font-size:80%] font-mono font-medium rounded bg-black/20  text-white/90 px-1">
              {getMetaKeySymbol()}
            </kbd>
            <div className="rounded bg-black/20 px-1 h-5 flex items-center text-white/90 aspect-square">
              <Icon name={IconName.Return} className="w-3 h-3 " />
            </div>
          </div>
        </SubmitButton>
      </Form>
    </LayoutOutlet>
  );
}

function getMetaKeySymbol() {
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  return isMac ? 'Cmd' : 'Ctrl';
}
