import { SnippetCopy } from '@restate/ui/code';
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
import {
  Button as RACButton,
  Disclosure,
  DisclosurePanel,
  Heading,
} from 'react-aria-components';

const UI_CODES = new Set<string>(Object.values(UI_ERROR_CODES));

const styles = tv({
  base: 'relative flex max-h-[28rem] min-h-0 w-full flex-auto flex-col gap-2 overflow-auto rounded-xl p-3 text-sm',
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

const iconSlotStyles = tv({
  base: 'mt-[0.0625rem] flex h-4 w-4 shrink-0 items-center justify-center',
});

const iconStyles = tv({
  base: 'h-4 w-4',
  variants: {
    isTransient: {
      true: 'fill-orange-500 text-orange-500',
      false: 'fill-red-500 text-red-500',
    },
  },
});

const outputStyles = tv({
  base: 'max-h-28 min-w-0 flex-auto overflow-auto pr-8 [word-break:break-word]',
  variants: {
    isTransient: {
      true: 'text-orange-700',
      false: 'text-red-700',
    },
  },
});

const terminalStyles = tv({
  base: 'relative max-h-80 min-w-0 flex-auto overflow-auto rounded-xl border bg-gray-200/50 p-3 font-mono text-xs [overflow-wrap:anywhere] mix-blend-multiply shadow-[inset_0_0.5px_0.5px_0px_rgba(0,0,0,0.08)] [scrollbar-gutter:stable]',
  variants: {
    isTransient: {
      true: 'text-orange-700',
      false: 'text-red-700',
    },
  },
});

const terminalMessageStyles = tv({
  base: '',
  variants: {
    preformatted: {
      true: 'whitespace-pre-wrap',
      false: 'whitespace-normal',
    },
  },
});

const causeStyles = tv({
  base: 'min-w-0 flex-auto text-xs [word-break:break-word]',
  variants: {
    isTransient: {
      true: 'text-orange-700',
      false: 'text-red-700',
    },
  },
});

const causeIconStyles = tv({
  base: 'h-3.5 w-3.5',
  variants: {
    isTransient: {
      true: 'fill-orange-500 text-orange-500',
      false: 'fill-red-500 text-red-500',
    },
  },
});

const separatorStyles = tv({
  base: '-mx-3 flex items-center gap-2 text-[0.6875rem] font-semibold tracking-wider uppercase',
  variants: {
    isTransient: {
      true: 'text-orange-700/70',
      false: 'text-red-700/70',
    },
  },
});

const separatorLineStyles = tv({
  base: 'h-px',
  variants: {
    length: {
      short: 'w-8',
      long: 'flex-auto',
    },
    isTransient: {
      true: 'bg-orange-300/50',
      false: 'bg-red-300/50',
    },
  },
});

const metadataListStyles = tv({
  base: 'flex min-h-0 flex-col pr-1 text-xs [word-break:break-word]',
  variants: {
    isTransient: {
      true: 'text-orange-700',
      false: 'text-red-700',
    },
  },
});

const metadataTriggerStyles = tv({
  base: 'flex w-full cursor-pointer items-start gap-3 rounded-md py-0.5 text-left outline-none',
  variants: {
    isTransient: {
      true: 'hover:bg-orange-100/60 focus-visible:bg-orange-100/60',
      false: 'hover:bg-red-100/60 focus-visible:bg-red-100/60',
    },
  },
});

const metadataChevronStyles = tv({
  base: 'h-3 w-3 transition-transform group-expanded:rotate-90',
  variants: {
    isTransient: {
      true: 'fill-orange-700/70 text-orange-700/70',
      false: 'fill-red-700/70 text-red-700/70',
    },
  },
});

const metadataKeyStyles = tv({
  base: 'w-40 shrink-0 truncate font-semibold group-expanded:overflow-visible group-expanded:[overflow-wrap:anywhere] group-expanded:text-clip group-expanded:whitespace-normal',
  variants: {
    isTransient: {
      true: 'text-orange-700/70',
      false: 'text-red-700/70',
    },
  },
});

const metadataValueStyles = tv({
  base: 'min-w-0 flex-auto truncate font-mono',
});

const metadataCollapsibleValueStyles = tv({
  base: 'min-w-0 flex-auto truncate font-mono group-expanded:hidden',
});

const metadataPanelStyles = tv({
  base: 'py-0.5 pl-[12.5rem]',
});

const metadataPanelValueStyles = tv({
  base: 'block font-mono [overflow-wrap:anywhere] whitespace-pre-wrap',
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
  isTransient,
}: PropsWithChildren<{
  error: RestateError;
  className?: string;
  isTransient?: boolean;
}>) {
  const { restate_code: code, message, stack, metadata } = error;
  const { summary, help } = code
    ? (ERROR_CODES[code] ?? DEFAULT_ERROR)
    : DEFAULT_ERROR;
  const hasServerDocs = Boolean(code) && !UI_CODES.has(code as string);
  const causeChain = collectCauseChain(error);
  const metadataEntries = metadata ?? [];

  return (
    <div className={styles({ className, isTransient })}>
      <div className="flex items-start gap-3">
        <div className={iconSlotStyles()}>
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
      <div className="flex items-start gap-3">
        <div className={iconSlotStyles()} />
        <div className={terminalStyles({ isTransient })}>
          <div
            className={terminalMessageStyles({
              preformatted: message.includes('\n'),
            })}
          >
            {message}
          </div>
          {stack && <div className="mt-1 whitespace-pre">{stack}</div>}
        </div>
      </div>
      {metadataEntries.length > 0 && (
        <>
          <div className={separatorStyles({ isTransient })}>
            <div
              className={separatorLineStyles({ isTransient, length: 'short' })}
            />
            <span>details</span>
            <div
              className={separatorLineStyles({ isTransient, length: 'long' })}
            />
          </div>
          <div className={metadataListStyles({ isTransient })}>
            {metadataEntries.map(({ key, value }, index) => {
              const collapsible =
                key.length > 28 || value.length > 80 || value.includes('\n');

              if (!collapsible) {
                return (
                  <div
                    key={`${key}-${index}`}
                    className="flex items-start gap-3 py-0.5"
                  >
                    <div className={iconSlotStyles()} />
                    <div className="flex min-w-0 flex-auto items-baseline gap-3">
                      <span className={metadataKeyStyles({ isTransient })}>
                        {key}
                      </span>
                      <span className={metadataValueStyles()}>{value}</span>
                    </div>
                  </div>
                );
              }

              const firstLine = value.split('\n')[0] ?? '';
              const preview =
                firstLine.length < value.length ? `${firstLine}…` : firstLine;

              return (
                <Disclosure key={`${key}-${index}`} className="group">
                  <Heading className="m-0">
                    <RACButton
                      slot="trigger"
                      className={metadataTriggerStyles({ isTransient })}
                    >
                      <div className={iconSlotStyles()}>
                        <Icon
                          name={IconName.ChevronRight}
                          className={metadataChevronStyles({ isTransient })}
                        />
                      </div>
                      <div className="flex min-w-0 flex-auto items-baseline gap-3">
                        <span className={metadataKeyStyles({ isTransient })}>
                          {key}
                        </span>
                        <span className={metadataCollapsibleValueStyles()}>
                          {preview}
                        </span>
                      </div>
                    </RACButton>
                  </Heading>
                  <DisclosurePanel className={metadataPanelStyles()}>
                    <span className={metadataPanelValueStyles()}>{value}</span>
                  </DisclosurePanel>
                </Disclosure>
              );
            })}
          </div>
        </>
      )}
      {causeChain.map((cause, index) => (
        <Fragment key={index}>
          <div className={separatorStyles({ isTransient })}>
            <div
              className={separatorLineStyles({ isTransient, length: 'short' })}
            />
            <span>caused by</span>
            <div
              className={separatorLineStyles({ isTransient, length: 'long' })}
            />
          </div>
          <div className="flex items-start gap-3">
            <div className={iconSlotStyles()}>
              <Icon
                name={IconName.CircleX}
                className={causeIconStyles({ isTransient })}
              />
            </div>
            <div className={causeStyles({ isTransient })}>
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
