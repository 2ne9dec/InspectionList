import { memo } from 'react';
import { useSelector } from 'react-redux';
import { createSheetActions, selectCreateSheetDefectSearch, selectCreateSheetSearch } from '@/features/CreateSheet';
import { Button, HStack, Input, SearchInput } from '@/shared/ui';
import cls from './SheetsListNavbarSlot.module.scss';

export const SheetsListNavbarSlot = memo(() => {
  const search = useSelector(selectCreateSheetSearch);
  const defectSearch = useSelector(selectCreateSheetDefectSearch);
  const { openModal, setSearch, setDefectSearch } = createSheetActions.useActions();

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
        <SearchInput
          id='defect-global-search'
          name='defectGlobalSearch'
          size='s'
          placeholder='Поиск по дефектам...'
          value={defectSearch}
          onChange={setDefectSearch}
        />
      </div>

      <Button variant='primary' size='s' onClick={() => openModal()}>
        + Новый листок
      </Button>
    </HStack>
  );
});

SheetsListNavbarSlot.displayName = 'SheetsListNavbarSlot';
