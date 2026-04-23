import { Code, Snippet, SnippetCopy } from '@restate/ui/code';
import { Icon, IconName } from '@restate/ui/icons';
import { InlineTooltip } from '@restate/ui/tooltip';
import {
  ERROR_CODES,
  RestateError,
  UI_ERROR_CODES,
} from '@restate/util/errors';
import { Fragment, PropsWithChildren } from 'react';
import Markdown from 'react-markdown';
import { tv } from '@restate/util/styles';

const UI_CODES = new Set<string>(Object.values(UI_ERROR_CODES));

const styles = tv({
  base: 'relative flex min-h-0 w-full flex-auto flex-col gap-2 rounded-xl p-3 text-sm',
  variants: {
    isTransient: {
      true: 'bg-orange-50',
      false: 'bg-red-50',
    },
  },
});

const copyButtonStyles = tv({
  base: 'top-2 right-2 rounded-md border-transparent bg-transparent p-1.5 shadow-none transition-colors [&_svg]:h-3.5 [&_svg]:w-3.5',
  variants: {
    isTransient: {
      true: 'text-orange-600/60 hover:bg-orange-200/50 hover:text-orange-700',
      false: 'text-red-600/60 hover:bg-red-200/50 hover:text-red-700',
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
  base: 'max-h-28 flex-auto overflow-auto pr-8 [word-break:break-word]',
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
    wrap: true,
  },
});

const causeStyles = tv({
  base: 'flex items-start gap-2 text-xs [word-break:break-word]',
  variants: {
    isTransient: {
      true: 'text-orange-700',
      false: 'text-red-700',
    },
  },
});

const causeIconStyles = tv({
  base: 'mt-[0.0625rem] h-3.5 w-3.5 shrink-0',
  variants: {
    isTransient: {
      true: 'fill-orange-500 text-orange-500',
      false: 'fill-red-500 text-red-500',
    },
  },
});

const separatorStyles = tv({
  base: 'flex items-center gap-2 text-[0.6875rem] font-semibold tracking-wider uppercase',
  variants: {
    isTransient: {
      true: 'text-orange-700/70',
      false: 'text-red-700/70',
    },
  },
});

const separatorLineStyles = tv({
  base: 'h-px flex-auto',
  variants: {
    isTransient: {
      true: 'bg-orange-300/70',
      false: 'bg-red-300/70',
    },
  },
});

const DEFAULT_ERROR: { summary: string; help?: string } = {
  summary:
    'An error has occurred! Check the details below for more information:',
  help: undefined,
};

function getErrorSummary(error: Error) {
  const code = error instanceof RestateError ? error.restate_code : undefined;
  const entry = code ? ERROR_CODES[code] : undefined;
  return entry?.summary ?? error.message;
}

function collectCauseChain(error: Error): Error[] {
  const chain: Error[] = [];
  let current: unknown = error.cause;
  while (current instanceof Error) {
    chain.push(current);
    current = (current as Error).cause;
  }
  return chain;
}

export function RestateServerError({
  error,
  children,
  className,
  wrap,
  isTransient,
}: PropsWithChildren<{
  error: RestateError;
  className?: string;
  wrap?: boolean;
  isTransient?: boolean;
}>) {
  const { restate_code: code, message, stack } = error;
  const { summary, help } = code
    ? (ERROR_CODES[code] ?? DEFAULT_ERROR)
    : DEFAULT_ERROR;
  const hasServerDocs = Boolean(code) && !UI_CODES.has(code as string);
  const causeChain = collectCauseChain(error);

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
              className="inline [&_button]:mx-1 [&_button]:translate-y-0.5 [&_button]:self-start [&_p]:inline"
              title={code}
              {...(hasServerDocs && {
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
      <Code className={codeStyles({ wrap, isTransient })}>
        <Snippet language="bash" className="relative gap-0 px-0!">
          <div className="group error flex max-h-80 flex-auto flex-col gap-1 overflow-auto py-4 pr-2 pl-5 text-[90%] [scrollbar-gutter:stable] open:pb-6">
            <span className="inline-block whitespace-normal [overflow-wrap:anywhere]">
              {message}
            </span>
            {stack && (
              <div className="inline-block whitespace-pre">{stack}</div>
            )}
          </div>
        </Snippet>
      </Code>
      {causeChain.map((cause, index) => (
        <Fragment key={index}>
          <div className={separatorStyles({ isTransient })}>
            <span>caused by</span>
            <div className={separatorLineStyles({ isTransient })} />
          </div>
          <div className={causeStyles({ isTransient })}>
            <Icon
              name={IconName.CircleX}
              className={causeIconStyles({ isTransient })}
            />
            <div className="min-w-0 flex-auto [word-break:break-word]">
              {getErrorSummary(cause)}
            </div>
          </div>
        </Fragment>
      ))}
      {children && <div className="shrink-0">{children}</div>}
      <SnippetCopy
        copyText={message}
        className={copyButtonStyles({ isTransient })}
      />
    </div>
  );
}
