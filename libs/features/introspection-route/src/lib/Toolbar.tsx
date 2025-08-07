import { SubmitButton } from '@restate/ui/button';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { Form } from 'react-router';
import { lazy, Suspense, useRef } from 'react';
import type { editor } from 'monaco-editor';

const SQLEditor = lazy(() =>
  import('./.client/SQLEditor').then((m) => ({ default: m.SQLEditor }))
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
        <div className="p-0.5 flex items-center rounded-xl border-transparent ring-1 ring-transparent border has-focus:border-blue-500 has-focus:ring-blue-500">
          <div
            className="items-center flex gap-2 p-px w-full min-h-[30px] relative pl-2"
            ref={containerRef}
          >
            <div
              className="absolute left-2 top-0 bottom-0 flex items-center gap-2"
              ref={placeholderRef}
            >
              <kbd className="bg-zinc-600 px-1.5 text-zinc-400 rounded-sm text-sm ">
                /
              </kbd>

              <div className=" text-zinc-400 text-sm inline-block">
                Type your query here…
              </div>
            </div>

            <div className="relative min-w-0 flex-auto pr-22 h-full">
              <Suspense fallback={<div />}>
                <SQLEditor
                  className="[&&&_.suggest-widget_.monaco-list_.monaco-list-row:hover.string-label>.contents>.main>.right>.readMore]:visible [&&&_.suggest-widget_.monaco-list_.monaco-list-row:hover.string-label>.contents>.main>.right>.readMore]:block [&&&_.suggest-widget_.monaco-list_.monaco-list-row>.contents>.main>.right]:mr2-[28px] [&&&_.suggest-widget_.monaco-list_.monaco-list-row>.contents>.main>.right]:max-width2-full [&&&_.suggest-widget_.monaco-list_.monaco-list-row:hover>.contents>.main>.right>.details-label]:text-white [&&&_.suggest-widget_.monaco-list_.monaco-list-row:hover>.contents>.main>.right>.details-label]:block [&_.readMore:before]:[line-height:28px] [&_.codicon-symbol-struct:before]:content-['\ebb7']! [&_.codicon-symbol-function:before]:content-['\ec24']! [&_.suggest-widget_.monaco-list]:rounded-xl [&_.suggest-widget_.monaco-list_.monaco-list-row:hover>.contents>.main_.monaco-highlighted-label_.highlight]:text-blue-200! [&_.suggest-widget_.monaco-list_.monaco-list-row.focused>.contents>.main_.monaco-highlighted-label_.highlight]:text-blue-200! [&_.suggest-widget_.monaco-list_.monaco-list-row:not(.focused):not(:hover)>.contents>.main_.monaco-highlighted-label_.highlight]:text-blue-500! [&_.suggest-widget_.monaco-list_.monaco-list-row:not(:hover):not(.focused)_.codicon]:text-blue-500! [&_.suggest-widget_.monaco-list_.monaco-list-row:hover_.codicon]:text-white! [&_.suggest-widget_.monaco-list_.monaco-list-row.focused_.codicon]:text-white! [&_.monaco-list-row.monaco-list-row.monaco-list-row]:pl-1.5 [&_.monaco-list-row.monaco-list-row.monaco-list-row]:rounded-lg [&_.suggest-widget_.monaco-list_.monaco-list-row:not(.focused):not(:hover)>.contents>.main_.monaco-icon-label.monaco-icon-label.monaco-icon-label]:text-gray-700 [&_.monaco-list-row.monaco-list-row.monaco-list-row.focused]:bg-blue-600 [&_.monaco-list-row.monaco-list-row.monaco-list-row:hover]:bg-blue-600!  [&_.monaco-list-row.monaco-list-row.monaco-list-row.focused]:text-white [&_.monaco-list-row.monaco-list-row.monaco-list-row:hover]:text-white [&_.suggest-details.suggest-details.suggest-details]:bg-gray-100 [&_.suggest-details.suggest-details.suggest-details]:shadow-lg [&_.suggest-details.suggest-details.suggest-details]:rounded-xl [&_.suggest-details.suggest-details.suggest-details]:bg-clip-padding [&_.suggest-details.suggest-details.suggest-details]:border [&_.suggest-details.suggest-details.suggest-details]:border-black/10 [&_.suggest-details.suggest-details.suggest-details]:text-slate-700 [&_.suggest-widget.suggest-widget.suggest-widget]:bg-gray-100 [&_.suggest-widget.suggest-widget.suggest-widget]:shadow-lg [&_.suggest-widget.suggest-widget.suggest-widget]:rounded-xl [&_.suggest-widget.suggest-widget.suggest-widget]:bg-clip-padding [&_.suggest-widget.suggest-widget.suggest-widget]:border [&_.suggest-widget.suggest-widget.suggest-widget]:border-black/10 [&_.suggest-widget.suggest-widget.suggest-widget]:text-slate-700 [&_.monaco-editor]:outline-hidden h-full [&_textarea]:[box-shadow:none] [&_textarea]:border-none [&_textarea]:outline-hidden"
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
          className="absolute pl-4 pr-1 gap-2 right-1 top-1 bottom-1 rounded-lg py-0 disabled:bg-gray-400  disabled:text-gray-200 flex items-center"
        >
          Query
          <div className="text-2xs flex items-center gap-0.5  mt-0.5">
            <kbd className="text-[80%] font-mono font-medium rounded-sm bg-black/20  text-white/90 px-1">
              {getMetaKeySymbol()}
            </kbd>
            <div className="text-[120%] font-mono font-medium rounded-sm bg-black/20 px-1 h-5 flex items-center justify-center text-white/90 aspect-square">
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
