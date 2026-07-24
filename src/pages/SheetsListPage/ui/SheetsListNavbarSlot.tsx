import { memo, useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  createSheetActions,
  selectCreateSheetSearch,
  selectCreateSheetSelectedDefectTypeIds,
} from '@/features/CreateSheet';
import {
  useGetDefectTypesQuery,
  useGetElementsQuery,
} from '@/entities/InspectionLine';
import { DefectTreePopup } from '@/features/AddDefect';
import { Button, HStack, Input } from '@/shared/ui';
import cls from './SheetsListNavbarSlot.module.scss';

export const SheetsListNavbarSlot = memo(() => {
  const search      = useSelector(selectCreateSheetSearch);
  const selectedIds = useSelector(selectCreateSheetSelectedDefectTypeIds);
  const { openModal, setSearch, setSelectedDefectTypeIds } = createSheetActions.useActions();

  const { data: elements    = [] } = useGetElementsQuery();
  const { data: defectTypes = [] } = useGetDefectTypesQuery();

  const [popupAnchor, setPopupAnchor] = useState<{ top: number; left: number } | null>(null);

  const handleOpenPopup = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupAnchor({ top: rect.bottom + 4, left: rect.left });
  }, []);

  const selectedIdSet = new Set(selectedIds);

  const btnLabel = (() => {
    if (selectedIds.length === 0) return 'Элемент / дефект…';
    if (selectedIds.length === 1) {
      const dt = defectTypes.find((d) => d.id === selectedIds[0]);
      return dt ? dt.name : 'Дефект: 1';
    }
    return `Дефекты: ${selectedIds.length}`;
  })();

  return (
    <HStack gap='2' align='center' className={cls.slot}>
      <div className={cls.search}>
        <Input
          id='sheet-search'
          name='sheetSearch'
          size='s'
          placeholder='Поиск по линии, филиалу...'
          value={search}
          onChange={setSearch}
        />
      </div>

      <div className={cls.defectSearch}>
        <button
          type='button'
          className={`${cls.defectFilterBtn}${selectedIds.length > 0 ? ' ' + cls.defectFilterBtnActive : ''}`}
          onClick={handleOpenPopup}
        >
          <span className={cls.defectFilterLabel}>{btnLabel}</span>
          {selectedIds.length > 0 ? (
            <span
              className={cls.defectFilterClear}
              title='Сбросить фильтр'
              role='button'
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); setSelectedDefectTypeIds([]); setPopupAnchor(null); }}
            >
              ×
            </span>
          ) : (
            <span className={cls.defectFilterChevron} aria-hidden>▾</span>
          )}
        </button>
        {popupAnchor && (
          <DefectTreePopup
            elements={elements}
            defectTypes={defectTypes}
            anchor={popupAnchor}
            onSelect={() => {}}
            onClose={() => setPopupAnchor(null)}
            multiSelect
            selectedIds={selectedIdSet}
            onSelectionChange={(ids) => setSelectedDefectTypeIds(Array.from(ids))}
          />
        )}
      </div>

      <Button variant='primary' size='s' onClick={() => openModal()}>
        + Новый листок
      </Button>
    </HStack>
  );
});

SheetsListNavbarSlot.displayName = 'SheetsListNavbarSlot';
