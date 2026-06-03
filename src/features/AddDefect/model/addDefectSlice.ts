import { buildSlice } from '@/shared/lib/store/buildSlice';

export interface AddDefectSchema {
  selectedDefectId: number | null;
  selectedElementId: number | null;
  selectedPhaseIds: number[];
  poleNumber: string;
  inspector: string;
  dateFound: string;
  insulatorCount: string;
  spanRange: string;
  isFormOpen: boolean;
}

const getToday = () => new Date().toISOString().split('T')[0];

const initialState: AddDefectSchema = {
  selectedDefectId: null,
  selectedElementId: null,
  selectedPhaseIds: [],
  poleNumber: '',
  inspector: '',
  dateFound: '',
  insulatorCount: '',
  spanRange: '',
  isFormOpen: false,
};

export const addDefectSlice = buildSlice({
  name: 'addDefect',
  initialState,
  reducers: {
    openForm: (state) => {
      state.isFormOpen = true;
      if (!state.dateFound) state.dateFound = getToday();
    },
    closeForm: (state) => {
      state.isFormOpen = false;
      state.selectedDefectId = null;
      state.selectedElementId = null;
      state.selectedPhaseIds = [];
      state.insulatorCount = '';
      // poleNumber и spanRange сохраняем — будут предзаполнены при следующем открытии
    },
    selectDefect: (state, action: { payload: { defectId: number; elementId: number } }) => {
      state.selectedDefectId = action.payload.defectId;
      state.selectedElementId = action.payload.elementId;
      state.selectedPhaseIds = [];
    },
    clearDefectSelection: (state) => {
      state.selectedDefectId = null;
      state.selectedElementId = null;
      state.selectedPhaseIds = [];
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
  },
});

export const addDefectReducer = addDefectSlice.reducer;
export const addDefectActions = {
  ...addDefectSlice.actions,
  useActions: addDefectSlice.useActions,
};
