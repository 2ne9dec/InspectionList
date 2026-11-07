import type { UserRole } from './types';

/** Права действий. Совпадают с server/lib/permissions.js. */
export type Permission =
  | 'sheets.create' | 'sheets.edit' | 'sheets.merge' | 'sheets.delete'
  | 'defects.create' | 'defects.edit' | 'defects.fix' | 'defects.delete'
  | 'journal.conclusion' | 'export.excel' | 'lines.edit';

export interface PermissionInfo {
  key: Permission;
  group: string;
  label: string;
}

export interface RolePermissionsData {
  permissions: PermissionInfo[];
  editableRoles: UserRole[];
  roles: Record<string, Permission[]>;
}

/**
 * Права по умолчанию — на случай, когда сервер недоступен (планшет без сети).
 * Онлайн права всегда берутся с сервера (их задаёт администратор).
 */
export const OFFLINE_DEFAULT_PERMISSIONS: Partial<Record<UserRole, Permission[]>> = {
  director: ['sheets.create', 'sheets.edit', 'sheets.merge', 'sheets.delete', 'defects.create', 'defects.edit', 'defects.fix', 'defects.delete', 'journal.conclusion', 'export.excel'],
  engineer: ['sheets.create', 'defects.create', 'defects.edit', 'export.excel'],
  master:   ['sheets.create', 'defects.create', 'defects.edit', 'export.excel'],
  viewer:   ['sheets.create', 'defects.create', 'defects.edit', 'export.excel'],
};
