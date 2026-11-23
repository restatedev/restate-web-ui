import { Button } from '@restate/ui-button';
import { DropdownSection } from '@restate/ui-dropdown';
import { tv } from '@restate/util-styles';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui-popover';
import { preloadEditor } from '@restate/ui-editor';
import { ReactNode } from 'react';

import { TruncateWithTooltip } from '@restate/ui-tooltip';
import { Icon, IconName } from '@restate/ui-icons';
import { Portal } from '@restate/ui-portal';
import { useJournalEntriesContext } from './JournalContext';

const styles = tv({
  base: 'relative flex max-w-full flex-row items-center pr-2',
  variants: {
    isFunction: {
      true: 'font-medium italic',
      false: 'font-medium',
    },
    isInline: {
      true: 'contents',
      false: '',
    },
  },
});

const fitStyles = tv({
  slots: {
    content: 'text-inherits min-w-0 text-tertiary',
    row: 'flex min-w-0 items-center',
    name: 'flex max-w-fit min-w-0 shrink-0 items-center font-medium',
    chain: 'base-20 min-w-0 truncate',
    chainContent: 'text-tertiary',
    symbol: 'shrink-0 text-subtle',
  },
  variants: {
    isInline: {
      true: {
        content: 'contents',
        row: 'contents',
      },
    },
    isFit: {
      true: {
        chain: 'contents',
        chainContent: 'contents',
      },
    },
    isNameElastic: {
      true: { name: 'min-w-[7ch] shrink @max-[480px]/journal:min-w-[4ch]' },
    },
  },
});

const ELASTIC_NAME_LENGTH = 7;

export function Expression({
  className,
  name,
  input,
  output,
  isFunction = true,
  isHandler = false,
  operationSymbol = isFunction ? '→' : '',
  prefix,
  chain,
  namePrefix,
  isPending = false,
  isInline = false,
}: {
  className?: string;
  name: string;
  namePrefix?: string;
  input?: ReactNode;
  output?: ReactNode;
  isFunction?: boolean;
  isHandler?: boolean;
  operationSymbol?: string;
  chain?: ReactNode;
  prefix?: ReactNode;
  // When the entry is pending, its `output` is status text (Ellipsis, "Wakes
  // up in…", etc.) rather than a result. `hideOutput` only suppresses real
  // results, so pending entries always render their output.
  isPending?: boolean;
  isInline?: boolean;
}) {
  const { hideOutput, isFit = false } = useJournalEntriesContext();
  const showOutput = (isPending || !hideOutput) && output;
  const isFitInline = isFit && isInline;
  const {
    content,
    row,
    name: nameStyle,
    chain: chainStyle,
    chainContent,
    symbol,
  } = fitStyles({
    isInline: isFitInline,
    isFit,
    isNameElastic: isFitInline && name.length > ELASTIC_NAME_LENGTH,
  });
  return (
    <div className={styles({ className, isFunction, isInline: isFitInline })}>
      <div className={content()}>
        <span className={row()}>
          {prefix && (
            <span className="shrink-0 font-normal text-accent">{prefix}</span>
          )}
          <span className={nameStyle()}>
            {isHandler && (
              <Icon
                name={IconName.Function}
                size="md"
                className="-ml-1 text-subtle"
              />
            )}
            <TruncateWithTooltip copyText={name}>
              {namePrefix && <span className="opacity-60">{namePrefix}</span>}
              {name}
            </TruncateWithTooltip>
          </span>

          {isFunction && (
            <span className="ml-[0.2ch] shrink-0 text-subtle">{'('}</span>
          )}
          {input}
          <span className="shrink-0 text-subtle">{isFunction && ')'}</span>
          {chain && (
            <span className={chainStyle()}>
              <span className={chainContent()}>{chain}</span>
              {typeof chain === 'string' ? '()' : null}
            </span>
          )}
          {showOutput && (
            <>
              <span className={symbol()}>
                <span className="mx-[0.5ch] font-sans text-muted">
                  {operationSymbol}
                </span>
              </span>
              {output}
            </>
          )}
        </span>
      </div>
    </div>
  );
}

const inputOutputStyles = tv({
  base: 'contents items-center gap-1 rounded-md py-0 pl-0.5 text-2xs text-secondary',
  slots: {
    value: 'mr-0.5 contents font-mono leading-5 font-semibold text-muted',
    content:
      'mb-1 w-[90vw] max-w-[min(90vw,600px)] min-w-80 overflow-auto py-0 pr-0 pl-4',
  },
});

export function InputOutput({
  className,
  name,
  popoverContent,
  popoverTitle,
  isValueHidden = false,
  waterMark,
}: {
  className?: string;
  name: ReactNode;
  popoverContent?: ReactNode;
  popoverTitle?: string;
  waterMark?: ReactNode;
  isValueHidden?: boolean;
}) {
  const { base, value, content } = inputOutputStyles();

  if (!popoverContent) {
    return (
      <div className={base()}>
        <span
          className={value({
            className:
              'max-w-fit truncate px-0.5 py-0 font-sans text-xs leading-5 font-normal text-tertiary not-italic',
          })}
        >
          <span className="truncate px-0.5">{name}</span>
        </span>
      </div>
    );
  }

  return (
    <div className={base()}>
      <span
        className={value()}
        onPointerEnter={preloadEditor}
        onFocus={preloadEditor}
      >
        <Popover>
          {isValueHidden ? (
            <PopoverTrigger>
              <Button
                className="mx-0.5 my-0.5 flex h-5 min-w-6 items-center justify-center gap-0 rounded-xl p-0 font-sans text-2xs font-medium text-muted shadow-none outline-offset-0"
                variant="secondary"
              >
                <Icon name={IconName.Eye} size="xs" className="mx-1.5" />
                <span className="block min-w-0 truncate">
                  {popoverTitle}
                  <span className="inline-block w-3" />
                </span>
              </Button>
            </PopoverTrigger>
          ) : (
            <PopoverTrigger>
              <Button
                className="my-px max-w-fit truncate rounded-xl px-0.5 py-0 font-mono [font-size:inherit] leading-5 text-inherit underline decoration-dashed decoration-from-font underline-offset-4 outline-offset-0"
                variant="icon"
              >
                <span className="truncate pr-0.5">{name}</span>
              </Button>
            </PopoverTrigger>
          )}
          <PopoverContent>
            <DropdownSection
              className={content({ className })}
              title={
                <div className="flex items-center text-0.5xs">
                  <span>{popoverTitle}</span>
                  <div className="ml-auto">{waterMark}</div>
                  <Portal className="-mr-2 ml-2" id="expression-value" />
                </div>
              }
            >
              {popoverContent}
            </DropdownSection>
          </PopoverContent>
        </Popover>
      </span>
    </div>
  );
}
