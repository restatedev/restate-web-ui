import { use } from 'echarts/core';
import { BarChart, CustomChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  DatasetComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

let registered = false;

export function ensureEchartsRegistered() {
  if (registered) return;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  use([
    BarChart,
    CustomChart,
    PieChart,
    GridComponent,
    DatasetComponent,
    TooltipComponent,
    LegendComponent,
    MarkLineComponent,
    SVGRenderer,
  ]);
  registered = true;
}
