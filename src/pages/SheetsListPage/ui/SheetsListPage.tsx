import { memo } from 'react';
import { useSelector } from 'react-redux';
import { DynamicModuleLoader, ReducersList } from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { SheetsList } from '@/widgets/SheetsList';
import { GlobalDefectSearch } from '@/widgets/GlobalDefectSearch';
import { CreateSheetModal, createSheetReducer, selectCreateSheetDefectSearch } from '@/features/CreateSheet';
import cls from './SheetsListPage.module.scss';

const reducers: ReducersList = {
  createSheet: createSheetReducer,
};

const SheetsListPage = () => {
  const defectSearch = useSelector(selectCreateSheetDefectSearch);

  return (
    <DynamicModuleLoader reducers={reducers} removeAfterUnmount={false}>
      <div className={cls.page}>
        {defectSearch.trim() ? (
          // Режим глобального поиска по дефектам
          <GlobalDefectSearch query={defectSearch} />
        ) : (
          // Обычный список листков
          <SheetsList />
        )}
        <CreateSheetModal />
      </div>
    </DynamicModuleLoader>
  );
};

export default memo(SheetsListPage);
