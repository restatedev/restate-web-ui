export { query, routes } from './lib/query';
export { type StateServiceType } from './lib/handlers';
export {
  QUERY_DEFINITIONS,
  type QueryDefinition,
  type QueryId,
} from './lib/queryDefinitions';
export {
  clearQueryStats,
  getQueryStatsSnapshot,
  normalizeQueryPage,
  recordQuery,
  subscribeToQueryStats,
  type QueryExecutionEvent,
  type QueryMaxExecution,
  type QueryOutcome,
  type QueryStat,
} from './lib/queryStats';
