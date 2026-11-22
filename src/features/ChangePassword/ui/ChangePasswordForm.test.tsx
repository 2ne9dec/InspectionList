import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangePasswordForm } from './ChangePasswordForm';

const { dispatchMock, changePasswordMock, saveOfflineMock, toastSuccessMock } = vi.hoisted(() => ({
  dispatchMock: vi.fn(),
  changePasswordMock: vi.fn(),
  saveOfflineMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('@/shared/lib/hooks', () => ({
  useAppDispatch: () => dispatchMock,
}));

vi.mock('react-redux', () => ({
  useSelector: () => ({ username: 'admin' }),
}));

vi.mock('@/entities/User', () => ({
  getUserAuthData: () => ({ username: 'admin' }),
  saveOfflineCredentials: saveOfflineMock,
  useChangePasswordMutation: () => [changePasswordMock, { isLoading: false }],
  userActions: {
    setAuthData: (payload: unknown) => ({ type: 'user/setAuthData', payload }),
  },
}));

vi.mock('@/shared/lib/toast', () => ({
  toast: { success: toastSuccessMock, error: vi.fn() },
}));

function fill(oldPass: string, newPass: string, repeat = newPass) {
  fireEvent.change(screen.getByLabelText(/^текущий пароль$/i), { target: { value: oldPass } });
  fireEvent.change(screen.getByLabelText(/^новый пароль$/i), { target: { value: newPass } });
  fireEvent.change(screen.getByLabelText(/^повторите новый пароль$/i), { target: { value: repeat } });
}

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    dispatchMock.mockReset();
    changePasswordMock.mockReset();
    saveOfflineMock.mockReset().mockResolvedValue(undefined);
    toastSuccessMock.mockReset();
  });

  it('требует текущий и новый пароль', () => {
    render(<ChangePasswordForm />);

    fireEvent.click(screen.getByRole('button', { name: /сменить пароль/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/заполните все поля/i);
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('проверяет длину и состав нового пароля', () => {
    render(<ChangePasswordForm />);

    fill('oldpass1', 'short');
    fireEvent.click(screen.getByRole('button', { name: /сменить пароль/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/не менее 8 символов/i);
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('требует совпадения повторного пароля', () => {
    render(<ChangePasswordForm />);

    fill('oldpass1', 'newpass1', 'newpass2');
    fireEvent.click(screen.getByRole('button', { name: /сменить пароль/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/не совпадают/i);
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('меняет пароль, сохраняет сессию и вызывает onDone', async () => {
    const onDone = vi.fn();
    changePasswordMock.mockReturnValue({
      unwrap: () => Promise.resolve({ username: 'admin', token: 'new-token' }),
    });
    render(<ChangePasswordForm onDone={onDone} />);

    fill('oldpass1', 'newpass1');
    fireEvent.click(screen.getByRole('button', { name: /сменить пароль/i }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(changePasswordMock).toHaveBeenCalledWith({ oldPass: 'oldpass1', newPass: 'newpass1' });
    expect(dispatchMock).toHaveBeenCalledWith({
      type: 'user/setAuthData',
      payload: { username: 'admin' },
    });
    expect(saveOfflineMock).toHaveBeenCalledWith({ username: 'admin' }, 'newpass1', 'new-token');
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it('показывает ошибку сервера', async () => {
    changePasswordMock.mockReturnValue({
      unwrap: () => Promise.reject({ data: { error: 'Неверный текущий пароль' } }),
    });
    render(<ChangePasswordForm />);

    fill('oldpass1', 'newpass1');
    fireEvent.click(screen.getByRole('button', { name: /сменить пароль/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Неверный текущий пароль'));
  });
});
