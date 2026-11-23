import { memo } from 'react';
import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';

/** Семантические примитивы таблиц. Стили задаются снаружи через className. */
export const Table = memo(({ children, ...rest }: TableHTMLAttributes<HTMLTableElement>) => (
  <table {...rest}>{children}</table>
));

export const TableHead = memo(({ children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead {...rest}>{children}</thead>
));

export const TableBody = memo(({ children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody {...rest}>{children}</tbody>
));

export const TableRow = memo(({ children, ...rest }: HTMLAttributes<HTMLTableRowElement>) => (
  <tr {...rest}>{children}</tr>
));

export const TableTh = memo(({ children, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th {...rest}>{children}</th>
));

export const TableTd = memo(({ children, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td {...rest}>{children}</td>
));

Table.displayName = 'Table';
TableHead.displayName = 'TableHead';
TableBody.displayName = 'TableBody';
TableRow.displayName = 'TableRow';
TableTh.displayName = 'TableTh';
TableTd.displayName = 'TableTd';
