import type { UserRole } from './types';

/** Права действий. Совпадают с server/lib/permissions.js. */
export type Permission =
  | 'sheets.create' | 'sheets.edit' | 'sheets.merge' | 'sheets.delete'
  | 'defects.create' | 'defects.edit' | 'defects.fix' | 'defects.delete'
  | 'journal.conclusion' | 'export.excel';

export interface PermissionInfo {
  key: Permission;
  group: string;
  label: string;
}

export interface RolePermissionsData {
  permissions: PermissionInfo[];
  editableRoles: UserRole[];
  /** Права, которые можно дать наблюдателю РУП. */
  observerAllowed: Permission[];
  roles: Record<string, Permission[]>;
}

/**
 * Права по умолчанию — на случай, когда сервер недоступен (планшет без сети).
 * Онлайн права всегда берутся с сервера (их задаёт администратор).
 */
export const OFFLINE_DEFAULT_PERMISSIONS: Partial<Record<UserRole, Permission[]>> = {
  director_sbpl: ['sheets.create', 'sheets.edit', 'sheets.merge', 'defects.create', 'defects.edit', 'defects.fix', 'journal.conclusion', 'export.excel'],
  director: ['sheets.create', 'sheets.edit', 'sheets.merge', 'defects.create', 'defects.edit', 'defects.fix', 'journal.conclusion', 'export.excel'],
  engineer:      ['sheets.create', 'defects.create', 'defects.edit', 'export.excel'],
  engineer_sbpl: ['sheets.create', 'defects.create', 'defects.edit', 'export.excel'],
  master:        ['sheets.create', 'defects.create', 'defects.edit', 'export.excel'],
  electrician:   ['sheets.create', 'defects.create', 'defects.edit', 'export.excel'],
  observer: ['export.excel'],
};
