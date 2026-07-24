import { buildSlice } from '@/shared/lib/store/buildSlice';

export type LocationMode = 'pole' | 'span';

export interface AddDefectSchema {
  selectedDefectId: number | null;
  selectedElementId: number | null;
  selectedPhaseIds: number[];
  garlandNumber: string;
  /** Opory: odna ili neskolko cherez zapyatuyu: "1, 3, 5" */
  poleNumber: string;
  inspector: string;
  dateFound: string;
  insulatorCount: string;
  spanRange: string;
  /** Rezhim dobavleniya: pora ili prolet */
  mode: LocationMode;
  /** Primechanie k defektu */
  notes: string;
  isFormOpen: boolean;
}

const getToday = () => new Date().toISOString().split('T')[0];

const initialState: AddDefectSchema = {
  selectedDefectId: null,
  selectedElementId: null,
  selectedPhaseIds: [],
  garlandNumber: '',
  poleNumber: '',
  inspector: '',
  dateFound: '',
  insulatorCount: '',
  spanRange: '',
  mode: 'pole',
  notes: '',
  isFormOpen: false,
};

export const addDefectSlice = buildSlice({
  name: 'addDefect',
  initialState,
  reducers: {
    openForm: (state) => {
      state.isFormOpen = true;
      state.dateFound = getToday();
    },
    resetDate: (state) => {
      state.dateFound = getToday();
    },
    closeForm: (state) => {
      state.isFormOpen = false;
      state.selectedDefectId = null;
      state.selectedElementId = null;
      state.selectedPhaseIds = [];
      state.insulatorCount = '';
      state.notes = '';
      // poleNumber i spanRange sohranyaem
    },
    selectDefect: (state, action: { payload: { defectId: number; elementId: number } }) => {
      state.selectedDefectId = action.payload.defectId;
      state.selectedElementId = action.payload.elementId;
      state.selectedPhaseIds = [];
      state.garlandNumber = '';
    },
    clearDefectSelection: (state) => {
      state.selectedDefectId = null;
      state.selectedElementId = null;
      state.selectedPhaseIds = [];
      state.garlandNumber = '';
      state.insulatorCount = '';
      state.spanRange = '';
    },
    setPhaseIds: (state, action: { payload: number[] }) => {
      state.selectedPhaseIds = action.payload;
    },
    setPoleNumber: (state, action: { payload: string }) => {
      state.poleNumber = action.payload;
    },
    setInspector: (state, action: { payload: string }) => {
      state.inspector = action.payload;
    },
    setDateFound: (state, action: { payload: string }) => {
      state.dateFound = action.payload;
    },
    setInsulatorCount: (state, action: { payload: string }) => {
      state.insulatorCount = action.payload;
    },
    setSpanRange: (state, action: { payload: string }) => {
      state.spanRange = action.payload;
    },
    setGarlandNumber: (state, action: { payload: string }) => {
      state.garlandNumber = action.payload;
    },
    setMode: (state, action: { payload: LocationMode }) => {
      state.mode = action.payload;
      state.poleNumber = '';
      state.spanRange = '';
    },
    setNotes: (state, action: { payload: string }) => {
      state.notes = action.payload;
    },
  },
});

export const addDefectReducer = addDefectSlice.reducer;
export const addDefectActions = {
  ...addDefectSlice.actions,
  useActions: addDefectSlice.useActions,
};
