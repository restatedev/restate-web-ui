import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { tv } from '@restate/util/styles';
import {
  Popover,
  PopoverContent,
  PopoverHoverTrigger,
  PopoverTrigger,
} from '@restate/ui/popover';
import { ReactNode } from 'react';

import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Icon, IconName } from '@restate/ui/icons';

const styles = tv({
  base: 'relative flex max-w-full flex-row flex-wrap items-center pr-2',
  variants: {
    isFunction: {
      true: 'font-medium italic',
      false: 'font-medium',
    },
  },
});

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
}) {
  return (
    <div className={styles({ className, isFunction })}>
      <div className="text-inherits w-full flex-auto text-zinc-600">
        <span className="flex min-w-0 items-center">
          {prefix && (
            <span className="shrink-0 font-normal text-blue-500">{prefix}</span>
          )}
          <span className="flex max-w-fit min-w-0 shrink-0 grow basis-20 items-center font-medium">
            {isHandler && (
              <Icon
                name={IconName.Function}
                className="-ml-1 h-4 w-4 shrink-0 text-zinc-400"
              />
            )}
            <TruncateWithTooltip copyText={name}>
              {namePrefix && <span className="opacity-60">{namePrefix}</span>}
              {name}
            </TruncateWithTooltip>
          </span>

          {isFunction && (
            <span className="ml-[0.2ch] shrink-0 text-zinc-400">{'('}</span>
          )}
          {input}
          <span className="shrink-0 text-zinc-400">{isFunction && ')'}</span>
          {chain && (
            <span className="base-20 min-w-0 truncate">
              <span className="text-zinc-600">{chain}</span>
              {typeof chain === 'string' ? '()' : null}
            </span>
          )}
          <span className="shrink-0 text-zinc-400">
            {output && (
              <span className="mx-[0.5ch] font-sans text-zinc-500">
                {operationSymbol}
              </span>
            )}
          </span>
          {output}
        </span>
      </div>
    </div>
  );
}

const inputOutputStyles = tv({
  base: 'contents items-center gap-1 rounded-md py-0 pl-0.5 text-2xs text-zinc-700',
  slots: {
    value: 'mr-0.5 contents font-mono leading-5 font-semibold text-zinc-500',
    content: 'mb-1 max-w-[min(90vw,600px)] min-w-80 overflow-auto px-4',
  },
});

export function InputOutput({
  className,
  name,
  popoverContent,
  popoverTitle,
  isValueHidden = false,
}: {
  className?: string;
  name: ReactNode;
  popoverContent?: ReactNode;
  popoverTitle?: string;
  isValueHidden?: boolean;
}) {
  const { base, value, content } = inputOutputStyles();

  if (!popoverContent) {
    return (
      <div className={base()}>
        <span
          className={value({
            className:
              'max-w-fit grow basis-20 truncate px-0.5 py-0 font-sans text-xs leading-5 font-normal text-zinc-600 not-italic',
          })}
        >
          <span className="truncate px-0.5">{name}</span>
        </span>
      </div>
    );
  }

  return (
    <div className={base()}>
      <span className={value()}>
        <Popover>
          {isValueHidden ? (
            <PopoverTrigger>
              <Button
                className="flex h-6 min-w-6 items-center justify-center gap-0 rounded-lg p-0 font-sans text-2xs font-medium text-gray-500"
                variant="secondary"
              >
                <Icon name={IconName.Eye} className="mx-1.5 h-3 w-3 shrink-0" />
                <span className="block min-w-0 truncate">
                  {popoverTitle}
                  <span className="inline-block w-3" />
                </span>
              </Button>
            </PopoverTrigger>
          ) : (
            <PopoverHoverTrigger>
              <Button
                className="max-w-fit grow basis-20 truncate rounded-xs px-0.5 py-0 font-mono [font-size:inherit] text-inherit underline decoration-dashed decoration-from-font underline-offset-4"
                variant="icon"
              >
                <span className="truncate pr-0.5">{name}</span>
              </Button>
            </PopoverHoverTrigger>
          )}
          <PopoverContent>
            <DropdownSection
              className={content({ className })}
              title={
                <div className="flex items-center text-0.5xs">
                  <span>{popoverTitle}</span>
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
