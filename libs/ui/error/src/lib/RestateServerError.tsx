import { Code, Snippet, SnippetCopy } from '@restate/ui/code';
import { Icon, IconName } from '@restate/ui/icons';
import { InlineTooltip } from '@restate/ui/tooltip';
import { ERROR_CODES, RestateError } from '@restate/util/errors';
import { PropsWithChildren } from 'react';
import Markdown from 'react-markdown';
import { tv } from '@restate/util/styles';

const styles = tv({
  base: 'relative flex min-h-0 flex-col gap-2 rounded-xl p-3 text-sm',
  variants: {
    isTransient: {
      true: 'bg-orange-50',
      false: 'bg-red-50',
    },
  },
});

const iconStyles = tv({
  base: 'mt-[0.0625rem] h-4 w-4',
  variants: {
    isTransient: {
      true: 'fill-orange-500 text-orange-500',
      false: 'fill-red-500 text-red-500',
    },
  },
});

const outputStyles = tv({
  base: 'max-h-28 flex-auto overflow-auto [word-break:break-word]',
  variants: {
    isTransient: {
      true: 'text-orange-700',
      false: 'text-red-700',
    },
  },
});

const codeStyles = tv({
  base: 'h-full flex-auto overflow-hidden border bg-gray-200/50 p-0! text-0.5xs mix-blend-multiply shadow-[inset_0_0.5px_0.5px_0px_rgba(0,0,0,0.08)]',
  variants: {
    wrap: { true: 'whitespace-pre', false: '' },
    isTransient: {
      true: 'text-orange-700',
      false: 'text-red-700',
    },
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
  isTransient,
}: PropsWithChildren<{
  error: RestateError;
  className?: string;
  wrap?: boolean;
  open?: boolean;
  isTransient?: boolean;
}>) {
  const { restate_code: code, message } = error;
  const { summary, help } = code
    ? (ERROR_CODES[code] ?? DEFAULT_ERROR)
    : DEFAULT_ERROR;

  return (
    <div className={styles({ className, isTransient })}>
      <div className="flex items-start gap-2">
        <div className="shrink-0">
          <Icon
            className={iconStyles({ isTransient })}
            name={IconName.CircleX}
          />
        </div>
        <output className={outputStyles({ isTransient })}>
          {help ? (
            <InlineTooltip
              variant="indicator-button"
              className="[&_button]:mt-1 [&_button]:mr-1 [&_button]:self-start"
              title={code}
              {...(code && {
                learnMoreHref: `https://docs.restate.dev/references/errors#${code?.toLowerCase()}`,
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
        <Code className={codeStyles({ wrap, isTransient })}>
          <Snippet language="bash" className="relative gap-0 px-0!">
            <details
              className="group flex-auto overflow-auto p-2 pl-4 text-[90%] [scrollbar-gutter:stable_both-edges] open:pb-6"
              open={open}
            >
              <summary className="group-open:h-4">
                <span className="inline-block truncate align-middle leading-8 group-open:invisible group-open:text-[0px]">
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
      <SnippetCopy copyText={message} className="" />
    </div>
  );
}
