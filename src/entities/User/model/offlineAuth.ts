import type { User } from './types';
import { STORAGE_KEYS } from '@/shared/const/storageKeys';

const STORAGE_KEY = STORAGE_KEYS.OFFLINE_AUTH;
const MAX_RECORDS = 10;
const PBKDF2_ITERATIONS = 60_000;

interface OfflineAuthRecord {
  username: string;
  filialId: number | null;
  user: User;
  /** JWT последнего входа — нужен для синхронизации, пока не истёк. */
  token?: string;
  salt: string;
  hash: string;
  savedAt: number;
}

export interface OfflineAuthResult {
  user: User;
  token?: string;
}

function readRecords(): OfflineAuthRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(records: OfflineAuthRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Нет доступа к localStorage — офлайн-вход просто не сохранится.
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return toHex(bytes);
}

/** Резервный хеш для WebView без Web Crypto. Не заменяет серверную проверку. */
function fallbackHash(value: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 16777619);
    h2 = Math.imul(h2 ^ code, 2246822519);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0')
    + (h2 >>> 0).toString(16).padStart(8, '0');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    try {
      const key = await subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits'],
      );
      const bits = await subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: fromHex(salt) as unknown as BufferSource,
          iterations: PBKDF2_ITERATIONS,
          hash: 'SHA-256',
        },
        key,
        256,
      );
      return toHex(new Uint8Array(bits));
    } catch {
      // Переходим на резервный вариант ниже.
    }
  }
  return fallbackHash(`${salt}:${password}`);
}

function safeUser(user: User): User {
  const { token: _token, ...rest } = user;
  return rest;
}

/** Сохраняет данные последнего успешного онлайн-входа для офлайн-входа. */
export async function saveOfflineCredentials(user: User, password: string, token?: string): Promise<void> {
  if (!password) return;

  const salt = randomSalt();
  const hash = await hashPassword(password, salt);
  const record: OfflineAuthRecord = {
    username: user.username.trim().toLowerCase(),
    filialId: user.filialId,
    user: safeUser(user),
    token,
    salt,
    hash,
    savedAt: Date.now(),
  };

  const records = readRecords()
    .filter((item) => !(item.username === record.username && item.filialId === record.filialId));
  writeRecords([record, ...records].slice(0, MAX_RECORDS));
}

/** Проверяет логин/пароль по сохранённым на устройстве данным. */
export async function authenticateOffline(
  username: string,
  password: string,
  filialId?: string,
): Promise<OfflineAuthResult | null> {
  const normalized = username.trim().toLowerCase();
  const targetFilial = filialId ? Number(filialId) : null;
  const candidates = readRecords().filter((item) =>
    item.username === normalized
    && (targetFilial == null || item.filialId === targetFilial));

  for (const candidate of candidates) {
    if (await hashPassword(password, candidate.salt) === candidate.hash) {
      return { user: candidate.user, token: candidate.token };
    }
  }
  return null;
}

export function hasOfflineCredentials(): boolean {
  return readRecords().length > 0;
}

/** Можно показать подсказку «офлайн-вход доступен для …». */
export function getOfflineUsernames(): string[] {
  return [...new Set(readRecords().map((item) => item.username))];
}
