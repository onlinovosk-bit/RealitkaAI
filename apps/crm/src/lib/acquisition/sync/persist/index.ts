export {
  ACQUISITION_PERSIST_SYNC_ENV,
  isAcquisitionPersistSyncEnabled,
} from "./flag";
export {
  SYNC_CONFLICT,
  SYNC_TABLES,
  type AdGroupPersistRow,
  type KeywordPersistRow,
  type MetricPersistRow,
  type PersistProvider,
  type PersistSupabase,
  type PersistUpsertResult,
  type SearchTermPersistRow,
} from "./types";
export {
  createAcquisitionPersistWriter,
  keywordProviderId,
  metricProviderId,
  persistAdGroup,
  persistKeyword,
  persistMetric,
  persistSearchTerm,
  searchTermProviderId,
  type AcquisitionPersistWriter,
} from "./upsert";