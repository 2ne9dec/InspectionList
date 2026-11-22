import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  useGetFilialsQuery,
  useGetFilialVoltageFilterQuery,
  useGetLinesQuery,
  useGetVoltagesQuery,
} from '@/entities/InspectionLine';
import { getUserEffectiveFilialId } from '@/entities/User';
import { getRouteSheetDetail } from '@/shared/const/router';
import { addPendingSheet } from '@/shared/lib/offline/pendingSheets';
import { SYNC_EVENT } from '@/shared/const/events';
import { createSheetActions } from './createSheetSlice';
import {
  selectCreateSheetCreatedBy,
  selectCreateSheetCreatedDate,
  selectCreateSheetIsOpen,
  selectCreateSheetLineId,
  selectCreateSheetVoltageId,
} from './selectors';

/** Состояние и submit окна «Новый листок осмотра». */
export function useCreateSheetForm() {
  const navigate = useNavigate();

  const isOpen = useSelector(selectCreateSheetIsOpen);
  const voltageId = useSelector(selectCreateSheetVoltageId);
  const lineId = useSelector(selectCreateSheetLineId);
  const createdBy = useSelector(selectCreateSheetCreatedBy);
  const createdDate = useSelector(selectCreateSheetCreatedDate);
  const effectiveFilialId = useSelector(getUserEffectiveFilialId);

  const { closeModal, setVoltageId, setLineId, setCreatedBy, setCreatedDate } =
    createSheetActions.useActions();

  const { data: filials = [] } = useGetFilialsQuery();
  const { data: voltages = [], isFetching: voltagesFetching } = useGetVoltagesQuery();
  const { data: lines = [] } = useGetLinesQuery();
  const { data: voltageFilter = {} } = useGetFilialVoltageFilterQuery();

  const filteredVoltages = useMemo(() => {
    // Без выбранного филиала не показываем напряжения всех филиалов сразу.
    if (!effectiveFilialId) return [];
    const allowed = voltageFilter[String(effectiveFilialId)];
    return voltages.filter((v) => v.filialId === effectiveFilialId && (!allowed || allowed.includes(v.id)));
  }, [voltages, effectiveFilialId, voltageFilter]);

  // При смене филиала сбрасываем выбранные напряжение и линию.
  const prevFilialRef = useRef(effectiveFilialId);
  useEffect(() => {
    if (prevFilialRef.current === effectiveFilialId) return;
    prevFilialRef.current = effectiveFilialId;
    setVoltageId(0);
    setLineId(0);
  }, [effectiveFilialId, setVoltageId, setLineId]);

  const filteredLines = useMemo(
    () => (voltageId ? lines.filter((l) => l.voltageId === voltageId) : []),
    [lines, voltageId],
  );

  const selectedLine = useMemo(
    () => lines.find((l) => l.id === lineId),
    [lines, lineId],
  );

  const isValid = !!effectiveFilialId && !!voltageId && !!lineId
    && createdBy.trim().length > 0 && !!createdDate;

  const voltageOptions = useMemo(
    () => [
      { value: '', label: '— выберите напряжение —' },
      ...filteredVoltages.map((v) => ({ value: String(v.id), label: v.name })),
    ],
    [filteredVoltages],
  );

  const lineOptions = useMemo(() => {
    // Разделяем на главные линии и отпайки (имя содержит " / ").
    const mains = filteredLines.filter((l) => !l.name.includes(' / '));
    const branches = filteredLines.filter((l) => l.name.includes(' / '));

    const result: { value: string; label: string; triggerLabel?: string; indent?: boolean }[] = [];

    for (const main of mains) {
      result.push({ value: String(main.id), label: main.name });
      const prefix = main.name + ' / ';
      for (const br of branches) {
        if (br.name.startsWith(prefix)) {
          result.push({
            value: String(br.id),
            label: br.name.slice(prefix.length),
            triggerLabel: br.name,
            indent: true,
          });
        }
      }
    }

    // Отпайки без родителя — добавляем в конец.
    for (const br of branches) {
      if (!result.some((o) => o.value === String(br.id))) {
        result.push({ value: String(br.id), label: br.name, indent: true });
      }
    }

    return result;
  }, [filteredLines]);

  const userFilialName = filials.find((f) => f.id === effectiveFilialId)?.name ?? '';

  const handleSubmit = useCallback(() => {
    const sheetFilialId = effectiveFilialId ?? selectedLine?.filialId ?? null;
    if (!isValid || !voltageId || !lineId || !sheetFilialId) return;

    // Мгновенно сохраняем локально — не ждём сервер.
    const pending = addPendingSheet({
      filialId: sheetFilialId,
      voltageId,
      lineId,
      createdBy: createdBy.trim(),
      createdDate,
    });
    closeModal();

    // Фоновая синхронизация — если есть сеть, листок сразу перейдёт на сервер.
    window.dispatchEvent(new Event(SYNC_EVENT));

    setTimeout(() => navigate(getRouteSheetDetail(String(pending.localId))), 50);
  }, [closeModal, createdBy, createdDate, effectiveFilialId, isValid, lineId, navigate, selectedLine, voltageId]);

  return {
    isOpen,
    voltageId,
    lineId,
    createdBy,
    createdDate,
    effectiveFilialId,
    userFilialName,
    voltagesFetching,
    voltagesCount: voltages.length,
    voltageOptions,
    lineOptions,
    selectedLine,
    isValid,
    handleSubmit,
    closeModal,
    setVoltageId,
    setLineId,
    setCreatedBy,
    setCreatedDate,
  };
}
