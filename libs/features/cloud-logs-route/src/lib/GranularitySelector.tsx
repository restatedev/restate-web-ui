import { Nav, NavSearchItem } from '@restate/ui/nav';
import {
  LOGS_GRANULARITY_QUERY_PARAM_NAME,
  LogsGranularity,
} from './LogsGranularity';

export function GranularitySelector() {
  return (
    <Nav ariaCurrentValue="time">
      <NavSearchItem
        search={`${LOGS_GRANULARITY_QUERY_PARAM_NAME}=${LogsGranularity.PT1H}`}
      >
        1h
      </NavSearchItem>
      <NavSearchItem
        search={`${LOGS_GRANULARITY_QUERY_PARAM_NAME}=${LogsGranularity.PT30M}`}
      >
        30m
      </NavSearchItem>
      <NavSearchItem
        search={`${LOGS_GRANULARITY_QUERY_PARAM_NAME}=${LogsGranularity.PT5M}`}
      >
        5m
      </NavSearchItem>
      <NavSearchItem
        search={`${LOGS_GRANULARITY_QUERY_PARAM_NAME}=${LogsGranularity.Live}`}
      >
        Live
      </NavSearchItem>
    </Nav>
  );
}
