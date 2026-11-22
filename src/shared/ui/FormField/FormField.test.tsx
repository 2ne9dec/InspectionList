import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from './FormField';

describe('FormField', () => {
  it('связывает label с контролом по htmlFor', () => {
    render(
      <FormField label='Имя' htmlFor='inspector-name'>
        <input id='inspector-name' />
      </FormField>,
    );

    expect(screen.getByLabelText('Имя')).toHaveAttribute('id', 'inspector-name');
  });

  it('показывает метку обязательного поля, не ломая доступное имя', () => {
    render(
      <FormField label='Имя' htmlFor='inspector-name' required>
        <input id='inspector-name' />
      </FormField>,
    );

    expect(screen.getByRole('textbox', { name: 'Имя' })).toBeInTheDocument();
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });

  it('показывает пометку необязательного поля', () => {
    render(
      <FormField label='Комментарий' htmlFor='comment' optional>
        <input id='comment' />
      </FormField>,
    );

    expect(screen.getByText('(необяз.)')).toBeInTheDocument();
  });

  it('показывает текст ошибки', () => {
    render(
      <FormField label='Имя' htmlFor='name' error='Заполните поле'>
        <input id='name' />
      </FormField>,
    );

    expect(screen.getByText('Заполните поле')).toBeInTheDocument();
  });

  it('показывает подсказку, если ошибки нет', () => {
    render(
      <FormField label='Имя' htmlFor='name' hint='Фамилия и инициалы'>
        <input id='name' />
      </FormField>,
    );

    expect(screen.getByText('Фамилия и инициалы')).toBeInTheDocument();
  });

  it('отдаёт приоритет ошибке над подсказкой', () => {
    render(
      <FormField
        label='Имя'
        htmlFor='name'
        error='Заполните поле'
        hint='Фамилия и инициалы'
      >
        <input id='name' />
      </FormField>,
    );

    expect(screen.getByText('Заполните поле')).toBeInTheDocument();
    expect(screen.queryByText('Фамилия и инициалы')).not.toBeInTheDocument();
  });

  it('не рендерит сообщение без error и hint', () => {
    render(
      <FormField label='Имя' htmlFor='name'>
        <input id='name' />
      </FormField>,
    );

    expect(screen.queryByText('Заполните поле')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Имя')).toBeInTheDocument();
  });

  it('рендерит произвольный контрол внутри', () => {
    render(
      <FormField label='Примечание' htmlFor='note'>
        <textarea id='note' />
      </FormField>,
    );

    expect(screen.getByRole('textbox', { name: 'Примечание' })).toBeInTheDocument();
  });

  it('добавляет пользовательский className', () => {
    render(
      <FormField label='Имя' htmlFor='name' className='custom-field'>
        <input id='name' />
      </FormField>,
    );

    expect(screen.getByLabelText('Имя').parentElement).toHaveClass('custom-field');
  });
});
