import { useMemo } from 'react';
import type { AxisType, TooltipConfig } from '../types';
import type { TooltipComponentOption } from 'echarts/components';
import { formatRange } from '@restate/util/intl';
import { TopLevelFormatterParams } from 'echarts/types/dist/shared';

const noOp = (value: number) => String(value);
export function useTooltip(
  tooltipCfg: TooltipConfig | undefined,
  xType: AxisType,
  timeZone: 'system' | 'UTC',
): TooltipComponentOption {
  return useMemo(() => {
    const show = tooltipCfg?.show ?? true;
    const trigger = tooltipCfg?.trigger ?? 'item';

    const pieFormatter = (params: TopLevelFormatterParams) => {
      if (Array.isArray(params)) {
        return '';
      }
      const { name, value, color, percent } = params;
      const yFormatter = tooltipCfg?.formatValue ?? noOp;
      const formattedValue =
        typeof value === 'number' ? yFormatter(value) : String(value ?? '');

      const colorStr = String(color ?? '#ccc');

      const dot = document.createElement('span');
      dot.style.display = 'inline-block';
      dot.style.width = '12px';
      dot.style.height = '12px';
      dot.style.borderRadius = '50%';
      dot.style.backgroundColor = colorStr;
      dot.style.border = `1.5px solid color-mix(in srgb, ${colorStr} 70%, black)`;
      dot.style.boxShadow = `inset 0 1px 0 0 rgba(255,255,255,0.35)`;
      dot.style.marginRight = '8px';
      dot.style.flexShrink = '0';

      const label = document.createElement('span');
      label.textContent = name ?? '';
      label.style.color = 'rgba(255,255,255,0.7)';
      label.style.marginRight = '8px';

      const val = document.createElement('span');
      val.textContent = formattedValue;
      val.style.fontWeight = '600';
      val.style.color = 'rgba(255,255,255,0.95)';
      val.style.marginLeft = 'auto';

      const pct = document.createElement('span');
      pct.textContent = percent != null ? ` (${percent}%)` : '';
      pct.style.color = 'rgba(255,255,255,0.85)';
      pct.style.fontWeight = '500';
      pct.style.marginLeft = '4px';

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.appendChild(dot);
      row.appendChild(label);
      row.appendChild(val);
      row.appendChild(pct);

      return row;
    };

    const defaultFormatter = (params: TopLevelFormatterParams) => {
      if (Array.isArray(params)) {
        return '';
      }

      if (params.seriesType === 'pie') {
        return pieFormatter(params);
      }

      const {
        encode = { x: [], y: [] },
        dimensionNames = {} as string[],
        value,
      } = params;
      const { x = [], y = [] } = encode;

      if (
        typeof value !== 'object' ||
        value instanceof Date ||
        Array.isArray(value) ||
        value === null ||
        value === undefined
      ) {
        return '';
      }
      const [startIndex = 0, endIndex = 0] = x;
      const [dataIndex = 0] = y;
      const startKey = dimensionNames[startIndex]!;
      const endKey = dimensionNames[endIndex]!;
      const dataKey = dimensionNames[dataIndex]!;
      const start = (value as any)[startKey];
      const end = x.length > 1 ? (value as any)[endKey] : undefined;
      const yValue = (value as any)[dataKey];

      const xFormatter = tooltipCfg?.formatRange ?? formatRange;
      const systemRange = xFormatter(new Date(start), new Date(end), 'system');
      const utcRange = xFormatter(new Date(start), new Date(end), 'UTC');

      const yFormatter = tooltipCfg?.formatValue ?? noOp;

      const container = document.createElement('div');
      const header = document.createElement('div');
      header.textContent = systemRange;
      header.style.color = 'rgba(255,255,255,0.9)';
      header.style.fontWeight = '500';

      const subheader = document.createElement('div');
      subheader.textContent = utcRange;
      subheader.style.fontSize = '0.9em';

      const separator = document.createElement('hr');
      separator.style.marginLeft = '-16px';
      separator.style.marginRight = '-16px';
      separator.style.backgroundColor = 'white';
      separator.style.opacity = '0.2';
      separator.style.marginTop = '16px';
      separator.style.marginBottom = '16px';

      const body = document.createElement('div');
      body.textContent =
        typeof yValue === 'number' ? yFormatter(yValue) : 'No data available';
      body.style.fontSize = typeof yValue === 'number' ? '1.4em' : '1em';
      body.style.fontWeight = '400';
      body.style.color =
        typeof yValue === 'number'
          ? 'rgba(255,255,255,0.9)'
          : 'rgba(255,255,255,0.6)';

      container.appendChild(header);
      container.appendChild(subheader);
      container.appendChild(separator);
      container.appendChild(body);

      return container;
    };

    return {
      show,
      trigger,
      axisPointer: { type: trigger === 'axis' ? 'shadow' : 'line' },
      formatter: (p) => defaultFormatter(p),
      backgroundColor: 'oklab(0.274 0.00165715 -0.00576662 / 0.9)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'oklab(0.21 0.00164225 -0.00577088 / 0.8)',
      padding: 16,
      extraCssText: `
      backdrop-filter: blur(24px);
      filter: drop-shadow(0 9px 7px rgb(0 0 0 / 0.1));
      box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px,
        rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px,
        oklch(0.551 0.027 264.364) 0px 1px 0px 0px inset;
      `,
      textStyle: {
        color: 'oklch(87.2% 0.01 258.338)',
        fontFamily: 'InterVariable, sans-serif',
      },
    };
  }, [
    tooltipCfg?.formatRange,
    tooltipCfg?.formatValue,
    tooltipCfg?.show,
    tooltipCfg?.trigger,
  ]);
}
