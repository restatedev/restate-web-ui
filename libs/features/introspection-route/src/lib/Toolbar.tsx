import { SubmitButton } from '@restate/ui/button';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { Form } from 'react-router';
import { lazy, Suspense, useRef } from 'react';
import type { editor } from 'monaco-editor';

const SQLEditor = lazy(() =>
  import('./.client/SQLEditor').then((m) => ({ default: m.SQLEditor })),
);

export function Toolbar({
  setQuery,
  isPending,
  initialQuery,
}: {
  isPending: boolean;
  setQuery: (value: string) => void;
  initialQuery?: string;
}) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  return (
    <LayoutOutlet zone={LayoutZone.Toolbar}>
      <Form
        onSubmit={async (event) => {
          event.preventDefault();
          setQuery(editorRef.current?.getValue() ?? '');
        }}
        className="w-screen"
        ref={formRef}
      >
        <div className="flex items-center rounded-xl border border-transparent p-0.5 ring-1 ring-transparent has-focus:border-blue-500 has-focus:ring-blue-500">
          <div
            className="relative flex min-h-[30px] w-full items-center gap-2 p-px pl-2"
            ref={containerRef}
          >
            <div
              className="absolute top-0 bottom-0 left-2 flex items-center gap-2"
              ref={placeholderRef}
            >
              <kbd className="rounded-sm bg-zinc-600 px-1.5 text-sm text-zinc-400">
                /
              </kbd>

              <div className="inline-block text-sm text-zinc-400">
                Type your query here…
              </div>
            </div>

            <div className="relative h-full min-w-0 flex-auto pr-22">
              <Suspense fallback={<div />}>
                <SQLEditor
                  className="[&&&_.suggest-widget_.monaco-list_.monaco-list-row>.contents>.main>.right]:mr2-[28px] [&&&_.suggest-widget_.monaco-list_.monaco-list-row>.contents>.main>.right]:max-width2-full h-full [&_.codicon-symbol-function:before]:content-['\ec24']! [&_.codicon-symbol-struct:before]:content-['\ebb7']! [&_.monaco-editor]:outline-hidden [&_.monaco-list-row.monaco-list-row.monaco-list-row]:rounded-lg [&_.monaco-list-row.monaco-list-row.monaco-list-row]:pl-1.5 [&_.monaco-list-row.monaco-list-row.monaco-list-row.focused]:bg-blue-600 [&_.monaco-list-row.monaco-list-row.monaco-list-row.focused]:text-white [&_.monaco-list-row.monaco-list-row.monaco-list-row:hover]:bg-blue-600! [&_.monaco-list-row.monaco-list-row.monaco-list-row:hover]:text-white [&_.readMore:before]:[line-height:28px] [&_.suggest-details.suggest-details.suggest-details]:rounded-xl [&_.suggest-details.suggest-details.suggest-details]:border [&_.suggest-details.suggest-details.suggest-details]:border-black/10 [&_.suggest-details.suggest-details.suggest-details]:bg-gray-100 [&_.suggest-details.suggest-details.suggest-details]:bg-clip-padding [&_.suggest-details.suggest-details.suggest-details]:text-slate-700 [&_.suggest-details.suggest-details.suggest-details]:shadow-lg [&_.suggest-widget_.monaco-list]:rounded-xl [&_.suggest-widget_.monaco-list_.monaco-list-row.focused_.codicon]:text-white! [&_.suggest-widget_.monaco-list_.monaco-list-row.focused>.contents>.main_.monaco-highlighted-label_.highlight]:text-blue-200! [&_.suggest-widget_.monaco-list_.monaco-list-row:hover_.codicon]:text-white! [&_.suggest-widget_.monaco-list_.monaco-list-row:hover>.contents>.main_.monaco-highlighted-label_.highlight]:text-blue-200! [&_.suggest-widget_.monaco-list_.monaco-list-row:not(.focused):not(:hover)>.contents>.main_.monaco-highlighted-label_.highlight]:text-blue-500! [&_.suggest-widget_.monaco-list_.monaco-list-row:not(.focused):not(:hover)>.contents>.main_.monaco-icon-label.monaco-icon-label.monaco-icon-label]:text-gray-700 [&_.suggest-widget_.monaco-list_.monaco-list-row:not(:hover):not(.focused)_.codicon]:text-blue-500! [&_.suggest-widget.suggest-widget.suggest-widget]:rounded-xl [&_.suggest-widget.suggest-widget.suggest-widget]:border [&_.suggest-widget.suggest-widget.suggest-widget]:border-black/10 [&_.suggest-widget.suggest-widget.suggest-widget]:bg-gray-100 [&_.suggest-widget.suggest-widget.suggest-widget]:bg-clip-padding [&_.suggest-widget.suggest-widget.suggest-widget]:text-slate-700 [&_.suggest-widget.suggest-widget.suggest-widget]:shadow-lg [&_textarea]:border-none [&_textarea]:[box-shadow:none] [&_textarea]:outline-hidden [&&&_.suggest-widget_.monaco-list_.monaco-list-row:hover.string-label>.contents>.main>.right>.readMore]:visible [&&&_.suggest-widget_.monaco-list_.monaco-list-row:hover.string-label>.contents>.main>.right>.readMore]:block [&&&_.suggest-widget_.monaco-list_.monaco-list-row:hover>.contents>.main>.right>.details-label]:block [&&&_.suggest-widget_.monaco-list_.monaco-list-row:hover>.contents>.main>.right>.details-label]:text-white"
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
        <SubmitButton
          isPending={isPending}
          className="absolute top-1 right-1 bottom-1 flex items-center gap-2 rounded-lg py-0 pr-1 pl-4 disabled:bg-gray-400 disabled:text-gray-200"
        >
          Query
          <div className="mt-0.5 flex items-center gap-0.5 text-2xs">
            <kbd className="rounded-sm bg-black/20 px-1 font-mono text-[80%] font-medium text-white/90">
              {getMetaKeySymbol()}
            </kbd>
            <div className="flex aspect-square h-5 items-center justify-center rounded-sm bg-black/20 px-1 font-mono text-[120%] font-medium text-white/90">
              ⏎
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
