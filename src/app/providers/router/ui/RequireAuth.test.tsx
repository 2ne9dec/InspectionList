import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequireAuth } from './RequireAuth';

const { useSelectorMock } = vi.hoisted(() => ({
  useSelectorMock: vi.fn(),
}));

vi.mock('react-redux', () => ({
  useSelector: (selector: unknown) => useSelectorMock(selector),
}));

function renderRoute() {
  render(
    <MemoryRouter initialEntries={['/private']}>
      <Routes>
        <Route
          path='/private'
          element={(
            <RequireAuth>
              <div>Секретная страница</div>
            </RequireAuth>
          )}
        />
        <Route path='/login' element={<div>Страница входа</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  beforeEach(() => {
    useSelectorMock.mockReset();
  });

  it('пускает авторизованного пользователя', () => {
    useSelectorMock.mockReturnValue({ id: '1', username: 'admin' });
    renderRoute();

    expect(screen.getByText('Секретная страница')).toBeInTheDocument();
  });

  it('перенаправляет на вход без авторизации', () => {
    useSelectorMock.mockReturnValue(undefined);
    renderRoute();

    expect(screen.getByText('Страница входа')).toBeInTheDocument();
    expect(screen.queryByText('Секретная страница')).not.toBeInTheDocument();
  });
});
