import { memo, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useGetFilialsQuery } from '@/entities/InspectionLine';
import { getUserIsAllFilials, getUserViewFilialId, userActions } from '@/entities/User';
import { rtkApi } from '@/shared/api/rtkApi';
import { useAppDispatch } from '@/shared/lib/hooks';
import { Select } from '@/shared/ui';
import cls from './FilialSwitcher.module.scss';

/**
 * Переключатель филиала для пользователя без филиала (наблюдатель РУП, главный администратор).
 * У каждого филиала своя база: выбранный филиал определяет, чьи листки и журнал показываются.
 */
export const FilialSwitcher = memo(() => {
  const dispatch     = useAppDispatch();
  const isAllFilials = useSelector(getUserIsAllFilials);
  const viewFilialId = useSelector(getUserViewFilialId);
  const { data: filials = [] } = useGetFilialsQuery(undefined, { skip: !isAllFilials });

  const select = useCallback((id: number) => {
    dispatch(userActions.setViewFilialId(id));
    // Данные другого филиала — из другой базы: перезапрашиваем листки, дефекты и справочники
    dispatch(rtkApi.util.invalidateTags(['Sheet', 'Sheets', 'Defect', 'Defects', 'DefectCount', 'References']));
  }, [dispatch]);

  // По умолчанию — первый филиал
  useEffect(() => {
    if (!isAllFilials || filials.length === 0) return;
    if (viewFilialId == null || !filials.some((f) => f.id === viewFilialId)) select(filials[0].id);
  }, [filials, isAllFilials, select, viewFilialId]);

  if (!isAllFilials || filials.length === 0) return null;

  return (
    <div className={cls.switcher}>
      <Select<number>
        size='s'
        aria-label='Филиал'
        options={filials.map((f) => ({ value: f.id, label: f.name }))}
        value={viewFilialId ?? ''}
        onChange={(v) => { if (v !== '' && v !== viewFilialId) select(Number(v)); }}
      />
    </div>
  );
});

FilialSwitcher.displayName = 'FilialSwitcher';
