import { Nav, NavSearchItem } from '@restate/ui/nav';
import {
  LOGS_GRANULARITY_QUERY_PARAM_NAME,
  LogsGranularity,
} from './LogsGranularity';
import { Icon, IconName } from '@restate/ui/icons';

export function GranularitySelector() {
  return (
    <Nav ariaCurrentValue="time">
      <NavSearchItem
        search={`${LOGS_GRANULARITY_QUERY_PARAM_NAME}=${LogsGranularity.PT2H}`}
      >
        2h
      </NavSearchItem>
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
        <div className="flex items-center gap-1">
          <div
            className={`relative w-3 h-3 text-xs text-gray-500 hidden group-current:block`}
          >
            <Icon
              name={IconName.Circle}
              className="absolute left-0 top-0 w-3 h-3 stroke-0 fill-current"
            />
            <Icon
              name={IconName.Circle}
              className="animate-ping absolute inset-left-0 top-0 w-3 h-3 stroke-[4px] fill-current opacity-20"
            />
          </div>
          Live
        </div>
      </NavSearchItem>
    </Nav>
  );
}
