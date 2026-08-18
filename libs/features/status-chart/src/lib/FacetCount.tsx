import { formatApproxPercentage, formatNumber } from '@restate/util/intl';
import { tv } from '@restate/util/styles';

const styles = tv({
  slots: {
    value: 'tabular-nums',
    denominator: 'text-current opacity-55',
  },
});

export function FacetCount({
  count,
  total,
  approximate = false,
  className,
}: {
  count: number;
  total?: number;
  approximate?: boolean;
  className?: string;
}) {
  const { value, denominator } = styles();
  const showsComparison = total !== undefined;
  if (approximate && total !== undefined) {
    return (
      <span className={value({ class: className })}>
        {total > 0 ? formatApproxPercentage(count / total) : '~0%'}
      </span>
    );
  }
  return (
    <span className={value({ class: className })}>
      {formatNumber(count, true)}
      {showsComparison && (
        <span className={denominator()}> / {formatNumber(total, true)}</span>
      )}
    </span>
  );
}
