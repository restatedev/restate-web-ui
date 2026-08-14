import { Badge } from '@restate/ui/badge';
import { formatNumber } from '@restate/util/intl';
import { tv } from '@restate/util/styles';

const styles = tv({
  slots: {
    root: 'max-w-full min-w-0 overflow-hidden font-normal whitespace-nowrap',
    label: 'min-w-0 truncate',
    value: '-ml-0.5 shrink-0 leading-3.5 font-semibold tabular-nums',
  },
  variants: {
    disabled: {
      true: { root: 'opacity-60' },
    },
  },
});

export interface LimitValueProps {
  value: number | null | undefined;
  disabled?: boolean;
}

export function LimitValue({ value, disabled }: LimitValueProps) {
  const { root, label, value: valueStyles } = styles({ disabled });

  return (
    <Badge variant="default" className={root()}>
      <span className={label()}>concurrency =</span>
      <Badge variant="default" className={valueStyles()}>
        {value != null ? (
          formatNumber(value)
        ) : (
          <span aria-label="Unlimited">∞</span>
        )}
      </Badge>
    </Badge>
  );
}
