import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SearchInput } from './SearchInput';

function ControlledSearchInput({ onChange }: { onChange: (value: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <SearchInput
      aria-label='Поиск по линиям'
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe('SearchInput', () => {
  it('рендерит поле поиска с плейсхолдером по умолчанию', () => {
    render(<SearchInput value='' onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText('Поиск...')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('передаёт введённое значение в onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ControlledSearchInput onChange={onChange} />);

    await user.type(screen.getByRole('searchbox', { name: 'Поиск по линиям' }), 'линия');

    expect(onChange).toHaveBeenLastCalledWith('линия');
  });

  it('позволяет переопределить плейсхолдер', () => {
    render(<SearchInput placeholder='Найти опору' value='' onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText('Найти опору')).toBeInTheDocument();
  });

  it('рендерит пользовательскую иконку', () => {
    render(
      <SearchInput
        icon={<span data-testid='custom-search-icon' />}
        value=''
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId('custom-search-icon')).toBeInTheDocument();
  });

  it('прокидывает label и hint в базовый Input', () => {
    render(
      <SearchInput
        label='Поиск'
        hint='По номеру опоры'
        value=''
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Поиск')).toHaveAccessibleDescription(
      'По номеру опоры',
    );
  });
});
