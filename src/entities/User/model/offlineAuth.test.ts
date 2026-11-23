import { beforeEach, describe, expect, it } from 'vitest';
import type { User } from './types';
import { authenticateOffline, hasOfflineCredentials, saveOfflineCredentials } from './offlineAuth';
import { STORAGE_KEYS } from '@/shared/const/storageKeys';

const user: User = {
  id: '1',
  username: 'ivanov',
  displayName: 'Иванов И.И.',
  filialId: 2,
  role: 'engineer',
  allowedVoltageIds: null,
  allowedLineIds: null,
};

describe('offlineAuth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('сохраняет вход и проверяет пароль без сети', async () => {
    await saveOfflineCredentials(user, 'Password1');

    await expect(authenticateOffline('ivanov', 'Password1')).resolves.toMatchObject({ user });
    await expect(authenticateOffline('IVANOV', 'Password1')).resolves.toMatchObject({ user });
    await expect(authenticateOffline('ivanov', 'wrong')).resolves.toBeNull();
  });

  it('не хранит пароль в открытом виде', async () => {
    await saveOfflineCredentials(user, 'Password1');

    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_AUTH) ?? '';
    expect(raw).not.toContain('Password1');
    expect(hasOfflineCredentials()).toBe(true);
  });

  it('учитывает филиал при входе', async () => {
    await saveOfflineCredentials(user, 'Password1');

    await expect(authenticateOffline('ivanov', 'Password1', '2')).resolves.toMatchObject({ user });
    await expect(authenticateOffline('ivanov', 'Password1', '3')).resolves.toBeNull();
  });

  it('не сохраняет пустой пароль', async () => {
    await saveOfflineCredentials(user, '');

    expect(hasOfflineCredentials()).toBe(false);
  });

  it('сохраняет токен для последующей синхронизации', async () => {
    await saveOfflineCredentials(user, 'Password1', 'jwt-token');

    await expect(authenticateOffline('ivanov', 'Password1')).resolves.toMatchObject({
      user,
      token: 'jwt-token',
    });
  });
});
