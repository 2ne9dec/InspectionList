import { render, screen } from '@testing-library/react';
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from './Table';

describe('Table primitives', () => {
  it('рендерит семантическую таблицу', () => {
    render(
      <Table>
        <TableHead>
          <TableRow>
            <TableTh>Название</TableTh>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableTd>Значение</TableTd>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Название' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Значение' })).toBeInTheDocument();
  });
});
