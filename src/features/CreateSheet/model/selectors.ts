import type { StateSchema } from '@/app/providers/StoreProvider';

const EMPTY_IDS: number[] = [];

export const selectCreateSheetIsOpen = (state: StateSchema) => state.createSheet?.isOpen ?? false;
export const selectCreateSheetVoltageId = (state: StateSchema) => state.createSheet?.voltageId ?? null;
export const selectCreateSheetLineId = (state: StateSchema) => state.createSheet?.lineId ?? null;
export const selectCreateSheetCreatedBy = (state: StateSchema) => state.createSheet?.createdBy ?? '';
export const selectCreateSheetCreatedDate = (state: StateSchema) => state.createSheet?.createdDate ?? '';
export const selectCreateSheetSearch = (state: StateSchema) => state.createSheet?.search ?? '';
export const selectCreateSheetSelectedDefectTypeIds = (state: StateSchema) =>
  state.createSheet?.selectedDefectTypeIds ?? EMPTY_IDS;
