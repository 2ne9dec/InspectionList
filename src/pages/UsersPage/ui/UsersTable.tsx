import { memo } from 'react';
import type { UserProfile } from '@/entities/User';
import { getRoleLabel } from '@/entities/User';
import { Badge, KebabMenu, Loader, Table, TableBody, TableHead, TableRow, TableTd, TableTh } from '@/shared/ui';
import cls from './UsersPage.module.scss';

interface UsersTableProps {
  rows: UserProfile[];
  isLoading: boolean;
  /** Текущий пользователь — для отметки «(вы)» и запрета самоудаления. */
  me: Pick<UserProfile, 'id' | 'filialId'> | null | undefined;
  isDirector: boolean;
  directorRoles: ReadonlyArray<UserProfile['role']> | undefined;
  filialName: Map<number, string>;
  onEdit: (user: UserProfile) => void;
  onReset: (user: UserProfile) => void;
  onDelete: (user: UserProfile) => void;
}

/** Таблица пользователей админ-панели. */
export const UsersTable = memo(({
  rows,
  isLoading,
  me,
  isDirector,
  directorRoles,
  filialName,
  onEdit,
  onReset,
  onDelete,
}: UsersTableProps) => (
  <div className={cls.tableWrap}>
    {isLoading ? (
      <div className={cls.center}><Loader /></div>
    ) : (
      <Table className={cls.table}>
        <TableHead>
          <TableRow>
            <TableTh className={cls.rowNum}>№</TableTh>
            <TableTh>Логин</TableTh>
            <TableTh>ФИО</TableTh>
            <TableTh>Роль</TableTh>
            <TableTh>Филиал</TableTh>
            <TableTh>Пароль</TableTh>
            <TableTh />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableTd colSpan={7} className={cls.empty}>Пользователи не найдены</TableTd></TableRow>
          ) : rows.map((u, index) => {
            const isMe = String(u.id) === String(me?.id) && u.filialId === me?.filialId;
            return (
              // ID уникален только в пределах базы филиала: ключ — филиал + ID
              <TableRow key={`${u.filialId ?? 'rup'}:${u.id}`}>
                <TableTd className={cls.rowNum}>{index + 1}</TableTd>
                <TableTd className={cls.mono}>{u.username}{isMe && <span className={cls.me}> (вы)</span>}</TableTd>
                <TableTd>{u.displayName}</TableTd>
                <TableTd>
                  <Badge variant={u.role === 'observer' ? 'info' : u.role === 'admin' ? 'warning' : 'neutral'}>
                    {getRoleLabel(u.role, u.filialId)}
                  </Badge>
                </TableTd>
                <TableTd>{u.filialId == null ? (u.role === 'observer' ? 'РУП «Гомельэнерго»' : '—') : (filialName.get(u.filialId) ?? '—')}</TableTd>
                <TableTd>
                  {u.mustChangePassword
                    ? <Badge variant='warning'>временный</Badge>
                    : <span className={cls.muted}>задан</span>}
                </TableTd>
                <TableTd className={cls.actions}>
                  {isDirector ? (
                    directorRoles?.includes(u.role) && (
                      <KebabMenu
                        ariaLabel='Действия с пользователем'
                        items={[{ id: 'reset', label: 'Задать временный пароль', onClick: () => onReset(u) }]}
                      />
                    )
                  ) : (
                    <KebabMenu
                      ariaLabel='Действия с пользователем'
                      items={[
                        { id: 'edit',  label: 'Изменить', onClick: () => onEdit(u) },
                        { id: 'reset', label: 'Задать временный пароль', onClick: () => onReset(u) },
                        ...(!isMe ? [{ id: 'delete', label: 'Удалить', danger: true, onClick: () => onDelete(u) }] : []),
                      ]}
                    />
                  )}
                </TableTd>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    )}
  </div>
));

UsersTable.displayName = 'UsersTable';
