import { SubmitButton } from '@restate/ui-button';
import { LayoutOutlet, LayoutZone } from '@restate/ui-layout';
import { Form } from 'react-router';
import {
  lazy,
  RefObject,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  useSubmitShortcut,
  SubmitShortcutKey,
  FocusShortcutKey,
} from '@restate/ui-keyboard';
import type { editor } from 'monaco-editor';
import { QueryHistoryDropdown } from './QueryHistoryDropdown';
import { PredefinedQueriesDropdown } from './PredefinedQueriesDropdown';

const SQLEditor = lazy(() =>
  import('./.client/SQLEditor').then((m) => ({ default: m.SQLEditor })),
);

export function Toolbar({
  setQuery: _setQuery,
  isPending,
  initialQuery,
  selectQueryRef,
}: {
  isPending: boolean;
  setQuery: (value: string) => void;
  initialQuery?: string;
  selectQueryRef?: RefObject<((query: string) => void) | null>;
}) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const submitRef = useSubmitShortcut();

  const lastSubmittedQuery = useRef(initialQuery);
  const setQuery = useCallback(
    (value: string) => {
      lastSubmittedQuery.current = value;
      _setQuery(value);
    },
    [_setQuery],
  );

  useEffect(() => {
    if (initialQuery !== lastSubmittedQuery.current) {
      editorRef.current?.setValue(initialQuery ?? '');
      lastSubmittedQuery.current = initialQuery ?? '';
    }
  }, [initialQuery]);

  const selectQuery = useCallback((query: string) => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    editor.setValue(query);
    setTimeout(() => {
      editor.focus();
      const model = editor.getModel();
      const lineCount = model?.getLineCount() ?? 1;
      const column = model?.getLineMaxColumn(lineCount) ?? 1;
      editor.setPosition({ lineNumber: lineCount, column });
    }, 0);
  }, []);

  useImperativeHandle(selectQueryRef, () => selectQuery, [selectQuery]);

  return (
    <LayoutOutlet zone={LayoutZone.Toolbar}>
      <Form
        onSubmit={async (event) => {
          event.preventDefault();
          setQuery(editorRef.current?.getValue() ?? '');
        }}
        className="w-7xl max-w-full"
        ref={formRef}
      >
        <div className="flex items-center rounded-xl border border-transparent p-0.5 ring-1 ring-transparent has-focus:border-accent-strong has-focus:ring-focus">
          <div
            className="relative flex min-h-[30px] w-full items-center gap-2 p-px pl-2"
            ref={containerRef}
          >
            <div
              className="absolute top-0 bottom-0 left-2 flex items-center gap-2"
              ref={placeholderRef}
            >
              <FocusShortcutKey />

              <div className="inline-block text-sm text-subtle">
                Type your query here…
              </div>
            </div>

            <div className="relative h-full min-w-0 flex-auto pr-44">
              <Suspense fallback={<div />}>
                <SQLEditor
                  className="h-full [&_.codicon-symbol-function:before]:content-['\ec24']! [&_.codicon-symbol-struct:before]:content-['\ebb7']! [&_.monaco-editor]:outline-hidden! [&_.monaco-list-row.monaco-list-row.monaco-list-row]:rounded-lg [&_.monaco-list-row.monaco-list-row.monaco-list-row]:pl-1.5 [&_.monaco-list-row.monaco-list-row.monaco-list-row.focused]:bg-accent [&_.monaco-list-row.monaco-list-row.monaco-list-row.focused]:text-inverse [&_.monaco-list-row.monaco-list-row.monaco-list-row:hover]:bg-accent! [&_.monaco-list-row.monaco-list-row.monaco-list-row:hover]:text-inverse [&_.readMore:before]:[line-height:28px] [&_.suggest-details.suggest-details.suggest-details]:rounded-xl [&_.suggest-details.suggest-details.suggest-details]:border [&_.suggest-details.suggest-details.suggest-details]:border-tint [&_.suggest-details.suggest-details.suggest-details]:bg-muted [&_.suggest-details.suggest-details.suggest-details]:bg-clip-padding [&_.suggest-details.suggest-details.suggest-details]:text-secondary [&_.suggest-details.suggest-details.suggest-details]:shadow-lg [&_.suggest-widget_.monaco-list]:rounded-xl [&_.suggest-widget_.monaco-list_.monaco-list-row.focused_.codicon]:text-inverse! [&_.suggest-widget_.monaco-list_.monaco-list-row.focused>.contents>.main_.monaco-highlighted-label_.highlight]:text-inverse! [&_.suggest-widget_.monaco-list_.monaco-list-row:hover_.codicon]:text-inverse! [&_.suggest-widget_.monaco-list_.monaco-list-row:hover>.contents>.main_.monaco-highlighted-label_.highlight]:text-inverse! [&_.suggest-widget_.monaco-list_.monaco-list-row:not(.focused):not(:hover)>.contents>.main_.monaco-highlighted-label_.highlight]:text-accent! [&_.suggest-widget_.monaco-list_.monaco-list-row:not(.focused):not(:hover)>.contents>.main_.monaco-icon-label.monaco-icon-label.monaco-icon-label]:text-secondary [&_.suggest-widget_.monaco-list_.monaco-list-row:not(:hover):not(.focused)_.codicon]:text-accent! [&_.suggest-widget.suggest-widget.suggest-widget]:rounded-xl [&_.suggest-widget.suggest-widget.suggest-widget]:border [&_.suggest-widget.suggest-widget.suggest-widget]:border-tint [&_.suggest-widget.suggest-widget.suggest-widget]:bg-muted [&_.suggest-widget.suggest-widget.suggest-widget]:bg-clip-padding [&_.suggest-widget.suggest-widget.suggest-widget]:text-secondary [&_.suggest-widget.suggest-widget.suggest-widget]:shadow-lg [&_textarea]:border-none [&_textarea]:[box-shadow:none] [&_textarea]:outline-hidden [&&&_.suggest-widget_.monaco-list_.monaco-list-row:hover.string-label>.contents>.main>.right>.readMore]:visible [&&&_.suggest-widget_.monaco-list_.monaco-list-row:hover.string-label>.contents>.main>.right>.readMore]:block [&&&_.suggest-widget_.monaco-list_.monaco-list-row:hover>.contents>.main>.right>.details-label]:block [&&&_.suggest-widget_.monaco-list_.monaco-list-row:hover>.contents>.main>.right>.details-label]:text-inverse"
                  ref={hostRef}
                  placeholderRef={placeholderRef}
                  containerRef={containerRef}
                  isPending={isPending}
                  setQuery={setQuery}
                  initialQuery={initialQuery}
                  editorRef={editorRef}
                />
              </Suspense>
            </div>
          </div>
        </div>
        <div className="absolute top-1 right-1 bottom-1 flex items-stretch gap-1">
          <PredefinedQueriesDropdown onSelect={selectQuery} />
          <QueryHistoryDropdown onSelect={selectQuery} />
          <SubmitButton
            ref={submitRef}
            isPending={isPending}
            className="flex items-center gap-2 rounded-lg py-0 pr-0.5 pl-4 disabled:bg-neutral disabled:text-inverse-secondary"
          >
            Query
            <SubmitShortcutKey />
          </SubmitButton>
        </div>
      </Form>
    </LayoutOutlet>
  );
}
