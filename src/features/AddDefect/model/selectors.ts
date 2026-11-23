import type { AddDefectSchema } from './addDefectSlice';

interface AddDefectRootState {
  addDefect?: AddDefectSchema;
}

const EMPTY_IDS: number[] = [];

export const selectAddDefectSelectedId  = (state: AddDefectRootState) => state.addDefect?.selectedDefectId  ?? null;
export const selectAddDefectElementId   = (state: AddDefectRootState) => state.addDefect?.selectedElementId ?? null;
export const selectAddDefectPhaseIds    = (state: AddDefectRootState) => state.addDefect?.selectedPhaseIds  ?? EMPTY_IDS;
export const selectAddDefectPole        = (state: AddDefectRootState) => state.addDefect?.poleNumber        ?? '';
export const selectAddDefectInspector   = (state: AddDefectRootState) => state.addDefect?.inspector         ?? '';
export const selectAddDefectDate        = (state: AddDefectRootState) => state.addDefect?.dateFound         ?? '';
export const selectAddDefectIsFormOpen  = (state: AddDefectRootState) => state.addDefect?.isFormOpen        ?? false;
export const selectAddDefectInsulatorCount = (state: AddDefectRootState) => state.addDefect?.insulatorCount ?? '';

export const selectAddDefectSpanRange     = (state: AddDefectRootState) => state.addDefect?.spanRange     ?? '';
export const selectAddDefectGarlandNumber = (state: AddDefectRootState) => state.addDefect?.garlandNumber ?? '';
export const selectAddDefectMode  = (state: AddDefectRootState) => state.addDefect?.mode  ?? 'pole';
export const selectAddDefectNotes = (state: AddDefectRootState) => state.addDefect?.notes ?? '';
