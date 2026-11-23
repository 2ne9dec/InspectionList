import type { CreateSheetSchema } from './createSheetSlice';

interface CreateSheetRootState {
  createSheet?: CreateSheetSchema;
}

const EMPTY_IDS: number[] = [];

export const selectCreateSheetIsOpen = (state: CreateSheetRootState) => state.createSheet?.isOpen ?? false;
export const selectCreateSheetVoltageId = (state: CreateSheetRootState) => state.createSheet?.voltageId ?? null;
export const selectCreateSheetLineId = (state: CreateSheetRootState) => state.createSheet?.lineId ?? null;
export const selectCreateSheetCreatedBy = (state: CreateSheetRootState) => state.createSheet?.createdBy ?? '';
export const selectCreateSheetCreatedDate = (state: CreateSheetRootState) => state.createSheet?.createdDate ?? '';
export const selectCreateSheetSearch = (state: CreateSheetRootState) => state.createSheet?.search ?? '';
export const selectCreateSheetSelectedDefectTypeIds = (state: CreateSheetRootState) =>
  state.createSheet?.selectedDefectTypeIds ?? EMPTY_IDS;
