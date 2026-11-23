import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from './Tabs';
import type { TabItem } from './Tabs';

const tabs: TabItem[] = [
  { value: 'active', content: 'Активные' },
  { value: 'fixed', content: 'Устранённые' },
  { value: 'archive', content: 'Архив', disabled: true },
];

describe('Tabs', () => {
  it('рендерит вкладки с ролями tablist/tab', () => {
    render(<Tabs tabs={tabs} value='active' onTabClick={vi.fn()} />);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('помечает активную вкладку через aria-selected', () => {
    render(<Tabs tabs={tabs} value='fixed' onTabClick={vi.fn()} />);

    expect(screen.getByRole('tab', { name: 'Активные' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByRole('tab', { name: 'Устранённые' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('передаёт выбранную вкладку в onTabClick', async () => {
    const user = userEvent.setup();
    const onTabClick = vi.fn();

    render(<Tabs tabs={tabs} value='active' onTabClick={onTabClick} />);
    await user.click(screen.getByRole('tab', { name: 'Устранённые' }));

    expect(onTabClick).toHaveBeenCalledWith(tabs[1]);
  });

  it('не вызывает onTabClick для disabled-вкладки', async () => {
    const user = userEvent.setup();
    const onTabClick = vi.fn();

    render(<Tabs tabs={tabs} value='active' onTabClick={onTabClick} />);
    const archive = screen.getByRole('tab', { name: 'Архив' });

    expect(archive).toBeDisabled();
    await user.click(archive);

    expect(onTabClick).not.toHaveBeenCalled();
  });

  it('добавляет пользовательский className', () => {
    render(
      <Tabs
        tabs={tabs}
        value='active'
        onTabClick={vi.fn()}
        className='custom-tabs'
      />,
    );

    expect(screen.getByRole('tablist')).toHaveClass('custom-tabs');
  });
});
