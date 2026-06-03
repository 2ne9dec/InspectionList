import { buildSlice } from '@/shared/lib/store/buildSlice';

export interface CopyDefectSchema {
  isOpen: boolean;
  /** Ключ группы-источника: "о:253" — опора, "п:250-300" — Пролёты */
  sourceKey: string | null;
  targetPolesInput: string;
  selectedDefectIds: number[];
}

const initialState: CopyDefectSchema = {
  isOpen: false,
  sourceKey: null,
  targetPolesInput: '',
  selectedDefectIds: [],
};

export const copyDefectSlice = buildSlice({
  name: 'copyDefect',
  initialState,
  reducers: {
    openModal: (state, action: { payload: string }) => {
      state.isOpen = true;
      state.sourceKey = action.payload;
      state.targetPolesInput = '';
      state.selectedDefectIds = [];
    },
    closeModal: (state) => {
      state.isOpen = false;
      state.sourceKey = null;
      state.targetPolesInput = '';
      state.selectedDefectIds = [];
    },
    setTargetPolesInput: (state, action: { payload: string }) => {
      state.targetPolesInput = action.payload;
    },
    toggleDefectId: (state, action: { payload: number }) => {
      const idx = state.selectedDefectIds.indexOf(action.payload);
      if (idx === -1) state.selectedDefectIds.push(action.payload);
      else state.selectedDefectIds.splice(idx, 1);
    },
    selectAllDefects: (state, action: { payload: number[] }) => {
      state.selectedDefectIds = action.payload;
    },
    clearDefectSelection: (state) => {
      state.selectedDefectIds = [];
    },
  },
});

export const copyDefectReducer = copyDefectSlice.reducer;
export const copyDefectActions = {
  ...copyDefectSlice.actions,
  useActions: copyDefectSlice.useActions,
};
