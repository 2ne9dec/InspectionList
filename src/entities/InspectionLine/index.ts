/**
 * entities/InspectionLine — справочные данные ЛЭП.
 *
 * Переименовано из entities/Reference.
 *
 * Состав:
 *   - Filial, Voltage, Line (основная ЛЭП-сущность)
 *   - Element, DefectType, Phase, DefectTreeNode (справочники дефектов)
 *   - RTK Query хуки для всех справочников
 */

// Типы
export type {
  Filial,
  Voltage,
  Line,
  Element,
  DefectType,
  Phase,
  DefectTreeNode,
} from './model/types';



// RTK Query хуки
export {
  useGetFilialsQuery,
  useGetVoltagesQuery,
  useGetLinesQuery,
  useGetElementsQuery,
  useGetDefectTypesQuery,
  useGetPhasesQuery,
  useGetPhaseElementIdsQuery,
  useGetGarlandElementIdsQuery,
  useGetVoltageGarlandCountQuery,
  useGetFilialVoltageFilterQuery,
  useUpdateLineMutation,
} from './api/referenceApi';
