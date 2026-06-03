import { buildSlice } from '@/shared/lib/store/buildSlice';

export interface FixDefectSchema {
  isOpen: boolean;
  /** Ключ группы: "о:253" — опора, "п:250-300" — Пролёты */
  targetKey: string | null;
  selectedIds: number[];
  dateFixed: string;
  inspectorFix: string;
}

const getToday = () => new Date().toISOString().split('T')[0];

const initialState: FixDefectSchema = {
  isOpen: false,
  targetKey: null,
  selectedIds: [],
  dateFixed: getToday(),
  inspectorFix: '',
};

export const fixDefectSlice = buildSlice({
  name: 'fixDefect',
  initialState,
  reducers: {
    openModal: (state, action: { payload: string }) => {
      state.isOpen = true;
      state.targetKey = action.payload;
      state.selectedIds = [];
      state.dateFixed = getToday();
    },
    closeModal: (state) => {
      state.isOpen = false;
      state.targetKey = null;
      state.selectedIds = [];
      state.inspectorFix = '';
    },
    toggleId: (state, action: { payload: number }) => {
      const idx = state.selectedIds.indexOf(action.payload);
      if (idx === -1) {
        state.selectedIds.push(action.payload);
      } else {
        state.selectedIds.splice(idx, 1);
      }
    },
    selectAll: (state, action: { payload: number[] }) => {
      state.selectedIds = action.payload;
    },
    clearAll: (state) => {
      state.selectedIds = [];
    },
    setDateFixed: (state, action: { payload: string }) => {
      state.dateFixed = action.payload;
    },
    setInspectorFix: (state, action: { payload: string }) => {
      state.inspectorFix = action.payload;
    },
  },
});

export const fixDefectReducer = fixDefectSlice.reducer;
export const fixDefectActions = {
  ...fixDefectSlice.actions,
  useActions: fixDefectSlice.useActions,
};
