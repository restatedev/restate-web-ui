import { Code, Snippet } from '@restate/ui/code';
import { Icon, IconName } from '@restate/ui/icons';
import { InlineTooltip } from '@restate/ui/tooltip';
import { ERROR_CODES, RestateError } from '@restate/util/errors';
import { PropsWithChildren } from 'react';
import Markdown from 'react-markdown';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'flex min-h-0 flex-col gap-2 rounded-xl bg-red-100 p-3 text-sm',
});
const codeStyles = tv({
  base: 'h-full flex-auto border bg-red-200 py-4 text-code text-red-700 shadow-[inset_0_0.5px_0.5px_0px_rgba(0,0,0,0.08)]',
  variants: {
    wrap: { true: 'whitespace-pre', false: '' },
  },
  defaultVariants: {
    wrap: false,
  },
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
  wrap,
  open = true,
}: PropsWithChildren<{
  error: RestateError;
  className?: string;
  wrap?: boolean;
  open?: boolean;
}>) {
  const { restate_code: code, message } = error;
  const { summary, help } = code
    ? (ERROR_CODES[code] ?? DEFAULT_ERROR)
    : DEFAULT_ERROR;

  return (
    <div className={styles({ className })}>
      <div className="flex items-start gap-2">
        <div className="shrink-0">
          <Icon
            className="h-5 w-5 fill-red-500 text-red-500"
            name={IconName.CircleX}
          />
        </div>
        <output className="max-h-28 flex-auto overflow-auto [word-break:break-word] text-red-700">
          {help ? (
            <InlineTooltip
              variant="indicator-button"
              className="[&_button]:mt-1 [&_button]:mr-1 [&_button]:self-start"
              title={code}
              {...(code && {
                learnMoreHref: `https://docs.restate.dev/references/errors/#${code}`,
              })}
              description={
                <div className="[&_li]:list-inside [&_li]:list-disc [&_ul]:mt-2">
                  <Markdown>{help}</Markdown>
                </div>
              }
            >
              <Markdown>{summary}</Markdown>
            </InlineTooltip>
          ) : (
            summary
          )}
        </output>
      </div>
      <div className="flex min-h-0 w-full flex-auto flex-col gap-2">
        <Code className={codeStyles({ wrap })}>
          <Snippet language="bash" className="h-full px-0">
            <details
              className="group h-full max-h-28 w-full overflow-auto text-[90%]"
              open={open}
            >
              <summary className="group-open:h-4">
                <span className="inline-block w-[calc(100%-5ch)] truncate align-middle group-open:invisible group-open:text-[0px]">
                  {message}
                </span>
                <br className="group-open:hidden" />
              </summary>
              <span className="ml-4 inline-block">{message}</span>
            </details>
          </Snippet>
        </Code>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </div>
  );
}
