import type { StateSchema } from '@/app/providers/StoreProvider';

const EMPTY_IDS: number[] = [];

export const selectAddDefectSelectedId  = (state: StateSchema) => state.addDefect?.selectedDefectId  ?? null;
export const selectAddDefectElementId   = (state: StateSchema) => state.addDefect?.selectedElementId ?? null;
export const selectAddDefectPhaseIds    = (state: StateSchema) => state.addDefect?.selectedPhaseIds  ?? EMPTY_IDS;
export const selectAddDefectPole        = (state: StateSchema) => state.addDefect?.poleNumber        ?? '';
export const selectAddDefectInspector   = (state: StateSchema) => state.addDefect?.inspector         ?? '';
export const selectAddDefectDate        = (state: StateSchema) => state.addDefect?.dateFound         ?? '';
export const selectAddDefectIsFormOpen  = (state: StateSchema) => state.addDefect?.isFormOpen        ?? false;
export const selectAddDefectInsulatorCount = (state: StateSchema) => state.addDefect?.insulatorCount ?? '';

export const selectAddDefectSpanRange     = (state: StateSchema) => state.addDefect?.spanRange     ?? '';
export const selectAddDefectGarlandNumber = (state: StateSchema) => state.addDefect?.garlandNumber ?? '';
