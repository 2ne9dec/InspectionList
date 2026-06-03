import { buildSlice } from '@/shared/lib/store/buildSlice';

export interface CreateSheetSchema {
  filialId: number | null;
  voltageId: number | null;
  lineId: number | null;
  createdBy: string;
  createdDate: string;
  isOpen: boolean;
  search: string;
  defectSearch: string;
}

const today = new Date().toISOString().split('T')[0];

const initialState: CreateSheetSchema = {
  filialId: null,
  voltageId: null,
  lineId: null,
  createdBy: '',
  createdDate: today,
  isOpen: false,
  search: '',
  defectSearch: '',
};

export const createSheetSlice = buildSlice({
  name: 'createSheet',
  initialState,
  reducers: {
    openModal: (state) => {
      state.isOpen = true;
    },
    closeModal: (state) => {
      state.isOpen = false;
      state.filialId = null;
      state.voltageId = null;
      state.lineId = null;
      state.createdBy = '';
      state.createdDate = today;
    },
    setFilialId: (state, action: { payload: number }) => {
      state.filialId = action.payload;
      state.voltageId = null;
      state.lineId = null;
    },
    setVoltageId: (state, action: { payload: number }) => {
      state.voltageId = action.payload;
      state.lineId = null;
    },
    setLineId: (state, action: { payload: number }) => {
      state.lineId = action.payload;
    },
    setCreatedBy: (state, action: { payload: string }) => {
      state.createdBy = action.payload;
    },
    setCreatedDate: (state, action: { payload: string }) => {
      state.createdDate = action.payload;
    },
    setSearch: (state, action: { payload: string }) => {
      state.search = action.payload;
    },
    setDefectSearch: (state, action: { payload: string }) => {
      state.defectSearch = action.payload;
    },
  },
});

export const createSheetReducer = createSheetSlice.reducer;
export const createSheetActions = {
  ...createSheetSlice.actions,
  useActions: createSheetSlice.useActions,
};
