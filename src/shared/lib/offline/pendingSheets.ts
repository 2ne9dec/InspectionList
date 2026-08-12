import { useEffect, useState } from 'react';
import type { CreateSheetParams } from '@/entities/InspectionSheet';

/**
 * Хранилище листков, созданных в офлайн-режиме (без сети).
 * Листки сохраняются в localStorage и синхронизируются с сервером
 * при появлении сети или нажатии кнопки «Обновить».
 */

const STORAGE_KEY = 'pending_sheets_v1';

/** Имя кастомного события — уведомляет подписчиков об изменении очереди. */
const CHANGED_EVENT = 'pendingSheetsChanged';

export interface PendingSheet extends CreateSheetParams {
  /** Отрицательный временной штамп — уникальный локальный ID. */
  localId: number;
  /** ISO-строка момента создания (для отображения). */
  createdAt: string;
}

/** Читает очередь из localStorage. */
export function getPendingSheets(): PendingSheet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingSheet[]) : [];
  } catch {
    return [];
  }
}

/** Добавляет листок в очередь, возвращает созданный объект. */
export function addPendingSheet(params: CreateSheetParams): PendingSheet {
  const sheet: PendingSheet = {
    ...params,
    localId:   -Date.now(),
    createdAt: new Date().toISOString(),
  };
  const list = getPendingSheets();
  list.push(sheet);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(CHANGED_EVENT));
  return sheet;
}

/** Удаляет листок из очереди после успешной синхронизации. */
export function removePendingSheet(localId: number): void {
  const list = getPendingSheets().filter((s) => s.localId !== localId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

/**
 * Хук: реактивно следит за очередью.
 * Обновляется при добавлении / удалении листков из любого места.
 */
export function usePendingSheets(): PendingSheet[] {
  const [sheets, setSheets] = useState<PendingSheet[]>(getPendingSheets);

  useEffect(() => {
    const handler = () => setSheets(getPendingSheets());
    window.addEventListener(CHANGED_EVENT, handler);
    return () => window.removeEventListener(CHANGED_EVENT, handler);
  }, []);

  return sheets;
}
