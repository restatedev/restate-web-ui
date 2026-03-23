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

    const defaultFormatter = (params: TopLevelFormatterParams) => {
      if (Array.isArray(params)) {
        return '';
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
