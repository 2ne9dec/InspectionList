import { beforeEach, describe, expect, it } from 'vitest';
import { clearApiUrl, getApiUrl, setApiUrl } from './apiUrl';

describe('apiUrl', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('сохраняет адрес без завершающего слэша', () => {
    setApiUrl('http://192.168.1.10:8443/');

    expect(getApiUrl()).toBe('http://192.168.1.10:8443');
  });

  it('игнорирует localhost/capacitor-адреса', () => {
    setApiUrl('http://localhost:8443');

    // В dev-режиме без сохранённого адреса baseUrl пустой.
    expect(getApiUrl()).toBe('');
  });

  it('очищает сохранённый адрес', () => {
    setApiUrl('https://api.example.com');
    expect(getApiUrl()).toBe('https://api.example.com');

    clearApiUrl();
    expect(getApiUrl()).toBe('');
  });
});
