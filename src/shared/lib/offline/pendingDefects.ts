import { useEffect, useState } from 'react';

/**
 * Хранилище дефектов, созданных в офлайн-режиме.
 * Привязаны к localSheetId (отрицательный ID офлайн-листка).
 * Синхронизируются с сервером после успешной отправки родительского листка.
 *
 * Тип параметров локальный (не импортируем entities), чтобы shared не зависел
 * от верхних слоёв FSD. Структурно совместим с CreateDefectParams.
 */

const STORAGE_KEY = 'pending_defects_v1';
const CHANGED_EVENT = 'pendingDefectsChanged';

// Счётчик для гарантированно уникальных localId (Date.now() может совпасть в цикле)
let _idSeq = 0;

export interface PendingDefectParams {
  poleNumber: number;
  defectId: number;
  phaseId: number | null;
  dateFound: string;
  inspectorFind: string;
  notes?: string | null;
  insulatorCount?: number | null;
  spanRange?: string | null;
  garlandNumber?: number | null;
  customName?: string | null;
}

export interface PendingDefect extends PendingDefectParams {
  /** Уникальный локальный ID дефекта (отрицательный timestamp). */
  localId: number;
  /** localId родительского офлайн-листка. */
  localSheetId: number;
  /** ISO-строка момента создания. */
  createdAt: string;
}

/** Читает все дефекты из localStorage. */
function getAllPendingDefects(): PendingDefect[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingDefect[]) : [];
  } catch {
    return [];
  }
}

/** Читает дефекты для конкретного офлайн-листка. */
export function getPendingDefects(localSheetId: number): PendingDefect[] {
  return getAllPendingDefects().filter((d) => d.localSheetId === localSheetId);
}

/** Добавляет дефект в очередь. */
export function addPendingDefect(
  params: PendingDefectParams & { localSheetId: number },
): PendingDefect {
  const defect: PendingDefect = {
    ...params,
    localId:   -(Date.now() * 1000 + (_idSeq++ % 1000)),
    createdAt: new Date().toISOString(),
  };
  const all = getAllPendingDefects();
  all.push(defect);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  window.dispatchEvent(new Event(CHANGED_EVENT));
  return defect;
}

/** Удаляет один дефект из очереди (после успешной синхронизации). */
export function removePendingDefect(localId: number): void {
  const all = getAllPendingDefects().filter((d) => d.localId !== localId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

/** Удаляет все дефекты листка (после успешной синхронизации листка). */
export function removePendingDefectsForSheet(localSheetId: number): void {
  const all = getAllPendingDefects().filter((d) => d.localSheetId !== localSheetId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

/**
 * Хук: реактивно следит за дефектами конкретного офлайн-листка.
 */
export function usePendingDefects(localSheetId: number): PendingDefect[] {
  const [defects, setDefects] = useState<PendingDefect[]>(() => getPendingDefects(localSheetId));

  useEffect(() => {
    const handler = () => setDefects(getPendingDefects(localSheetId));
    window.addEventListener(CHANGED_EVENT, handler);
    return () => window.removeEventListener(CHANGED_EVENT, handler);
  }, [localSheetId]);

  return defects;
}
