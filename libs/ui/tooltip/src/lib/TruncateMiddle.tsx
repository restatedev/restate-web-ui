import { tv } from '@restate/util-styles';

const styles = tv({
  slots: {
    base: 'inline-flex h-lh max-w-[calc(round(down,100%,1ch)_+_0.5px)] flex-wrap overflow-hidden whitespace-nowrap',
    head: 'max-w-max grow basis-0 truncate',
    tail: 'shrink-0',
  },
});

export interface TruncateMiddleProps {
  text: string;
  start?: number;
  end?: number;
  className?: string;
}

export function TruncateMiddle({
  text,
  start = 8,
  end = 5,
  className,
}: TruncateMiddleProps) {
  const { base, head, tail } = styles();

  if (text.length <= start + end) {
    return <span className={className}>{text}</span>;
  }

  const tailIndex = text.length - end;
  const headMinChars = Math.max(1, Math.min(start + 1, tailIndex - end));
  return (
    <span className={base({ className })}>
      <span
        className={head()}
        style={{ minWidth: `min(${headMinChars}ch, 100%)` }}
      >
        <span data-truncate-tooltip="true">{text.slice(0, tailIndex)}</span>
      </span>
      <span className={tail()}>{text.slice(tailIndex)}</span>
    </span>
  );
}
