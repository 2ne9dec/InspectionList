import { memo } from 'react';
import { formatDate } from '@/shared/lib/helpers/formatDate';
import type { DefectRecordFull } from '@/entities/DefectRecord';
import { Button, Input, Textarea } from '@/shared/ui';
import { IconTasks, IconCheck, IconTrash, IconEdit } from '@/shared/ui/Icons';
import type { DefectSidebarState } from '../model/useDefectSidebar';
import cls from './DefectSidebar.module.scss';

interface DefectSidebarDetailsProps {
  defect: DefectRecordFull;
  state: DefectSidebarState;
  canEdit: boolean;
  canFix: boolean;
  canDelete: boolean;
  onEdit?: (defect: DefectRecordFull) => void;
  onFix?: (id: number) => void;
  onDelete?: (id: number) => void;
  onClose: () => void;
}

/** Поля и действия боковой панели дефекта. */
export const DefectSidebarDetails = memo(({
  defect,
  state,
  canEdit,
  canFix,
  canDelete,
  onEdit,
  onFix,
  onDelete,
  onClose,
}: DefectSidebarDetailsProps) => {
  const {
    editingInspector,
    inspectorDraft,
    setInspectorDraft,
    setEditingInspector,
    saving,
    editingNotes,
    notesDraft,
    setNotesDraft,
    setEditingNotes,
    currentNotes,
    savingNotes,
    handleEditInspector,
    handleSaveInspector,
    handleEditNotes,
    handleSaveNotes,
  } = state;

  return (
    <div className={cls.body}>
      <dl className={cls.fields}>
        <dt>Вид дефекта</dt>
        <dd>{defect.defectName}</dd>
        <dt>Элемент</dt>
        <dd>{defect.elementName}</dd>
        {defect.phaseName && (
          <>
            <dt>Фаза</dt>
            <dd>{defect.phaseName}</dd>
          </>
        )}
        {defect.insulatorCount != null && (
          <>
            <dt>Изоляторов</dt>
            <dd>{defect.insulatorCount} шт.</dd>
          </>
        )}
        <dt>Обнаружен</dt>
        <dd>
          {formatDate(defect.dateFound)}
          {' · '}
          {editingInspector ? (
            <span className={cls.inspectorEdit}>
              <Input
                size='s'
                value={inspectorDraft}
                onChange={setInspectorDraft}
                placeholder='Фамилия И.О.'
                autoFocus
              />
              <Button size='s' variant='primary' onClick={handleSaveInspector} loading={saving}>
                ОК
              </Button>
              <Button size='s' variant='ghost' onClick={() => setEditingInspector(false)}>
                ✕
              </Button>
            </span>
          ) : (
            <span className={cls.inspectorValue} title={defect.inspectorFind || undefined}>
              {defect.inspectorFind}
              {canEdit && <button type='button' className={cls.editInspectorBtn} onClick={handleEditInspector}>Изменить</button>}
            </span>
          )}
        </dd>
        <dt>Статус</dt>
        <dd>
          {defect.isFixed ? (
            <span className={cls.statusFixed}>
              <IconTasks size={13} /> Устранён {defect.dateFixed ? `(${formatDate(defect.dateFixed)})` : ''}
            </span>
          ) : (
            <span className={cls.statusActive}>Активный</span>
          )}
        </dd>
        <dt>Примечание</dt>
        <dd className={cls.noteField}>
          {editingNotes ? (
            <span className={cls.noteEditRow}>
              <Textarea
                className={cls.notesTextarea}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder='Необязательно…'
                rows={3}
                autoFocus
              />
              <span className={cls.noteEditActions}>
                <Button size='s' variant='primary' onClick={handleSaveNotes} loading={savingNotes}>ОК</Button>
                <Button size='s' variant='ghost' onClick={() => setEditingNotes(false)}>✕</Button>
              </span>
            </span>
          ) : (
            <span className={cls.noteValue}>
              {(currentNotes !== undefined ? currentNotes : defect.notes)
                ? <span>{currentNotes !== undefined ? currentNotes : defect.notes}</span>
                : <span className={cls.notePlaceholder}>Добавить…</span>}
              {canEdit && <button type='button' className={cls.editNoteBtn} onClick={handleEditNotes}>Изменить</button>}
            </span>
          )}
        </dd>
      </dl>

      {!defect.isFixed && (canFix || canDelete || (canEdit && onEdit)) && (
        <div className={cls.actions}>
          {canEdit && onEdit && (
          <Button variant='secondary' size='s' fullWidth
            leftIcon={<IconEdit size={13} />}
            onClick={() => onEdit(defect)}>
            Исправить дефект
          </Button>
          )}
          {canFix && (
          <Button variant='primary' size='s' fullWidth
            leftIcon={<IconCheck size={13} />}
            onClick={() => onFix?.(defect.id)}>
            Отметить устранённым
          </Button>
          )}
          {canDelete && (
          <Button
            variant='danger'
            size='s'
            fullWidth
            leftIcon={<IconTrash size={13} />}
            onClick={() => {
              onDelete?.(defect.id);
              onClose();
            }}
          >
            Удалить дефект
          </Button>
          )}
        </div>
      )}
    </div>
  );
});

DefectSidebarDetails.displayName = 'DefectSidebarDetails';
