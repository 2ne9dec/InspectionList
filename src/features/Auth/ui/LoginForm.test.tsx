import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from './LoginForm';

const { dispatchMock, navigateMock } = vi.hoisted(() => ({
  dispatchMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('@/shared/lib/hooks', () => ({
  useAppDispatch: () => dispatchMock,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('../model/loginThunk', () => ({
  loginByUsername: (params: unknown) => ({ type: 'auth/login', payload: params }),
}));

function fillCredentials(username = 'admin', password = 'secret') {
  fireEvent.change(screen.getByPlaceholderText(/логин/i), { target: { value: username } });
  fireEvent.change(screen.getByPlaceholderText(/пароль/i), { target: { value: password } });
}

describe('LoginForm', () => {
  beforeEach(() => {
    dispatchMock.mockReset();
    navigateMock.mockReset();
  });

  it('показывает поля входа и кнопку', () => {
    render(<LoginForm />);

    expect(screen.getByPlaceholderText(/логин/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/пароль/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument();
  });

  it('не отправляет пустую форму', () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: /войти/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/логин и пароль/i);
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('отправляет логин и переходит к листкам', async () => {
    dispatchMock.mockReturnValue({ unwrap: () => Promise.resolve({ id: '1' }) });
    render(<LoginForm />);

    fillCredentials('  admin  ', 'secret');
    fireEvent.click(screen.getByRole('button', { name: /войти/i }));

    await waitFor(() => expect(dispatchMock).toHaveBeenCalledTimes(1));
    expect(dispatchMock).toHaveBeenCalledWith({
      type: 'auth/login',
      payload: { username: 'admin', password: 'secret', filialId: undefined },
    });
    expect(navigateMock).toHaveBeenCalledWith('/sheets', { replace: true });
  });

  it('передаёт выбранный филиал', async () => {
    dispatchMock.mockReturnValue({ unwrap: () => Promise.resolve({ id: '2' }) });
    render(<LoginForm />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    fillCredentials('zhlobin', 'secret');
    fireEvent.click(screen.getByRole('button', { name: /войти/i }));

    await waitFor(() => expect(dispatchMock).toHaveBeenCalledTimes(1));
    expect(dispatchMock).toHaveBeenCalledWith({
      type: 'auth/login',
      payload: { username: 'zhlobin', password: 'secret', filialId: '2' },
    });
  });

  it('показывает ошибку входа', async () => {
    dispatchMock.mockReturnValue({
      unwrap: () => Promise.reject('Неверный логин или пароль'),
    });
    render(<LoginForm />);

    fillCredentials('admin', 'wrong');
    fireEvent.click(screen.getByRole('button', { name: /войти/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Неверный логин или пароль'));
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('отправляет форму по Enter в поле пароля', async () => {
    dispatchMock.mockReturnValue({ unwrap: () => Promise.resolve({ id: '1' }) });
    render(<LoginForm />);

    fillCredentials('admin', 'secret');
    fireEvent.keyDown(screen.getByPlaceholderText(/пароль/i), { key: 'Enter' });

    await waitFor(() => expect(dispatchMock).toHaveBeenCalledTimes(1));
  });
});
