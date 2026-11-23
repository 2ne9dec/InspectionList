import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectMenu } from './SelectMenu';
import type { SelectMenuOption } from './SelectMenu';

const options: SelectMenuOption[] = [
  { value: 'voltage', label: 'Напряжение' },
  { value: 'line', label: 'Линия' },
];

describe('SelectMenu', () => {
  it('показывает placeholder и раскрывает список по клику', async () => {
    const user = userEvent.setup();
    render(
      <SelectMenu
        options={options}
        value=''
        onChange={vi.fn()}
        placeholder='Выберите поле'
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Выберите поле' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('показывает подпись выбранного значения', () => {
    render(<SelectMenu options={options} value='line' onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Линия' })).toBeInTheDocument();
  });

  it('передаёт выбранное значение в onChange и закрывает список', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SelectMenu
        options={options}
        value=''
        onChange={onChange}
        placeholder='Выберите'
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Выберите' }));
    await user.click(screen.getByRole('button', { name: 'Напряжение' }));

    expect(onChange).toHaveBeenCalledWith('voltage');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('использует triggerLabel для кнопки, не меняя текст опции', async () => {
    const user = userEvent.setup();
    const longOptions: SelectMenuOption[] = [
      { value: 'a', label: 'Очень длинная подпись', triggerLabel: 'Коротко' },
    ];
    render(<SelectMenu options={longOptions} value='a' onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Коротко' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Коротко' }));

    expect(
      screen.getByRole('button', { name: 'Очень длинная подпись' }),
    ).toBeInTheDocument();
  });

  it('не раскрывается в состоянии disabled', async () => {
    const user = userEvent.setup();
    render(
      <SelectMenu
        options={options}
        value=''
        onChange={vi.fn()}
        placeholder='Выберите'
        disabled
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Выберите' });
    expect(trigger).toBeDisabled();

    await user.click(trigger);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('закрывается по Escape', async () => {
    const user = userEvent.setup();
    render(
      <SelectMenu
        options={options}
        value=''
        onChange={vi.fn()}
        placeholder='Выберите'
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Выберите' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('прокидывает id на кнопку-триггер', () => {
    render(
      <SelectMenu
        options={options}
        value=''
        onChange={vi.fn()}
        placeholder='Выберите'
        id='field-id'
      />,
    );

    expect(screen.getByRole('button', { name: 'Выберите' })).toHaveAttribute(
      'id',
      'field-id',
    );
  });
});
