export enum AppRoutes {
  ROOT         = 'root',
  LOGIN        = 'login',
  SHEETS       = 'sheets',
  MAIN         = 'main',
  SHEET_DETAIL = 'sheet_detail',
  JOURNAL      = 'journal',
  NOT_FOUND    = 'not_found',
}

export const getRouteLogin       = () => '/login';
export const getRouteSheets      = () => '/sheets';
export const getRouteMain        = () => '/sheets';
export const getRouteSheetDetail = (id: string) => `/sheet/${id}`;
export const getRouteJournal     = () => '/journal';
