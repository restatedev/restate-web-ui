import { RefObject, useEffect, useEffectEvent, useMemo } from 'react';
import type { EChartsType, ECElementEvent } from 'echarts/core';
import type { AnySeriesCfg, BarTimeSeriesCfg, PieConfig } from '../types';

type ChartEventsOptions<T extends object> = {
  data: T[];
  pie?: PieConfig;
  series: AnySeriesCfg<T>[];
  resetKey?: unknown;
  pieHighlightSeriesIndex?: number;
  linkedHoverSeriesIndices?: number[];
};

export function useChartEvents<T extends object>(
  chartRef: RefObject<EChartsType | null>,
  {
    data,
    pie,
    series,
    resetKey,
    pieHighlightSeriesIndex,
    linkedHoverSeriesIndices = [],
  }: ChartEventsOptions<T>,
) {
  const linkedHoverSignature = linkedHoverSeriesIndices.join(',');
  const selectEnabled =
    Boolean(pie?.slices.some((slice) => slice.onSelect)) ||
    series.some(
      (seriesConfig) =>
        isBarTimeSeriesConfig(seriesConfig) && seriesConfig.onSelect,
    );
  const stableLinkedHoverSeriesIndices = useMemo(
    () =>
      linkedHoverSignature
        ? linkedHoverSignature.split(',').map((index) => Number(index))
        : [],
    [linkedHoverSignature],
  );

  const handleSelect = useEffectEvent(
    (params: ECElementEvent, instance: EChartsType) => {
      const dataIndex = params.dataIndex;
      const seriesIndex = params.seriesIndex;
      if (dataIndex == null || seriesIndex == null) return;

      if (seriesIndex === 0 && pie) {
        const slice = pie.slices[dataIndex];
        slice?.onSelect?.({
          name: slice.name,
          value: slice.value,
          dataIndex,
          event: params,
          chart: instance,
        });
        return;
      }

      const barTimeSeries = series[seriesIndex];
      if (!isBarTimeSeriesConfig(barTimeSeries)) return;
      if (!barTimeSeries.onSelect) return;

      const row = data[dataIndex];
      if (!row) return;
      const start = toDate(row[barTimeSeries.startRangeKey as keyof T]);
      const end = toDate(row[barTimeSeries.endRangeKey as keyof T]);
      if (!start || !end) return;

      barTimeSeries.onSelect({
        data: row,
        dataIndex,
        start,
        end,
        value: row[barTimeSeries.dataKey as keyof T],
        event: params,
        chart: instance,
      });
    },
  );

  useEffect(() => {
    const instance = chartRef.current;
    if (!instance) return;

    const disposers: Array<() => void> = [];

    if (pieHighlightSeriesIndex != null) {
      const onPieOver = (params: ECElementEvent) => {
        if (params.dataIndex == null) return;
        instance.dispatchAction({
          type: 'highlight',
          seriesIndex: pieHighlightSeriesIndex,
          dataIndex: params.dataIndex,
        });
      };
      const onPieOut = (params: ECElementEvent) => {
        if (params.dataIndex == null) return;
        instance.dispatchAction({
          type: 'downplay',
          seriesIndex: pieHighlightSeriesIndex,
          dataIndex: params.dataIndex,
        });
      };
      instance.on('mouseover', { seriesType: 'pie' }, onPieOver);
      instance.on('mouseout', { seriesType: 'pie' }, onPieOut);
      disposers.push(() => {
        instance.off('mouseover', onPieOver);
        instance.off('mouseout', onPieOut);
      });
    }

    const linkedHoverSeries = stableLinkedHoverSeriesIndices;
    if (linkedHoverSeries.length > 1) {
      const onCustomOver = (params: ECElementEvent) => {
        const dataIndex = params?.dataIndex;
        if (dataIndex == null) return;
        for (const seriesIndex of linkedHoverSeries) {
          instance.dispatchAction({
            type: 'highlight',
            seriesIndex,
            dataIndex,
          });
        }
      };
      const onCustomOut = (params: ECElementEvent) => {
        const dataIndex = params?.dataIndex;
        if (dataIndex == null) return;
        for (const seriesIndex of linkedHoverSeries) {
          instance.dispatchAction({
            type: 'downplay',
            seriesIndex,
            dataIndex,
          });
        }
      };
      const onGlobalOut = () => {
        instance.dispatchAction({ type: 'hideTip' });
        instance.dispatchAction({ type: 'downplay' });
      };
      const zr = instance.getZr();
      instance.on('mouseover', { seriesType: 'custom' }, onCustomOver);
      instance.on('mouseout', { seriesType: 'custom' }, onCustomOut);
      zr.on('globalout', onGlobalOut);
      disposers.push(() => {
        instance.off('mouseover', onCustomOver);
        instance.off('mouseout', onCustomOut);
        zr.off('globalout', onGlobalOut);
      });
    }

    if (selectEnabled) {
      const onClick = (params: ECElementEvent) => {
        handleSelect(params, instance);
      };
      instance.on('click', onClick);
      disposers.push(() => instance.off('click', onClick));
    }

    return () => {
      for (const dispose of disposers) dispose();
    };
  }, [
    chartRef,
    handleSelect,
    pieHighlightSeriesIndex,
    resetKey,
    selectEnabled,
    stableLinkedHoverSeriesIndices,
  ]);
}

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const time = Date.parse(value);
    if (!Number.isNaN(time)) return new Date(time);
  }
  return undefined;
}

function isBarTimeSeriesConfig<T extends object>(
  seriesConfig: AnySeriesCfg<T> | undefined,
): seriesConfig is BarTimeSeriesCfg<T> {
  return seriesConfig?.type === 'bar-time' && 'startRangeKey' in seriesConfig;
}
