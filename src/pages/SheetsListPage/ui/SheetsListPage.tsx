import { memo } from 'react';
import { useSelector } from 'react-redux';
import { DynamicModuleLoader, ReducersList } from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { SheetsList } from '@/widgets/SheetsList';
import { GlobalDefectSearch } from '@/widgets/GlobalDefectSearch';
import { CreateSheetModal, createSheetReducer, selectCreateSheetSelectedDefectTypeIds } from '@/features/CreateSheet';
import cls from './SheetsListPage.module.scss';

const reducers: ReducersList = {
  createSheet: createSheetReducer,
};

const SheetsListPage = () => {
  const selectedDefectTypeIds = useSelector(selectCreateSheetSelectedDefectTypeIds);

  return (
    <DynamicModuleLoader reducers={reducers} removeAfterUnmount={false}>
      <div className={cls.page}>
        {selectedDefectTypeIds.length > 0 ? (
          // \u0420\u0435\u0436\u0438\u043c \u0444\u0438\u043b\u044c\u0442\u0440\u0430\u0446\u0438\u0438 \u043f\u043e \u0434\u0435\u0444\u0435\u043a\u0442\u0430\u043c
          <GlobalDefectSearch defectTypeIds={selectedDefectTypeIds} />
        ) : (
          // \u041e\u0431\u044b\u0447\u043d\u044b\u0439 \u0441\u043f\u0438\u0441\u043e\u043a \u043b\u0438\u0441\u0442\u043a\u043e\u0432
          <SheetsList />
        )}
        <CreateSheetModal />
      </div>
    </DynamicModuleLoader>
  );
};

export default memo(SheetsListPage);
