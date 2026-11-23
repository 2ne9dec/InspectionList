import { memo } from 'react';
import type { DefectRecordFull } from '@/entities/DefectRecord';
import { Button } from '@/shared/ui';
import { IconClose } from '@/shared/ui/Icons';
import { useDefectSidebar } from '../model/useDefectSidebar';
import { DefectSidebarDetails } from './DefectSidebarDetails';
import cls from './DefectSidebar.module.scss';

interface DefectSidebarProps {
  defect: DefectRecordFull | null;
  onClose: () => void;
  onFix?: (id: number) => void;
  onDelete?: (id: number) => void;
  /** Исправить ошибочно внесённый дефект (место, вид, фаза и т.д.) */
  onEdit?: (defect: DefectRecordFull) => void;
  /** Вызывается после успешного сохранения inspectorFind — чтобы родитель обновил состояние */
  onSaveInspector?: (id: number, value: string) => void;
  /** Права роли: редактирование, устранение, удаление */
  canEdit?: boolean;
  canFix?: boolean;
  canDelete?: boolean;
}

export const DefectSidebar = memo(({
  defect,
  onClose,
  onFix,
  onDelete,
  onEdit,
  onSaveInspector,
  canEdit = true,
  canFix = true,
  canDelete = true,
}: DefectSidebarProps) => {
  const state = useDefectSidebar({ defect, onClose, onSaveInspector });

  return (
    <aside
      ref={state.sidebarRef}
      className={[cls.sidebar, state.isOpen ? cls.sidebarOpen : ''].join(' ')}
      aria-label='Детали дефекта'
    >
      {defect && (
        <>
          <div className={cls.header}>
            <div>
              <div className={cls.subtitle}>
                {defect.spanRange ? `Пролёты ${defect.spanRange}` : `Опора ${defect.poleNumber}`}
                {' · '}
                {defect.elementName}
              </div>
            </div>
            <Button variant='ghost' size='s' square onClick={onClose}
              aria-label='Закрыть'>
              <IconClose size={15} />
            </Button>
          </div>

          <DefectSidebarDetails
            defect={defect}
            state={state}
            canEdit={canEdit}
            canFix={canFix}
            canDelete={canDelete}
            onEdit={onEdit}
            onFix={onFix}
            onDelete={onDelete}
            onClose={onClose}
          />
        </>
      )}
    </aside>
  );
});

DefectSidebar.displayName = 'DefectSidebar';
