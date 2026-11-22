export type {
  DefectRecord,
  DefectRecordFull,
  DefectCount,
  CreateDefectParams,
  EditDefectParams,
  FixDefectParams,
} from './model/types';

export {
  useGetDefectCountsQuery,
  useGetAllDefectsQuery,
  useGetDefectsBySheetQuery,
  useCreateDefectMutation,
  useFixDefectMutation,
  useDeleteDefectMutation,
  usePatchDefectNotesMutation,
  usePatchDefectStatusMutation,
  useDeleteDefectsBySheetMutation,
  usePatchDefectMasterMutation,
  usePatchDefectBasicMutation,
  useEditDefectMutation,
} from './api/defectsApi';

export { PoleGroupRow } from './ui/PoleGroupRow';
export { useDeleteDefect } from './model/useDeleteDefect';
export { getLocationKey, formatLocationLabel, locationKeyType } from './lib/locationKey';

export { enrichDefects } from './lib/enrichDefects';
export { filterDefectRows } from './lib/filterDefectRows';
export type { DefectFilterValues } from './lib/filterDefectRows';
export { groupDefectRows } from './lib/groupDefects';
export type { DefectSubGroup } from './lib/groupDefects';
export { groupByLocation, groupByPole } from './lib/groupByLocation';
export { formatDefectLocation } from './lib/formatDefectLocation';
