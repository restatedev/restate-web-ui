import { Code, Snippet } from '@restate/ui/code';
import { Icon, IconName } from '@restate/ui/icons';
import { InlineTooltip } from '@restate/ui/tooltip';
import { ERROR_CODES, RestateError } from '@restate/util/errors';
import { PropsWithChildren } from 'react';
import Markdown from 'react-markdown';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'rounded-xl bg-red-100 p-3 gap-2 flex flex-col',
});

const DEFAULT_ERROR: { summary: string; help?: string } = {
  summary:
    'An error has occurred! Check the details below for more information:',
  help: undefined,
};
export function RestateServerError({
  error,
  children,
  className,
}: PropsWithChildren<{
  error: RestateError;
  className?: string;
}>) {
  const { restate_code: code, message } = error;
  const { summary, help } = code
    ? ERROR_CODES[code] ?? DEFAULT_ERROR
    : DEFAULT_ERROR;

  return (
    <div className={styles({ className })}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0">
          <Icon
            className="h-5 w-5 fill-red-500 text-red-500"
            name={IconName.CircleX}
          />
        </div>
        <output className="text-sm flex-auto text-red-700 [word-break:break-word] max-h-28 overflow-auto">
          {help ? (
            <InlineTooltip
              variant="indicator-button"
              className="[&_button]:self-start [&_button]:mt-1 [&_button]:mr-1"
              title={code}
              {...(code && {
                learnMoreHref: `https://docs.restate.dev/references/errors/#${code}`,
              })}
              description={
                <Markdown className="[&_li]:list-disc [&_li]:list-inside [&_ul]:mt-2">
                  {help}
                </Markdown>
              }
            >
              <Markdown>{summary}</Markdown>
            </InlineTooltip>
          ) : (
            summary
          )}
        </output>
      </div>
      <div className="flex flex-col gap-2 w-full">
        <Code className="shadow-[inset_0_0.5px_0.5px_0px_rgba(0,0,0,0.08)] border bg-red-200 py-4 text-code flex-auto text-red-700">
          <Snippet language="bash" className="px-0">
            <details className="group text-xs overflow-auto max-h-28 w-full">
              <summary className="group-open:h-4">
                <span className="group-open:invisible group-open:[font-size:0px] truncate w-[calc(100%-5ch)] inline-block align-middle">
                  {message}
                </span>
                <br className="group-open:hidden" />
              </summary>
              <span className="ml-4 inline-block">{message}</span>
            </details>
          </Snippet>
        </Code>
        {children && <div className="flex-shrink-0">{children}</div>}
      </div>
    </div>
  );
}
