export type {
  DefectRecord,
  DefectRecordFull,
  DefectCount,
  CreateDefectParams,
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
} from './api/defectsApi';

export { DefectRow } from './ui/DefectRow';
export { PoleGroupRow } from './ui/PoleGroupRow';
export { useDeleteDefect } from './model/useDeleteDefect';
export { getLocationKey, formatLocationLabel, locationKeyType } from './lib/locationKey';
