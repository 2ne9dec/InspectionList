import { buildSlice } from '@/shared/lib/store/buildSlice';

export interface CreateSheetSchema {
  voltageId: number | null;
  lineId: number | null;
  createdBy: string;
  createdDate: string;
  isOpen: boolean;
  search: string;
  selectedDefectTypeIds: number[];
}

const getToday = () => new Date().toISOString().split('T')[0];

const initialState: CreateSheetSchema = {
  voltageId: null,
  lineId: null,
  createdBy: '',
  createdDate: getToday(),
  isOpen: false,
  search: '',
  selectedDefectTypeIds: [],
};

export const createSheetSlice = buildSlice({
  name: 'createSheet',
  initialState,
  reducers: {
    openModal: (state) => {
      state.isOpen = true;
      state.createdDate = getToday();
    },
    closeModal: (state) => {
      state.isOpen = false;
      state.voltageId = null;
      state.lineId = null;
      state.createdBy = '';
      state.createdDate = getToday();
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
    setSelectedDefectTypeIds: (state, action: { payload: number[] }) => {
      state.selectedDefectTypeIds = action.payload;
    },
  },
});

export const createSheetReducer = createSheetSlice.reducer;
export const createSheetActions = createSheetSlice;
